'use client';
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { Vehicle, CarType, PricingSheet } from "@/lib/types";
import { titleFromId } from "@/lib/pricing";
import { adminStore } from "@/lib/admin-store";
import { withTimeout, toSafeDate } from "@/lib/api-utils";
import { FilterDropdown, FilterConfig, ActiveFilters } from "@/components/ui/FilterDropdown";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { Car, Users, Settings2, Trash2, Edit2, AlertCircle } from "lucide-react";

export default function VehicleManagementPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [carTypes, setCarTypes] = useState<CarType[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'cloud' | 'local'>('cloud');

  // Filters
  const [search, setSearch] = useState('');
  const [filterAvailable, setFilterAvailable] = useState<'all' | 'available' | 'unavailable'>('all');
  const [availFrom, setAvailFrom] = useState('');
  const [availTo, setAvailTo] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [newVehicle, setNewVehicle] = useState({
    name: '',
    car_type_id: '',
    year: new Date().getFullYear().toString(),
    seats: 5,
    transmission: 'Automatic',
    image_url: '',
    available: true
  });
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    
    if (db) {
      try {
        const [vehsSnap, carTypesSnap, sheetsSnap, bookingsSnap] = await withTimeout(
          Promise.all([
            getDocs(collection(db, 'vehicles')),
            getDocs(collection(db, 'car_types')),
            getDocs(collection(db, 'pricing_sheets')),
            getDocs(query(collection(db, 'bookings'), where('status', 'in', ['approved', 'active'])))
          ]), 
          5000
        );
        
        const carTypesData = carTypesSnap.docs.map(d => ({ id: d.id, ...d.data() } as CarType));
        const pricingSheets = sheetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PricingSheet));

        // Prefer pricing sheet IDs as the canonical car type list (keeps vehicles priceable)
        const sheetTypeRows: CarType[] = pricingSheets.map(s => ({
          id: s.id,
          name: titleFromId(s.id),
          driver_only: false
        }));

        const mergedCarTypes = sheetTypeRows.length > 0 ? sheetTypeRows : carTypesData;

        if (carTypesData.length === 0) {
           carTypesData.push(
              { id: 'economy', name: 'Economy', driver_only: false },
              { id: 'luxury', name: 'Luxury', driver_only: false },
              { id: 'suv', name: 'SUV', driver_only: false },
              { id: 'van', name: 'Van', driver_only: false }
           );
        }
        const carTypesMap = Object.fromEntries(mergedCarTypes.map(t => [t.id, t]));

        let vehiclesData = vehsSnap.docs.map(d => {
            const vehicleData = d.data();
            const carTypeId = vehicleData.car_type_id;
            let carType = carTypesMap[carTypeId];
            
            // If not found in car_types collection, extract name from car_type_id
            if (!carType && carTypeId) {
              const typeName = carTypeId.replace('type_', '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              carType = { id: carTypeId, name: typeName, driver_only: false };
            }
            
            return {
              id: d.id,
              ...vehicleData,
              car_type: carType || { name: 'Standard' }
            };
          });
        
        vehiclesData.sort((a: any, b: any) => {
           const timeA = toSafeDate(a.created_at)?.getTime() ?? 0;
           const timeB = toSafeDate(b.created_at)?.getTime() ?? 0;
           return timeB - timeA;
        });

        setVehicles(vehiclesData);
        setCarTypes(mergedCarTypes);
        setBookings(bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setMode('cloud');
        
        if (mergedCarTypes.length > 0 && !newVehicle.car_type_id) {
          setNewVehicle(prev => ({ ...prev, car_type_id: mergedCarTypes[0].id }));
        }
        setLoading(false);
        return;
      } catch (err: any) {
        console.warn("Firestore fetch failed or timed out, falling back to Local Mode:", err);
      }
    }

    // Fallback to Local Mode
    const localVehicles = adminStore.getVehicles();
    const transformedVehicles: any[] = localVehicles.map(v => ({
      id: v.id,
      name: v.name || `${v.make} ${v.model}`,
      car_type_id: v.category,
      year: v.year.toString(),
      seats: v.seats || 5,
      transmission: v.transmission || 'Automatic',
      image_url: v.image || '',
      available: v.available ?? true,
      car_type: { id: v.category, name: v.category.toUpperCase(), driver_only: false }
    }));

    setVehicles(transformedVehicles);
    setCarTypes([
      { id: 'economy', name: 'Economy', driver_only: false },
      { id: 'luxury', name: 'Luxury', driver_only: false },
      { id: 'suv', name: 'SUV', driver_only: false },
      { id: 'van', name: 'Van', driver_only: false }
    ]);
    setMode('local');
    setBookings([]);
    setLoading(false);
  }

  const vehiclesFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tf = activeFilters.carType as string || 'all';
    const availFilter = activeFilters.availability as string || filterAvailable;
    const from = availFrom ? new Date(`${availFrom}T00:00:00`) : null;
    const to = availTo ? new Date(`${availTo}T23:59:59`) : null;

    const bookingByVehicle: Record<string, { start: Date; end: Date }[]> = {};
    if (from && to && bookings.length > 0) {
      for (const b of bookings) {
        const carId = String(b.car_id ?? '');
        if (!carId) continue;
        const s = toSafeDate(b.start_date);
        const e = toSafeDate(b.end_date);
        if (!s || !e) continue;
        (bookingByVehicle[carId] ||= []).push({ start: s, end: e });
      }
    }

    const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && aEnd > bStart;

    return vehicles.filter((v) => {
      if (availFilter !== 'all') {
        const want = availFilter === 'available';
        if (Boolean(v.available) !== want) return false;
      }

      if (tf !== 'all' && String(v.car_type_id) !== tf) return false;

      if (q) {
        const name = String(v.name ?? '').toLowerCase();
        const type = String(v.car_type?.name ?? '').toLowerCase();
        const typeId = String(v.car_type_id ?? '').toLowerCase();
        if (![name, type, typeId].some((x) => x.includes(q))) return false;
      }

      // Availability in date range (based on bookings overlap)
      if (from && to) {
        const hasConflict = (bookingByVehicle[String(v.id)] || []).some((r) => overlaps(from, to, r.start, r.end));
        // If there is a conflict, vehicle isn't available for that window
        if (hasConflict) return false;
      }

      return true;
    });
  }, [vehicles, bookings, search, activeFilters, filterAvailable, availFrom, availTo]);

  const uniqueTypeIds = useMemo(() => {
    const set = new Set<string>();
    for (const v of vehicles) {
      if (v?.car_type_id) set.add(String(v.car_type_id));
    }
    return Array.from(set).sort();
  }, [vehicles]);

  const filterConfigs: FilterConfig[] = [
    {
      key: 'carType',
      label: 'Car Type',
      options: uniqueTypeIds.map(id => ({ value: id, label: id }))
    },
    {
      key: 'availability',
      label: 'Availability',
      options: [
        { value: 'all', label: 'All' },
        { value: 'available', label: 'Available' },
        { value: 'unavailable', label: 'Unavailable' }
      ]
    }
  ];

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'cloud' && db) {
      try {
        if (editingVehicleId) {
            await updateDoc(doc(db, 'vehicles', editingVehicleId), { ...newVehicle });
        } else {
            await addDoc(collection(db, 'vehicles'), {
                ...newVehicle,
                created_at: serverTimestamp()
            });
        }
        fetchData();
        setShowCreateForm(false);
        setEditingVehicleId(null);
        setNewVehicle({
            name: '',
            car_type_id: carTypes[0]?.id || '',
            year: new Date().getFullYear().toString(),
            seats: 5,
            transmission: 'Automatic',
            image_url: '',
            available: true
        });
      } catch (error) {
        console.error("Cloud insert failed:", error);
        alert("Failed to save to cloud center.");
      }
    } else {
      adminStore.createVehicle({
        name: newVehicle.name,
        make: newVehicle.name.split(' ')[0],
        model: newVehicle.name.split(' ').slice(1).join(' '),
        year: parseInt(newVehicle.year),
        licensePlate: 'TBD-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        vin: '',
        color: 'White',
        category: 'economy' as any,
        status: 'available',
        dailyRate: 0,
        mileage: 0,
        seats: newVehicle.seats,
        transmission: newVehicle.transmission,
        image: newVehicle.image_url,
        lastMaintenance: '',
      });
      fetchData();
      setShowCreateForm(false);
    }
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    if (mode === 'cloud' && db) {
      try {
        const vehicleRef = doc(db, 'vehicles', id);
        await updateDoc(vehicleRef, { status: !current ? 'maintenance' : 'available' });
        fetchData();
      } catch (err) {
          console.error("Error toggling availability:", err);
      }
    } else {
      adminStore.updateVehicle(id, { status: !current ? 'maintenance' : 'available' });
      fetchData();
    }
  };

  const deleteVehicleDoc = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    if (mode === 'cloud' && db) {
      try {
        await deleteDoc(doc(db, 'vehicles', id));
        fetchData();
      } catch (err) {
          console.error("Error deleting vehicle:", err);
      }
    } else {
      adminStore.deleteVehicle(id);
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-slate-500 font-medium animate-pulse text-sm">Attempting Cloud Connection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Management"
        subtitle="Add and manage your car inventory."
        action={
          <div className="flex items-center gap-3">
             <button
              onClick={fetchData}
              className="p-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl transition-all border border-[var(--border-subtle)]"
              title="Refresh Connection"
             >
                🔄
             </button>
             <input
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Search vehicle, type..."
               className="px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] font-bold text-sm text-[var(--text-primary)] outline-none w-[260px] focus:border-[var(--color-primary-500)]"
             />
             <FilterDropdown
               filters={filterConfigs}
               onApply={(filters) => setActiveFilters(filters)}
             />
             <Button
               onClick={() => {
                   setEditingVehicleId(null);
                   setNewVehicle({
                       name: '',
                       car_type_id: carTypes[0]?.id || '',
                       year: new Date().getFullYear().toString(),
                       seats: 5,
                       transmission: 'Automatic',
                       image_url: '',
                       available: true
                   });
                   setShowCreateForm(true);
               }}
               className="bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white shadow-lg"
             >
               Add New Vehicle
             </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <Card className="lg:col-span-2 flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Available between (no booking overlap)</p>
          <div className="flex gap-2">
            <input type="date" value={availFrom} onChange={(e) => setAvailFrom(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] font-bold text-xs text-[var(--text-primary)] outline-none" />
            <input type="date" value={availTo} onChange={(e) => setAvailTo(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] font-bold text-xs text-[var(--text-primary)] outline-none" />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-semibold">Uses bookings with status: approved/active.</p>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Results</p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{vehiclesFiltered.length}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setActiveFilters({});
              setFilterAvailable('all');
              setAvailFrom('');
              setAvailTo('');
            }}
            className="border-[var(--border-subtle)]"
          >
            Reset
          </Button>
        </Card>
      </div>

      {mode === 'local' && (
        <Card className="bg-[var(--color-warning-light)] border-[var(--color-warning)]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <AlertCircle className="w-5 h-5 text-[var(--color-warning)]" />
             <div>
                <p className="text-sm font-bold text-[var(--color-warning)]">Cloud Connection Hanging</p>
                <p className="text-xs text-[var(--color-warning)]/80">Switched to Local Mode (adminStore) to keep you working. Updates won't sync to server.</p>
             </div>
          </div>
          <button onClick={fetchData} className="text-xs font-bold text-[var(--color-warning)] underline px-3 py-1 hover:bg-[var(--color-warning)]/10 rounded-lg">Retry Sync</button>
        </Card>
      )}

      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                <th className="p-6 text-left text-xs font-black uppercase text-[var(--text-tertiary)] tracking-wider">Vehicle</th>
                <th className="p-6 text-left text-xs font-black uppercase text-[var(--text-tertiary)] tracking-wider">Type</th>
                <th className="p-6 text-left text-xs font-black uppercase text-[var(--text-tertiary)] tracking-wider">Specs</th>
                <th className="p-6 text-left text-xs font-black uppercase text-[var(--text-tertiary)] tracking-wider">Status</th>
                <th className="p-6 text-right text-xs font-black uppercase text-[var(--text-tertiary)] tracking-wider">Actions</th>
              </tr>
            </thead>
            <AnimatePresence>
              <motion.tbody>
                {vehiclesFiltered.map((vehicle, idx) => (
                  <motion.tr 
                    key={vehicle.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] hover:shadow-sm transition-all"
                  >
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-10 bg-[var(--bg-tertiary)] rounded-lg overflow-hidden flex-shrink-0 border border-[var(--border-subtle)]">
                          {vehicle.image_url ? (
                            <img src={vehicle.image_url} alt="Car" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--text-tertiary)] text-sm"><Car className="w-4 h-4"/></div>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-[var(--text-primary)]">{vehicle.name}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-tighter mt-1">{vehicle.year} Model</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 font-bold text-[var(--text-secondary)]">
                       {vehicle.car_type?.name || 'Standard'}
                       <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mt-1">{vehicle.car_type_id}</div>
                    </td>
                    <td className="p-6">
                      <div className="flex gap-4 text-xs font-bold text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {vehicle.seats}</span>
                        <span className="flex items-center gap-1"><Settings2 className="w-3 h-3"/> {vehicle.transmission}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <button 
                        onClick={() => toggleAvailability(vehicle.id, vehicle.available)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border outline-none ${
                        vehicle.available 
                          ? 'bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]/20 hover:border-[var(--color-success)]/40' 
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-secondary)]/30'
                        }`}
                      >
                        {vehicle.available ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <IconButton
                          icon={<Edit2 className="w-4 h-4" />}
                          variant="ghost"
                          onClick={() => {
                              setEditingVehicleId(vehicle.id);
                              setNewVehicle({
                                  name: vehicle.name,
                                  car_type_id: vehicle.car_type_id,
                                  year: vehicle.year,
                                  seats: vehicle.seats,
                                  transmission: vehicle.transmission,
                                  image_url: vehicle.image_url || '',
                                  available: vehicle.available
                              });
                              setShowCreateForm(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-[var(--text-tertiary)] hover:text-[var(--color-primary-600)] hover:bg-[var(--color-primary-500)]/10"
                          title="Edit Vehicle"
                        />
                        <IconButton
                          icon={<Trash2 className="w-4 h-4" />}
                          variant="ghost"
                          onClick={() => deleteVehicleDoc(vehicle.id)}
                          className="text-[var(--text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-light)]"
                          title="Delete Vehicle"
                        />
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {vehiclesFiltered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-[var(--text-secondary)] font-semibold">
                      No vehicles match the current filters.
                    </td>
                  </tr>
                )}
              </motion.tbody>
            </AnimatePresence>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {showCreateForm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[var(--bg-primary)] rounded-3xl p-8 max-w-2xl w-full shadow-premium border border-[var(--border-subtle)] max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6">{editingVehicleId ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
              <form onSubmit={handleCreateVehicle} className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1.5 block">Vehicle Name / Model</label>
                  <input
                    type="text"
                    value={newVehicle.name}
                    onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})}
                    className="w-full p-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-subtle)] rounded-xl text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-primary-500)] outline-none transition-all"
                    placeholder="e.g. Toyota Vios XLE"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1.5 block">Car Type</label>
                  <select
                    value={newVehicle.car_type_id}
                    onChange={(e) => setNewVehicle({...newVehicle, car_type_id: e.target.value})}
                    className="w-full p-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-subtle)] rounded-xl text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-primary-500)] outline-none transition-all"
                  >
                    {carTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1.5 block">Year</label>
                  <input
                    type="text"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({...newVehicle, year: e.target.value})}
                    className="w-full p-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-subtle)] rounded-xl text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-primary-500)] outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1.5 block">Seats</label>
                  <input
                    type="number"
                    value={newVehicle.seats}
                    onChange={(e) => setNewVehicle({...newVehicle, seats: parseInt(e.target.value)})}
                    className="w-full p-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-subtle)] rounded-xl text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-primary-500)] outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1.5 block">Transmission</label>
                  <select
                    value={newVehicle.transmission}
                    onChange={(e) => setNewVehicle({...newVehicle, transmission: e.target.value})}
                    className="w-full p-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-subtle)] rounded-xl text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-primary-500)] outline-none transition-all"
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1.5 block">Image URL</label>
                  <input
                    type="text"
                    value={newVehicle.image_url}
                    onChange={(e) => setNewVehicle({...newVehicle, image_url: e.target.value})}
                    className="w-full p-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-subtle)] rounded-xl text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-primary-500)] outline-none transition-all font-mono"
                    placeholder="https://..."
                  />
                </div>
                <div className="md:col-span-2 flex gap-3 mt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white shadow-lg"
                  >
                    {editingVehicleId ? 'Save Changes' : 'Create Vehicle'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
import { withTimeout } from "@/lib/api-utils";
import { FilterDropdown, FilterConfig, ActiveFilters } from "@/components/ui/FilterDropdown";

function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

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

        let vehiclesData = vehsSnap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            car_type: carTypesMap[d.data().car_type_id] || { name: 'Standard' }
        }));
        
        vehiclesData.sort((a: any, b: any) => {
           const timeA = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
           const timeB = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
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
        const s = toDate(b.start_date);
        const e = toDate(b.end_date);
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
        available: true,
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
        await updateDoc(vehicleRef, { available: !current });
        fetchData();
      } catch (err) {
          console.error("Error toggling availability:", err);
      }
    } else {
      adminStore.updateVehicle(id, { available: !current });
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
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <h1 className="text-3xl font-bold text-slate-900 leading-tight">Fleet Management</h1>
               <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${mode === 'cloud' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                 {mode === 'cloud' ? '● Cloud Synced' : '⚠ Local Mode'}
               </span>
            </div>
            <p className="text-slate-600">Add and manage your car inventory. {mode === 'local' && '(Syncing disabled in Local Mode)'}</p>
          </div>
          <div className="flex gap-3">
             <button
              onClick={fetchData}
              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              title="Refresh Connection"
             >
                🔄
             </button>
             <input
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Search vehicle, type..."
               className="px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700 outline-none w-[260px]"
             />
             <FilterDropdown
               filters={filterConfigs}
               onApply={(filters) => setActiveFilters(filters)}
             >
               {(activeFilters) => (
                 <button
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
                      setShowCreateForm(!showCreateForm);
                  }}
                  className="px-6 py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl font-bold shadow-lg transition-all"
                 >
                   {showCreateForm ? 'Cancel' : 'Add New Vehicle'}
                 </button>
               )}
             </FilterDropdown>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm lg:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Available between (no booking overlap)</p>
            <div className="flex gap-2">
              <input type="date" value={availFrom} onChange={(e) => setAvailFrom(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs" />
              <input type="date" value={availTo} onChange={(e) => setAvailTo(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs" />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-semibold">Uses bookings with status: approved/active.</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Results</p>
              <p className="text-2xl font-black text-slate-900">{vehiclesFiltered.length}</p>
            </div>
            <button
              onClick={() => {
                setSearch('');
                setActiveFilters({});
                setFilterAvailable('all');
                setAvailFrom('');
                setAvailTo('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
            >
              Reset
            </button>
          </div>
        </div>

        {mode === 'local' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <span className="text-xl">📡</span>
               <div>
                  <p className="text-sm font-bold text-amber-900">Cloud Connection Hanging</p>
                  <p className="text-xs text-amber-800/80">Switched to Local Mode (adminStore) to keep you working. Updates won't sync to server.</p>
               </div>
            </div>
            <button onClick={fetchData} className="text-xs font-bold text-amber-700 underline px-3 py-1 hover:bg-amber-100 rounded-lg">Retry Sync</button>
          </div>
        )}

        {showCreateForm && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Vehicle Details</h2>
            <form onSubmit={handleCreateVehicle} className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Vehicle Name / Model</label>
                <input
                  type="text"
                  value={newVehicle.name}
                  onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  placeholder="e.g. Toyota Vios XLE"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Car Type</label>
                <select
                  value={newVehicle.car_type_id}
                  onChange={(e) => setNewVehicle({...newVehicle, car_type_id: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                >
                  {carTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Year</label>
                <input
                  type="text"
                  value={newVehicle.year}
                  onChange={(e) => setNewVehicle({...newVehicle, year: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Seats</label>
                <input
                  type="number"
                  value={newVehicle.seats}
                  onChange={(e) => setNewVehicle({...newVehicle, seats: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Transmission</label>
                <select
                  value={newVehicle.transmission}
                  onChange={(e) => setNewVehicle({...newVehicle, transmission: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                >
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Image URL</label>
                <input
                  type="text"
                  value={newVehicle.image_url}
                  onChange={(e) => setNewVehicle({...newVehicle, image_url: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 font-mono text-xs"
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-end gap-3">
                <button type="submit" className="flex-1 py-3 bg-green-700 text-white rounded-xl font-bold shadow-lg hover:bg-green-800 transition-all">
                  {editingVehicleId ? 'Save Changes' : 'Create Vehicle'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-6 text-left text-sm font-bold text-slate-500">Vehicle</th>
                  <th className="p-6 text-left text-sm font-bold text-slate-500">Type</th>
                  <th className="p-6 text-left text-sm font-bold text-slate-500">Specs</th>
                  <th className="p-6 text-left text-sm font-bold text-slate-500">Status</th>
                  <th className="p-6 text-right text-sm font-bold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehiclesFiltered.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                          {vehicle.image_url ? (
                            <img src={vehicle.image_url} alt="Car" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">🚗</div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{vehicle.name}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{vehicle.year} Model</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 font-medium text-slate-700">
                       {vehicle.car_type?.name || 'Standard'}
                       <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{vehicle.car_type_id}</div>
                    </td>
                    <td className="p-6">
                      <div className="flex gap-4 text-xs font-bold text-slate-600">
                        <span>👥 {vehicle.seats}</span>
                        <span>⚙️ {vehicle.transmission}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <button 
                        onClick={() => toggleAvailability(vehicle.id, vehicle.available)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        vehicle.available 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {vehicle.available ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                    <td className="p-6 text-right space-x-2">
                      <button
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
                        className="p-2 text-slate-400 hover:text-amber-600 transition-colors"
                        title="Edit Vehicle"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteVehicleDoc(vehicle.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete Vehicle"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {vehiclesFiltered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-semibold">
                      No vehicles match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

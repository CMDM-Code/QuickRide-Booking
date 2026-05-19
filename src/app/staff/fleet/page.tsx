'use client';

import { useEffect, useState } from "react";
import { getAllVehicles, updateVehicleStatus, type Vehicle } from "@/lib/vehicle-service";

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setLoading(true);
        const data = await getAllVehicles();
        setVehicles(data);
      } catch (error) {
        console.error('Error loading vehicles:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadVehicles();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'badge-success';
      case 'rented': return 'badge-info';
      case 'maintenance': return 'badge-warning';
      case 'retired': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateVehicleStatus(id, newStatus as any);
      const updated = await getAllVehicles();
      setVehicles(updated);
    } catch (error) {
      console.error('Error updating vehicle status:', error);
    }
  };

  const statusCounts = {
    available: vehicles.filter(v => v.status === 'available').length,
    rented: vehicles.filter(v => v.status === 'rented').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    retired: vehicles.filter(v => v.status === 'retired').length,
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fleet Management</h1>
          <p className="text-slate-600 mt-1">Manage vehicle status and maintenance</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="card text-center">
              <div className="text-2xl font-bold text-slate-900">{count}</div>
              <div className="text-sm text-slate-600 capitalize">{status.replace('-', ' ')}</div>
            </div>
          ))}
        </div>

        <div className="card">
          {vehicles.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-5xl mb-4">🚗</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Vehicles Found</h3>
              <p className="text-slate-600">Fleet vehicles will appear here when configured in the system.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Vehicle</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Plate</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Mileage</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4 font-medium text-slate-900">{vehicle.name}</td>
                      <td className="py-4 px-4 font-mono text-slate-700">{vehicle.licensePlate}</td>
                      <td className="py-4 px-4 text-slate-700">{vehicle.mileage.toLocaleString()} km</td>
                      <td className="py-4 px-4">
                        <span className={`badge ${getStatusColor(vehicle.status)} capitalize`}>{vehicle.status}</span>
                      </td>
                      <td className="py-4 px-4">
                        <select 
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                          value={vehicle.status}
                          onChange={(e) => handleStatusChange(vehicle.id, e.target.value)}
                        >
                          <option value="available">Available</option>
                          <option value="rented">Rented</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="retired">Retired</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
  );
}

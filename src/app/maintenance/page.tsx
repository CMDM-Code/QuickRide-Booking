export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🔧</div>
        <h1 className="text-3xl font-bold text-slate-900">Under Maintenance</h1>
        <p className="text-slate-600 mt-4 mb-8">
          QuickRide Booking is currently undergoing scheduled maintenance.
          We'll be back online shortly. Thank you for your patience.
        </p>
        <p className="text-sm text-slate-500">
          Estimated completion time: 30 minutes
        </p>
      </div>
    </div>
  );
}

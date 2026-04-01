import LocationAttendance from '../components/LocationAttendance';

export default function KitchenAttendance() {
  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <p className="text-slate-500 text-sm mt-1">Mark your daily attendance using your location</p>
      </div>
      <LocationAttendance />
    </div>
  );
}

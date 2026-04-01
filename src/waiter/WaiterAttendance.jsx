import SelfieAttendance from '../components/SelfieAttendance';

export default function WaiterAttendance() {
  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <p className="text-slate-500 text-sm mt-1">Mark your daily attendance with a selfie</p>
      </div>
      <SelfieAttendance />
    </div>
  );
}

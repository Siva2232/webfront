import AttendanceHistoryCalendar from '../components/AttendanceHistoryCalendar';

export default function WaiterAttendanceHistory() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-2">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Attendance History</h1>
        <p className="text-slate-500 text-sm mt-1">Your monthly attendance calendar — present, absent & leave days</p>
      </div>
      <AttendanceHistoryCalendar />
    </div>
  );
}

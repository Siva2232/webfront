import { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Navigation, CheckCircle2, LogOut, Clock, AlertCircle, Loader2, Calendar, Activity } from 'lucide-react';
import { locationAttendance, getAttendanceLocation, getMyAttendance } from '../api/hrApi';
import toast from 'react-hot-toast';

const RADIUS_DEFAULT = 100; // metres — real-world GPS safe default
// Acceptable GPS accuracy before we stop scanning (metres)
const GPS_ACCURACY_TARGET = 30;
// Max wait before using best-so-far reading
const GPS_SCAN_TIMEOUT = 20000;

// Haversine formula — distance in metres
function distanceMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function StatusBadge({ status }) {
  const map = {
    present: 'bg-emerald-100 text-emerald-700',
    absent:  'bg-red-100 text-red-700',
    leave:   'bg-amber-100 text-amber-700',
    'half-day': 'bg-purple-100 text-purple-700',
    holiday: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {status || 'unknown'}
    </span>
  );
}

export default function LocationAttendance() {
  const [workLocation, setWorkLocation]   = useState(null);
  const [myLocation, setMyLocation]       = useState(null);   // { lat, lng }
  const [liveLocation, setLiveLocation]   = useState(null);   // continuously updated
  const [gpsAccuracy, setGpsAccuracy]     = useState(null);
  const [distance, setDistance]           = useState(null);
  const [locError, setLocError]           = useState(null);
  const [locLoading, setLocLoading]       = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [todayRecord, setTodayRecord]     = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [tab, setTab]                     = useState('attend');  // 'attend' | 'history'
  const [liveWatchId, setLiveWatchId]     = useState(null);

  const scanWatchRef = useRef(null);
  const scanTimerRef = useRef(null);

  // ── cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (scanWatchRef.current !== null) {
        navigator.geolocation?.clearWatch(scanWatchRef.current);
      }
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, []);

  // ── load admin location config ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await getAttendanceLocation();
        setWorkLocation(data);
      } catch { /* not configured yet */ }
      finally { setConfigLoading(false); }
    })();
  }, []);

  // ── load today + history ────────────────────────────────────────
  const loadAttendance = useCallback(async () => {
    try {
      const { data } = await getMyAttendance();
      const records = data?.records || data || [];
      // Use IST date for today-matching (server stores dates in IST)
      const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const rec   = records.find((r) => r.date?.startsWith(today));
      setTodayRecord(rec || null);
      setHistoryRecords(records.slice().reverse());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  // ── start continuous live-position watch ──────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLiveLocation(coords);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    setLiveWatchId(wid);
    return () => navigator.geolocation.clearWatch(wid);
  }, []);

  // ── recompute distance whenever live position or workLocation changes
  useEffect(() => {
    if (!liveLocation || !workLocation) return;
    const d = distanceMetres(liveLocation.lat, liveLocation.lng, workLocation.lat, workLocation.lng);
    setDistance(d);
    // Also keep myLocation in sync so submit uses latest coords
    setMyLocation(liveLocation);
  }, [liveLocation, workLocation]);

  // ── high-accuracy one-shot scan (called by button) ─────────────
  const doScan = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    if (scanWatchRef.current !== null) {
      navigator.geolocation.clearWatch(scanWatchRef.current);
      scanWatchRef.current = null;
    }
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);

    setLocLoading(true);
    setLocError(null);

    let bestPos = null;

    const commit = (pos) => {
      if (scanWatchRef.current !== null) {
        navigator.geolocation.clearWatch(scanWatchRef.current);
        scanWatchRef.current = null;
      }
      clearTimeout(scanTimerRef.current);
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMyLocation(coords);
      setGpsAccuracy(Math.round(pos.coords.accuracy));
      if (workLocation) {
        setDistance(distanceMetres(coords.lat, coords.lng, workLocation.lat, workLocation.lng));
      }
      setLocLoading(false);
    };

    scanTimerRef.current = setTimeout(() => {
      if (bestPos) commit(bestPos);
      else {
        if (scanWatchRef.current !== null) navigator.geolocation.clearWatch(scanWatchRef.current);
        setLocError('GPS signal too weak. Please move near a window and try again.');
        setLocLoading(false);
      }
    }, GPS_SCAN_TIMEOUT);

    scanWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) bestPos = pos;
        if (pos.coords.accuracy <= GPS_ACCURACY_TARGET) commit(pos);
      },
      (err) => {
        clearTimeout(scanTimerRef.current);
        if (scanWatchRef.current !== null) navigator.geolocation.clearWatch(scanWatchRef.current);
        setLocError(
          err.code === 1 ? 'Location permission denied. Please allow it in browser settings.'
          : err.code === 2 ? 'GPS unavailable. Enable location on your device.'
          : 'Location request timed out. Try again.'
        );
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: GPS_SCAN_TIMEOUT, maximumAge: 0 }
    );
  }, [workLocation]);

  // ── derived ─────────────────────────────────────────────────────
  const radius     = workLocation?.radius ?? RADIUS_DEFAULT;
  const withinZone = distance !== null && distance <= radius;
  const checkedIn  = !!(todayRecord?.checkIn);
  const checkedOut = !!(todayRecord?.checkOut);
  const actionLabel = checkedIn && !checkedOut ? 'Check Out' : 'Check In';
  const canSubmit   = myLocation !== null && withinZone && !submitting;

  // GPS confidence level
  const gpsLevel = gpsAccuracy === null ? null
    : gpsAccuracy <= 15 ? 'high'
    : gpsAccuracy <= 40 ? 'medium'
    : 'low';

  // percentage of radius filled by distance (capped at 100%)
  const pct = distance !== null ? Math.min(100, Math.round((distance / radius) * 100)) : null;

  // ── submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!myLocation) return;
    setSubmitting(true);
    try {
      const { data } = await locationAttendance({ lat: myLocation.lat, lng: myLocation.lng });
      const rec = data.record || data;
      setTodayRecord(rec);
      await loadAttendance();
      toast.success(rec.checkOut ? `Checked out at ${formatTime(rec.checkOut)}` : `Checked in at ${formatTime(rec.checkIn)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  // ── loading / no config ─────────────────────────────────────────
  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!workLocation) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <p className="font-bold text-amber-800 text-lg">Work Location Not Configured</p>
        <p className="text-sm text-amber-600">Admin has not set the office/shop location yet. Please contact your administrator.</p>
      </div>
    );
  }

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-lg mx-auto">

      {/* Tab selector */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
        <button
          onClick={() => setTab('attend')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${
            tab === 'attend' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Navigation className="w-4 h-4" /> Mark Attendance
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${
            tab === 'history' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar className="w-4 h-4" /> My History
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          TAB 1 — MARK ATTENDANCE
      ═══════════════════════════════════════════ */}
      {tab === 'attend' && (
        <>
          {/* Work location info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Office / Shop</p>
              <p className="font-bold text-slate-800 truncate">{workLocation.label || 'Work Location'}</p>
              <p className="text-xs text-slate-400 mt-0.5">Allowed radius: <span className="font-bold text-slate-600">{radius}m</span></p>
            </div>
          </div>

          {/* Today's status banner */}
          {todayRecord && (
            <div className={`rounded-2xl p-4 border flex items-center gap-4 ${
              checkedOut ? 'bg-emerald-50 border-emerald-200'
              : checkedIn ? 'bg-sky-50 border-sky-200'
              : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                checkedOut ? 'bg-emerald-500' : checkedIn ? 'bg-sky-500' : 'bg-slate-300'
              }`}>
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className={`text-xs font-black uppercase tracking-widest ${checkedOut ? 'text-emerald-600' : 'text-sky-600'}`}>
                  {checkedOut ? 'Shift Complete' : checkedIn ? 'Checked In' : 'Not Marked'}
                </p>
                <p className="text-sm font-bold text-slate-700 mt-0.5">
                  {checkedIn && <span>In: <span className="text-sky-700">{formatTime(todayRecord.checkIn)}</span></span>}
                  {checkedOut && <span className="ml-3">Out: <span className="text-emerald-700">{formatTime(todayRecord.checkOut)}</span></span>}
                </p>
                {checkedOut && todayRecord.workHours > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">{todayRecord.workHours.toFixed(1)} hours worked</p>
                )}
              </div>
            </div>
          )}

          {/* Geofence ring + distance indicator */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Live Location Status</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {liveLocation
                    ? `Auto-tracking · Tap "Scan" for higher accuracy`
                    : 'Waiting for GPS signal…'}
                </p>
              </div>
              <button
                onClick={doScan}
                disabled={locLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors"
              >
                {locLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Activity className="w-4 h-4" />}
                {locLoading ? 'Scanning…' : 'Scan GPS'}
              </button>
            </div>

            {locError && (
              <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{locError}</span>
              </div>
            )}

            {/* GPS progress bar */}
            {(myLocation || liveLocation) && distance !== null && (
              <div className="space-y-3">
                {/* Accuracy pill */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {(myLocation || liveLocation)?.lat?.toFixed(5)}, {(myLocation || liveLocation)?.lng?.toFixed(5)}
                  </span>
                  {gpsAccuracy !== null && (
                    <span className={`px-2 py-0.5 rounded-full font-bold ${
                      gpsLevel === 'high'   ? 'bg-emerald-100 text-emerald-700'
                      : gpsLevel === 'medium' ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                    }`}>
                      GPS ±{gpsAccuracy}m · {gpsLevel === 'high' ? 'High' : gpsLevel === 'medium' ? 'Medium' : 'Low'} Accuracy
                    </span>
                  )}
                </div>

                {/* Distance progress ring */}
                <div className={`rounded-2xl p-4 border ${withinZone ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-4 h-4 rounded-full shrink-0 ${withinZone ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${withinZone ? 'text-emerald-700' : 'text-red-700'}`}>
                        {withinZone
                          ? `✓ Inside zone — ${Math.round(distance)}m from office`
                          : `✗ Outside zone — ${Math.round(distance)}m away`}
                      </p>
                      <p className={`text-xs mt-0.5 ${withinZone ? 'text-emerald-600' : 'text-red-500'}`}>
                        {withinZone
                          ? `You are within the ${radius}m allowed radius`
                          : `Move within ${radius}m of the office to mark attendance`}
                      </p>
                    </div>
                  </div>

                  {/* Visual progress bar */}
                  <div className="w-full bg-white/80 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${withinZone ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                    <span>0m</span>
                    <span className={withinZone ? 'text-emerald-600' : 'text-red-500'}>{Math.round(distance)}m here</span>
                    <span>{radius}m limit</span>
                  </div>
                </div>

                {/* Low accuracy warning */}
                {gpsLevel === 'low' && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>GPS accuracy is low (±{gpsAccuracy}m). Move near a window or go outside for a better signal, then tap "Scan GPS" again.</span>
                  </div>
                )}
              </div>
            )}

            {!myLocation && !liveLocation && !locLoading && !locError && (
              <p className="text-center text-sm text-slate-400 py-4">
                Tap <strong>Scan GPS</strong> to check your location
              </p>
            )}
          </div>

          {/* Mark Attendance button — only if not fully done */}
          {!(checkedIn && checkedOut) && (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all ${
                canSubmit
                  ? checkedIn
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {submitting
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : checkedIn
                  ? <LogOut className="w-5 h-5" />
                  : <CheckCircle2 className="w-5 h-5" />}
              {submitting ? 'Marking…' : actionLabel}
            </button>
          )}

          {checkedIn && checkedOut && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-black text-emerald-800">Attendance Complete for Today</p>
              <p className="text-sm text-emerald-600 mt-1">
                {formatTime(todayRecord.checkIn)} → {formatTime(todayRecord.checkOut)}
                {todayRecord.workHours > 0 && ` (${todayRecord.workHours.toFixed(1)} hrs)`}
              </p>
            </div>
          )}

          {!canSubmit && !submitting && myLocation && !withinZone && (
            <p className="text-center text-xs text-slate-400">
              You must be within <strong>{radius}m</strong> of the office to mark attendance
            </p>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════
          TAB 2 — ATTENDANCE HISTORY
      ═══════════════════════════════════════════ */}
      {tab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="font-bold text-slate-800">My Attendance History</p>
            <button onClick={loadAttendance} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors">
              <Clock className="w-4 h-4" />
            </button>
          </div>

          {historyRecords.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No attendance records found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {historyRecords.map((r) => {
                const d  = new Date(r.date);
                const dd = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const wd = d.toLocaleDateString('en-IN', { weekday: 'short' });
                return (
                  <div key={r._id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="text-center min-w-[44px]">
                      <p className="text-xs font-black text-slate-400 uppercase">{wd}</p>
                      <p className="text-sm font-black text-slate-700">{dd.split(' ')[0]}</p>
                      <p className="text-[10px] text-slate-400">{dd.split(' ').slice(1).join(' ')}</p>
                    </div>
                    <div className="flex-1">
                      <StatusBadge status={r.status} />
                      {(r.checkIn || r.checkOut) && (
                        <p className="text-xs text-slate-500 mt-1">
                          {r.checkIn && <span>In: <span className="font-bold">{formatTime(r.checkIn)}</span></span>}
                          {r.checkOut && <span className="ml-3">Out: <span className="font-bold">{formatTime(r.checkOut)}</span></span>}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {r.workHours > 0 && (
                        <p className="text-xs font-bold text-slate-600">{r.workHours.toFixed(1)}h</p>
                      )}
                      {r.location && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-0.5 mt-0.5">
                          <MapPin className="w-3 h-3" /> GPS
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

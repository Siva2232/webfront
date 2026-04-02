import { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Navigation, CheckCircle2, LogOut, Clock, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { locationAttendance, getAttendanceLocation, getMyAttendance } from '../api/hrApi';
import toast from 'react-hot-toast';

const RADIUS_DEFAULT = 10; // metres
// Stop watching GPS once accuracy reaches this threshold (metres)
const GPS_ACCURACY_TARGET = 20;
// Maximum time to wait for a good GPS fix before using the best-so-far reading
const GPS_SCAN_TIMEOUT = 25000;

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

export default function LocationAttendance() {
  const [workLocation, setWorkLocation] = useState(null);   // { lat, lng, radius, label }
  const [myLocation, setMyLocation] = useState(null);       // { lat, lng }
  const [distance, setDistance] = useState(null);           // metres
  const [gpsAccuracy, setGpsAccuracy] = useState(null);     // metres accuracy of last GPS fix
  const [locError, setLocError] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);    // today's attendance record
  const [configLoading, setConfigLoading] = useState(true);
  const watchIdRef = useRef(null);
  const scanTimerRef = useRef(null);

  /* ── load admin location config ──────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      setConfigLoading(true);
      try {
        const { data } = await getAttendanceLocation();
        setWorkLocation(data);
      } catch {
        // no config yet
      } finally {
        setConfigLoading(false);
      }
    };
    load();
  }, []);

  /* ── load today's attendance status ──────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getMyAttendance();
        const records = data?.records || data || [];
        const today = new Date().toISOString().split('T')[0];
        const rec = records.find((r) => r.date?.startsWith(today));
        setTodayRecord(rec || null);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  /* ── cleanup watches on unmount ─────────────────────────────── */
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (scanTimerRef.current !== null) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, []);

  /* ── get current GPS position (watchPosition for better accuracy) */
  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }

    // Cancel any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (scanTimerRef.current !== null) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    setLocLoading(true);
    setLocError(null);
    setMyLocation(null);
    setDistance(null);
    setGpsAccuracy(null);

    let bestPos = null;

    const applyPosition = (pos) => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (scanTimerRef.current !== null) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMyLocation(coords);
      setGpsAccuracy(Math.round(pos.coords.accuracy));
      if (workLocation) {
        const d = distanceMetres(coords.lat, coords.lng, workLocation.lat, workLocation.lng);
        setDistance(d);
      }
      setLocLoading(false);
    };

    // Fallback: after GPS_SCAN_TIMEOUT use best reading collected so far
    scanTimerRef.current = setTimeout(() => {
      scanTimerRef.current = null;
      if (bestPos) {
        applyPosition(bestPos);
      } else {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setLocError('GPS signal too weak. Move to an open area or near a window and try again.');
        setLocLoading(false);
      }
    }, GPS_SCAN_TIMEOUT);

    // Use watchPosition to collect multiple readings and pick the most accurate one
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Keep the best (lowest accuracy value = most precise) reading
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
          bestPos = pos;
        }
        // Stop early once we reach the accuracy target
        if (pos.coords.accuracy <= GPS_ACCURACY_TARGET) {
          applyPosition(pos);
        }
      },
      (err) => {
        if (scanTimerRef.current !== null) {
          clearTimeout(scanTimerRef.current);
          scanTimerRef.current = null;
        }
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        const msg =
          err.code === 1
            ? 'Location access denied. Please allow location access in your browser settings.'
            : err.code === 2
            ? 'Position unavailable. Please ensure your GPS is enabled.'
            : 'Location request timed out. Please try again.';
        setLocError(msg);
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: GPS_SCAN_TIMEOUT, maximumAge: 0 }
    );
  }, [workLocation]);

  /* ── derived state ───────────────────────────────────────────── */
  const radius = workLocation?.radius ?? RADIUS_DEFAULT;
  const withinRadius = distance !== null && distance <= radius;
  const checkedIn = !!(todayRecord?.checkIn);
  const checkedOut = !!(todayRecord?.checkOut);
  const actionLabel = checkedIn && !checkedOut ? 'Check Out' : 'Check In';
  const isReady = myLocation && withinRadius && !submitting;

  /* ── submit attendance ───────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!myLocation) return;
    setSubmitting(true);
    try {
      const { data } = await locationAttendance({ lat: myLocation.lat, lng: myLocation.lng });
      const rec = data.record || data;
      setTodayRecord(rec);
      if (rec.checkIn && !rec.checkOut) {
        toast.success(`Checked in at ${rec.checkIn}`);
      } else {
        toast.success(`Checked out at ${rec.checkOut}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  /* ────────────────────────────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────────────────────────── */

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!workLocation) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <p className="font-semibold text-amber-800">Work Location Not Configured</p>
        <p className="text-sm text-amber-600">Admin has not set the work location yet. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Work Location Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Location</p>
          <p className="font-bold text-slate-800">{workLocation.label || 'Office'}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {workLocation.lat.toFixed(5)}, {workLocation.lng.toFixed(5)} — Radius: {radius}m
          </p>
        </div>
      </div>

      {/* Today's Status */}
      {todayRecord && (
        <div className={`rounded-2xl p-4 border flex items-center gap-4 ${
          checkedOut
            ? 'bg-emerald-50 border-emerald-200'
            : checkedIn
            ? 'bg-sky-50 border-sky-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <CheckCircle2 className={`w-6 h-6 flex-shrink-0 ${checkedOut ? 'text-emerald-500' : checkedIn ? 'text-sky-500' : 'text-slate-400'}`} />
          <div>
            {checkedIn && (
              <p className="text-sm font-semibold text-slate-700">
                Checked In: <span className="text-sky-700">{todayRecord.checkIn}</span>
              </p>
            )}
            {checkedOut && (
              <p className="text-sm font-semibold text-slate-700">
                Checked Out: <span className="text-emerald-700">{todayRecord.checkOut}</span>
                {todayRecord.workHours ? (
                  <span className="ml-2 text-xs text-slate-500">({todayRecord.workHours.toFixed(1)} hrs)</span>
                ) : null}
              </p>
            )}
          </div>
        </div>
      )}

      {/* If fully done for today */}
      {checkedIn && checkedOut ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="font-bold text-emerald-800">Attendance Complete for Today</p>
          <p className="text-sm text-emerald-600 mt-1">
            {todayRecord.checkIn} → {todayRecord.checkOut} ({todayRecord.workHours?.toFixed(1)} hrs)
          </p>
        </div>
      ) : (
        <>
          {/* Location Fetch */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Your Location</p>
                <p className="text-xs text-slate-400 mt-0.5">Tap the button to get your current GPS location</p>
              </div>
              <button
                onClick={fetchLocation}
                disabled={locLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {locLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                {locLoading ? 'Scanning GPS…' : myLocation ? 'Refresh' : 'Get Location'}
              </button>
            </div>

            {locError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {locError}
              </div>
            )}

            {myLocation && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Navigation className="w-4 h-4 text-slate-400" />
                  <span>{myLocation.lat.toFixed(5)}, {myLocation.lng.toFixed(5)}</span>
                  {gpsAccuracy !== null && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      gpsAccuracy <= 10 ? 'bg-emerald-100 text-emerald-700'
                      : gpsAccuracy <= 30 ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                    }`}>
                      ±{gpsAccuracy}m
                    </span>
                  )}
                </div>

                {/* Distance indicator */}
                <div className={`rounded-xl p-4 flex items-center gap-3 ${
                  withinRadius
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${withinRadius ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                  <div>
                    <p className={`text-sm font-bold ${withinRadius ? 'text-emerald-700' : 'text-red-700'}`}>
                      {withinRadius
                        ? `Within range — ${Math.round(distance)}m from work location`
                        : `Out of range — ${Math.round(distance)}m away (need within ${radius}m)`}
                    </p>
                    <p className={`text-xs mt-0.5 ${withinRadius ? 'text-emerald-600' : 'text-red-600'}`}>
                      {withinRadius
                        ? `You can ${actionLabel.toLowerCase()} now`
                        : `Move closer to mark attendance`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleSubmit}
            disabled={!isReady}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all ${
              isReady
                ? checkedIn
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : checkedIn ? (
              <LogOut className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            {submitting ? 'Marking…' : actionLabel}
          </button>

          {!myLocation && !locLoading && (
            <p className="text-center text-xs text-slate-400">
              Get your location first to enable the {actionLabel} button
            </p>
          )}
          {myLocation && !withinRadius && (
            <p className="text-center text-xs text-slate-400">
              Move within {radius}m of the work location to enable attendance
            </p>
          )}
        </>
      )}
    </div>
  );
}

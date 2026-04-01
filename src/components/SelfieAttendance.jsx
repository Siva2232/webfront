import { useState, useRef, useEffect } from 'react';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { Camera, CheckCircle2, MapPin, RefreshCw, LogOut, Clock } from 'lucide-react';

/**
 * Standalone selfie attendance component.
 * Uses the regular POS/waiter/kitchen auth token (not hrToken).
 * No dependency on HRContext or StaffPortal.
 */
export default function SelfieAttendance() {
  const [stream, setStream]     = useState(null);
  const [photo, setPhoto]       = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [lastRecord, setLastRecord] = useState(null);
  const [isPunchingOut, setIsPunchingOut] = useState(false);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  /* ── check if already marked check-in today ─────────────────── */
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await axios.get('/hr/attendance/mine');
        // If data is an array, it might be records. If it's the result from getMyAttendance
        const records = data.records || data || [];
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = records.find(r => r.date.startsWith(today));
        
        if (todayRecord) {
          setLastRecord(todayRecord);
          // If checked in but not checked out, show check-out state
          if (todayRecord.status === 'present' && todayRecord.checkIn && !todayRecord.checkOut) {
            setIsPunchingOut(true);
          }
        }
      } catch (err) {
        console.error('Error fetching attendance status:', err);
      }
    };
    fetchStatus();
  }, []);

  /* ── simple check-out without camera ────────────────────────── */
  const handleCheckOut = async () => {
    setLoading(true);
    try {
      // We call the same selfie endpoint but without the photo
      // Backend should handle check-out if check-in already exists for today
      const { data } = await axios.post('/hr/attendance/selfie', {}, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setLastRecord(data);
      setIsPunchingOut(false);
      toast.success(`Checked out successfully at ${data.checkOut}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  /* ── start camera + grab GPS ───────────────────────────────────── */
  const startCamera = async () => {
    try {
      setLoading(true);
      // 1. First trigger location to ensure it's allowed
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );

      // 2. Initialize camera
      const constraints = {
        video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
        },
        audio: false
      };

      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
    } catch (err) {
      console.error('Camera Access Error:', err);
      toast.error('Camera permission required. Please allow camera access in your browser settings.');
    } finally {
      setLoading(false);
    }
  };

  // 3. New Effect to hook the stream when the UI actually renders the <video>
  useEffect(() => {
    if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Auto-play failed:", e));
    }
  }, [stream]);

  /* ── capture frame ─────────────────────────────────────────────── */
  const takePhoto = () => {
    try {
        const video = videoRef.current;
        if (!video) {
            console.error("Video element not found");
            return;
        }

        // Create a temporary canvas if canvasRef is not ready
        const canvas = canvasRef.current || document.createElement('canvas');
        
        // Use specific capture dimensions to ensure it works on all devices
        // Prefer actual video stream dimensions over defaults
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
            console.error("Could not get canvas context");
            return;
        }
        
        // Mirror the capture to match the preview
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        if (!dataUrl || dataUrl === "data:,") {
           throw new Error("Canvas produced empty image");
        }

        setPhoto(dataUrl);

        // Properly shutdown tracks
        if (stream) {
          stream.getTracks().forEach((track) => {
              track.stop();
              track.enabled = false;
          });
        }
        setStream(null);
    } catch (err) {
        console.error("Capture capture failed:", err);
        toast.error("Failed to capture image. Please try again.");
    }
  };

  /* ── submit to backend ─────────────────────────────────────────── */
  const submitAttendance = async () => {
    setLoading(true);
    try {
      const blob = await (await fetch(photo)).blob();
      const formData = new FormData();
      formData.append('selfie', blob, 'selfie.jpg');
      if (location) formData.append('location', JSON.stringify(location));

      const { data } = await axios.post('/hr/attendance/selfie', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setLastRecord(data);
      setPhoto(null);
      setLocation(null);

      // If just checked in, immediately show check-out UI
      if (data.checkIn && !data.checkOut) {
        setIsPunchingOut(true);
      }

      const action = data.checkIn && !data.checkOut ? 'Check-In' : 'Check-Out';
      toast.success(`Attendance marked — ${action} at ${data.checkIn || data.checkOut}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  /* ── retake ────────────────────────────────────────────────────── */
  const retake = () => {
    setPhoto(null);
    startCamera();
  };

  /* ────────────────────────────────────────────────────────────────
     RENDER — Punch out state (No Camera)
  ─────────────────────────────────────────────────────────────── */
  if (isPunchingOut && lastRecord) {
    return (
      <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-2">
          <Clock size={40} />
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-800">Checked In</h3>
          <p className="text-sm text-slate-500 mt-1">Logged in at {lastRecord.checkIn}</p>
        </div>

        <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 mb-2 text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Status</span>
            <div className="text-emerald-600 font-bold text-sm flex items-center justify-center gap-1.5 mt-1">
                <CheckCircle2 size={16} /> Currently on Shift
            </div>
        </div>

        <button
          onClick={handleCheckOut}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-rose-500 hover:bg-rose-600 active:scale-95 disabled:opacity-60 text-white rounded-2xl text-lg font-bold shadow-xl shadow-rose-100 transition-all"
        >
          {loading ? (
             <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogOut size={24} />
          )}
          {loading ? 'Checking out…' : 'Check Out'}
        </button>
        
        <p className="text-xs text-slate-400">Shift end? Click here to punch out for the day.</p>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────
     RENDER — Already completed for today
  ─────────────────────────────────────────────────────────────── */
  if (lastRecord && lastRecord.checkIn && lastRecord.checkOut) {
    return (
      <div className="flex flex-col items-center gap-5 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-2">
          <CheckCircle2 size={40} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Attendance Completed</h3>
          <p className="text-sm text-slate-500 mt-1">You have recorded your day.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full mt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">In</p>
                <p className="font-bold text-slate-700">{lastRecord.checkIn}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Out</p>
                <p className="font-bold text-slate-700">{lastRecord.checkOut}</p>
            </div>
        </div>
        {lastRecord.workHours > 0 && (
            <p className="text-sm font-medium text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full">
                Total: {lastRecord.workHours.toFixed(2)} hrs
            </p>
        )}
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────
     RENDER — preview after capture
  ─────────────────────────────────────────────────────────────── */
  if (photo) {
    return (
      <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-300">
        <div className="relative group p-1 bg-gradient-to-tr from-blue-500 to-emerald-400 rounded-full shadow-2xl">
           <img
            src={photo}
            alt="selfie preview"
            className="w-48 h-48 object-cover rounded-full border-4 border-white shadow-inner scale-x-[-1]"
           />
           <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2.5 rounded-2xl shadow-lg border-2 border-white animate-bounce-short">
              <CheckCircle2 size={24} />
           </div>
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-xl font-bold text-slate-800">Review Selfie</h3>
          {location && (
            <div className="flex items-center justify-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold shrink-0">
               <MapPin size={12} />
               Verify Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </div>
          )}
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={submitAttendance}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white rounded-2xl text-lg font-bold shadow-xl shadow-blue-100 transition-all"
          >
            {loading ? (
              <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 size={24} />
            )}
            {loading ? 'Submitting…' : 'Submit Check-In'}
          </button>
          
          <button
            onClick={retake}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-500 transition-all"
          >
            <RefreshCw size={15} /> Retake Photo
          </button>
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────
     RENDER — Initial state (Not mark yet)
  ─────────────────────────────────────────────────────────────── */
  if (!stream && !photo) {
    return (
      <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-300">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
          <Camera size={40} />
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-800">Selfie Attendance</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-[220px]">
            Please take a quick selfie to mark your <strong>Check-In</strong> for today.
          </p>
        </div>

        <button
          onClick={startCamera}
          className="w-full h-16 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white rounded-2xl text-lg font-bold shadow-xl shadow-blue-100 flex items-center justify-center gap-3 transition-all"
        >
          <Camera size={24} />
          Start Camera
        </button>

        <div className="flex flex-col gap-2 w-full mt-2">
           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                 <MapPin size={18} />
              </div>
              <p className="text-xs font-medium text-slate-600">Auto Location Capturing</p>
           </div>
           <p className="text-[10px] text-center text-slate-400 mt-2 px-6">
             * Ensure you are at your designated workplace before marking attendance.
           </p>
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────
     RENDER — live camera
  ─────────────────────────────────────────────────────────────── */
  if (stream) {
    return (
      <div className="flex flex-col items-center gap-5 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden bg-slate-900 shadow-2xl transition-all duration-300">
           <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-2xl scale-x-[-1]"
           />
           <div className="absolute inset-0 border-[10px] border-white/20 rounded-2xl pointer-events-none"></div>
           <div className="absolute top-4 left-4 flex gap-2">
              <span className="w-3 h-3 bg-rose-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] uppercase font-bold text-white tracking-widest drop-shadow-md">Live Preview</span>
           </div>
        </div>
        
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Capture selfie</p>
        
        <button
          onClick={takePhoto}
          className="w-20 h-20 bg-white border-8 border-blue-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all duration-300"
        >
          <div className="w-14 h-14 bg-blue-600 rounded-full ring-4 ring-white shadow-inner" />
        </button>
        
        <button 
           onClick={() => { stream.getTracks().forEach(t => t.stop()); setStream(null); }}
           className="text-xs font-bold text-rose-500 hover:underline uppercase tracking-widest mt-2"
        >
           Cancel
        </button>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────
     RENDER — idle / last record
  ─────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col items-center gap-5 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
        <Camera className="text-blue-600" size={34} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Selfie Attendance</h3>
        <p className="text-sm text-slate-500">Mark your daily attendance with a quick selfie</p>
      </div>

      {lastRecord && (
        <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          <p className="font-semibold">
            ✓ Today's attendance recorded
          </p>
          <p className="text-xs mt-1">
            {lastRecord.checkIn && <>Check-In: <b>{lastRecord.checkIn}</b></>}
            {lastRecord.checkIn && lastRecord.checkOut && ' · '}
            {lastRecord.checkOut && <>Check-Out: <b>{lastRecord.checkOut}</b></>}
          </p>
        </div>
      )}

      <button
        onClick={startCamera}
        className="flex items-center gap-2 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-semibold text-sm shadow-xl transition"
      >
        <Camera size={18} /> Start Camera
      </button>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

import React, { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";
import { Smartphone, RefreshCw, Trash2 } from "lucide-react";
import {
  fetchConnectors,
  generatePairingCode,
  revokeConnector,
} from "./connectorPairing";

export default function RestoPrintPairing({ restaurantId }) {
  const [pairing, setPairing] = useState(null);
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);

  const loadConnectors = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const data = await fetchConnectors(restaurantId);
      setConnectors(data?.connectors || []);
    } catch (_) {
      setConnectors([]);
    }
  }, [restaurantId]);

  useEffect(() => {
    void loadConnectors();
    const timer = setInterval(loadConnectors, 30_000);
    return () => clearInterval(timer);
  }, [loadConnectors]);

  useEffect(() => {
    if (!pairing?.expiresAt) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(pairing.expiresAt).getTime() - Date.now()) / 1000)
      );
      setExpiresIn(remaining);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pairing]);

  const onGenerate = async () => {
    setLoading(true);
    try {
      const data = await generatePairingCode();
      setPairing(data);
      toast.success("Pairing code generated — scan with RestoPrint app");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not generate pairing code");
    } finally {
      setLoading(false);
    }
  };

  const onRevoke = async (connectorId) => {
    if (!window.confirm("Revoke this RestoPrint device?")) return;
    try {
      await revokeConnector(connectorId);
      toast.success("Device revoked");
      await loadConnectors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not revoke device");
    }
  };

  const qrValue = pairing?.qrPayload
    ? JSON.stringify(pairing.qrPayload)
    : pairing
      ? JSON.stringify({
          restaurantId: pairing.restaurantId,
          deviceToken: pairing.deviceToken,
          pairCode: pairing.pairCode,
        })
      : "";

  return (
    <div className="pt-8 border-t border-slate-100">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
          <Smartphone size={20} />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-800">Pair RestoPrint Tablet</h4>
          <p className="text-sm text-slate-500 mt-0.5">
            Install the RestoPrint Android app on 1–3 restaurant tablets. Generate a code, scan the QR,
            then keep the app running in the background.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={onGenerate}
        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? "Generating…" : "Generate Pair Code"}
      </button>

      {pairing ? (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Scan with RestoPrint
            </p>
            <div className="mx-auto w-fit rounded-xl bg-white p-4 border border-slate-100">
              <QRCode value={qrValue} size={180} />
            </div>
            <p className="mt-4 text-center text-2xl font-black tracking-[0.3em] text-slate-800">
              {pairing.pairCode}
            </p>
            <p className="mt-2 text-center text-xs text-slate-500">
              Expires in {Math.floor(expiresIn / 60)}:{String(expiresIn % 60).padStart(2, "0")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <p className="font-bold text-slate-800 mb-2">Manual pairing</p>
            <p>Restaurant ID: <code className="font-mono">{pairing.restaurantId}</code></p>
            <p className="mt-2 break-all">
              Device token: <code className="font-mono text-xs">{pairing.deviceToken}</code>
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-bold text-slate-800">Paired devices</h5>
          <button
            type="button"
            onClick={loadConnectors}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {connectors.length === 0 ? (
          <p className="text-sm text-slate-500">No RestoPrint devices paired yet.</p>
        ) : (
          <ul className="space-y-2">
            {connectors.map((c) => (
              <li
                key={c.connectorId}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-bold text-slate-800">{c.deviceName || c.connectorId}</p>
                  <p className="text-xs text-slate-500">
                    {c.connectorId} · {c.isOnline ? "Online" : "Offline"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRevoke(c.connectorId)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600"
                >
                  <Trash2 size={14} /> Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

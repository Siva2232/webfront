import { useParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import StatusBadge from "../components/StatusBadge";
import { TAKEAWAY_TABLE } from "../context/CartContext";
import { Package } from "lucide-react";
import API from "../api/axios";

const POLL_MS = 10_000;

function isTerminalStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  return s === "closed" || s === "cancelled";
}

export default function OrderStatus() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setError("Missing order");
      setLoading(false);
      return;
    }
    try {
      const { data } = await API.get(`/orders/${encodeURIComponent(orderId)}`, {
        skipCoalesce: true,
      });
      setOrder(data);
      setError(null);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) {
        setOrder(null);
        setError("notfound");
      } else {
        setError(e?.response?.data?.message || e?.message || "Could not load order");
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setOrder(null);
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!orderId || !order || isTerminalStatus(order.status)) return undefined;

    pollRef.current = window.setInterval(() => {
      loadOrder();
    }, POLL_MS);
    return () => {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [orderId, order?.status, loadOrder]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading your order…</p>
      </div>
    );
  }

  if (error === "notfound" || (!order && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-gray-500 text-center">We couldn&apos;t find this order. Check the link or ask staff for an updated QR.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-gray-600 text-center text-sm">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadOrder();
          }}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Try again
        </button>
      </div>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4 py-10">
      <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-2">Order Confirmed 🎉</h1>
        <p className="text-sm text-gray-500 mb-4">
          {order.table === TAKEAWAY_TABLE || !order.table ? "Takeaway" : `Table ${order.table}`}
        </p>

        <StatusBadge status={order.status} />

        <div className="mt-6 space-y-2 text-sm text-left">
          {items.length === 0 ? (
            <p className="text-center text-gray-400 text-sm">No line items on this order.</p>
          ) : (
            items.map((item, idx) => (
              <div
                key={item._id || item.id || `${item.name}-${idx}`}
                className={`flex justify-between p-2 rounded-lg ${
                  order.table !== TAKEAWAY_TABLE && item.isTakeaway ? "bg-orange-50 border border-orange-100" : ""
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold flex items-center gap-2">
                    {item.name} × {item.qty}
                    {order.table !== TAKEAWAY_TABLE && item.isTakeaway && (
                      <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[8px] font-black uppercase rounded flex items-center gap-1">
                        <Package size={8} /> TAKEAWAY
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-gray-400">₹{item.price} each</span>
                </div>
                <span className="font-mono">₹{(item.price || 0) * (item.qty || 0)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

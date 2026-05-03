import React from "react";
import { Clock, MapPin, Package, PlusCircle, ShoppingCart, User } from "lucide-react";
import { DELIVERY_TABLE, TAKEAWAY_TABLE } from "../../../context/CartContext";

export default function ExistingOrderPicker({
  isAddMoreMode,
  activeOrders,
  selectedExistingOrder,
  onEnterAddMoreMode,
  onCancelAddMore,
  onSelectExistingOrder,
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5 sm:p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Add to existing order</h2>
      {!isAddMoreMode ? (
        <button
          type="button"
          onClick={onEnterAddMoreMode}
          className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/80 px-3 py-4 text-xs font-bold uppercase text-zinc-800 transition-all hover:border-zinc-500 hover:bg-white"
        >
          <PlusCircle size={18} className="shrink-0" />
          <span className="text-center leading-snug">Add more items to an open order</span>
        </button>
      ) : (
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 flex-1 text-xs leading-snug text-zinc-600">
              Choose an active order:
            </p>
            <button
              type="button"
              onClick={onCancelAddMore}
              className="shrink-0 rounded-lg border border-zinc-200 px-2 py-1.5 text-[10px] font-bold uppercase text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <p className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs italic text-zinc-500">
              No active orders right now.
            </p>
          ) : (
            <div className="max-h-52 space-y-2 overflow-y-auto overflow-x-hidden rounded-xl border border-zinc-200 bg-zinc-50/50 p-2 sm:max-h-60">
              {activeOrders.map((order) => (
                <button
                  type="button"
                  key={order._id}
                  onClick={() => onSelectExistingOrder(order)}
                  className={`w-full min-w-0 rounded-xl border-2 p-3 text-left transition-all ${
                    selectedExistingOrder?._id === order._id
                      ? "border-zinc-900 bg-white shadow-sm"
                      : "border-transparent bg-white hover:border-zinc-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {order.table === DELIVERY_TABLE || order.table === "DELIVERY" ? (
                        <MapPin size={14} className="shrink-0 text-zinc-600" />
                      ) : order.table === TAKEAWAY_TABLE || order.table === "TAKEAWAY" || !order.table ? (
                        <ShoppingCart size={14} className="shrink-0 text-zinc-600" />
                      ) : (
                        <Package size={14} className="shrink-0 text-emerald-600" />
                      )}
                      <span className="truncate font-bold text-xs uppercase text-zinc-900">
                        {order.table === DELIVERY_TABLE || order.table === "DELIVERY"
                          ? "Delivery"
                          : order.table === TAKEAWAY_TABLE || order.table === "TAKEAWAY" || !order.table
                            ? "Takeaway"
                            : `Table ${order.table}`}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium tabular-nums text-zinc-400">
                      #{(order._id || "").slice(-5)}
                    </span>
                  </div>
                  {order.customerName && (
                    <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-zinc-600">
                      <User size={10} className="shrink-0" />
                      <span className="truncate">{order.customerName}</span>
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-1 text-[10px] text-zinc-500">
                    <Clock size={10} className="shrink-0" />
                    <span>{order.items?.length || 0} items</span>
                    <span className="text-zinc-300">·</span>
                    <span className="tabular-nums">₹{order.totalAmount?.toFixed(0) || 0}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedExistingOrder && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-900 p-3 text-xs text-white">
              <p className="font-bold text-zinc-300">Adding items to</p>
              <p className="mt-0.5 break-words font-semibold text-white">
                {selectedExistingOrder.customerName || "Order"} · #
                {(selectedExistingOrder._id || "").slice(-5)}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}


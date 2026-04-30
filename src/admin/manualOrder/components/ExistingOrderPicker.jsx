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
    <section className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Add to Existing Order</h2>
      {!isAddMoreMode ? (
        <button
          onClick={onEnterAddMoreMode}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-600 font-bold text-xs uppercase transition-all hover:border-indigo-500 hover:bg-indigo-100"
        >
          <PlusCircle size={18} /> Add More Items to Existing Order
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Select an active order to add items:</p>
            <button
              onClick={onCancelAddMore}
              className="px-2 py-1 border border-gray-200 text-[10px] font-bold uppercase hover:border-black transition-colors"
            >
              Cancel
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <p className="text-xs text-gray-400 italic p-3 bg-gray-50 border border-gray-100">No active orders found.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-100 p-2">
              {activeOrders.map((order) => (
                <button
                  key={order._id}
                  onClick={() => onSelectExistingOrder(order)}
                  className={`w-full text-left p-3 border-2 transition-all ${
                    selectedExistingOrder?._id === order._id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {order.table === DELIVERY_TABLE || order.table === "DELIVERY" ? (
                        <MapPin size={14} className="text-indigo-500" />
                      ) : order.table === TAKEAWAY_TABLE || order.table === "TAKEAWAY" || !order.table ? (
                        <ShoppingCart size={14} className="text-orange-500" />
                      ) : (
                        <Package size={14} className="text-emerald-500" />
                      )}
                      <span className="font-bold text-xs uppercase">
                        {order.table === DELIVERY_TABLE || order.table === "DELIVERY"
                          ? "Delivery"
                          : order.table === TAKEAWAY_TABLE || order.table === "TAKEAWAY" || !order.table
                            ? "Takeaway"
                            : `Table ${order.table}`}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400">#{(order._id || "").slice(-5)}</span>
                  </div>
                  {order.customerName && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <User size={10} /> {order.customerName}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                    <Clock size={10} /> {order.items?.length || 0} items • ₹{order.totalAmount?.toFixed(0) || 0}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedExistingOrder && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 text-xs">
              <p className="font-bold text-indigo-700">Adding items to:</p>
              <p className="text-indigo-600">
                {selectedExistingOrder.customerName || "Order"} #{(selectedExistingOrder._id || "").slice(-5)}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}


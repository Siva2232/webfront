import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Clock, MapPin, Package, ShoppingCart, User, X } from "lucide-react";
import { DELIVERY_TABLE, TAKEAWAY_TABLE } from "../../../context/CartContext";

export default function OrderConfirmModal({
  open,
  isSubmitting,
  isAddMoreMode,
  selectedExistingOrder,
  isDineIn,
  dineInTable,
  isDelivery,
  items,
  totalAmount,
  customerName,
  onClose,
  onSubmit,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !isSubmitting && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 ${isAddMoreMode ? "bg-indigo-500" : "bg-black"} text-white`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {isAddMoreMode ? "Confirm Add Items" : "Confirm Order"}
                </h3>
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {(() => {
                  let table;
                  if (isAddMoreMode && selectedExistingOrder) {
                    table = selectedExistingOrder.table;
                  } else if (isDineIn) {
                    table = dineInTable.trim();
                  } else {
                    table = isDelivery ? DELIVERY_TABLE : TAKEAWAY_TABLE;
                  }
                  const isDeliveryOrder = table === DELIVERY_TABLE || table === "DELIVERY";
                  const isTakeawayOrder = table === TAKEAWAY_TABLE || table === "TAKEAWAY" || !table;

                  return (
                    <>
                      {isDeliveryOrder ? (
                        <MapPin size={20} className="text-indigo-500" />
                      ) : isTakeawayOrder ? (
                        <ShoppingCart size={20} className="text-orange-500" />
                      ) : (
                        <Package size={20} className="text-emerald-500" />
                      )}
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Order Type</p>
                        <p className="font-bold">
                          {isDeliveryOrder ? "Delivery" : isTakeawayOrder ? "Takeaway" : `Dine-in • Table ${table}`}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {customerName && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <User size={20} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold">Customer</p>
                    <p className="font-bold">{customerName}</p>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 uppercase font-bold mb-2">Items ({items.length})</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {items.map((item, idx) => {
                    const addonsTotal = item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
                    const basePrice = item.price - addonsTotal;
                    return (
                      <div key={idx} className="text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {item.name} × {item.qty}
                          </span>
                          <span className="text-gray-500">₹{(item.price * item.qty).toFixed(0)}</span>
                        </div>
                        {item.selectedPortion && (
                          <span className="text-[10px] text-blue-600 font-bold ml-2">
                            Portion: {item.selectedPortion}
                          </span>
                        )}
                        {item.selectedAddons?.length > 0 && (
                          <div className="ml-2 space-y-0.5">
                            {item.selectedAddons.map((a, i) => (
                              <div key={i} className="flex justify-between text-[10px] text-emerald-600">
                                <span>+ {a.name}</span>
                                <span className="text-gray-400">₹{a.price}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {basePrice !== item.price && (
                          <div className="ml-2 text-[10px] text-gray-400">
                            Base: ₹{(basePrice * item.qty).toFixed(0)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-500 uppercase">Total</span>
                  <span className="text-2xl font-black">₹{totalAmount.toFixed(2)}</span>
                </div>
                {isAddMoreMode && selectedExistingOrder && (
                  <p className="text-xs text-indigo-600 mt-1 text-right">
                    New total: ₹{(totalAmount + (selectedExistingOrder.totalAmount || 0)).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 border-2 border-gray-200 font-bold uppercase text-sm hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className={`flex-1 px-6 py-3 text-white font-bold uppercase text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isAddMoreMode ? "bg-indigo-600 hover:bg-indigo-700" : "bg-black hover:bg-gray-800"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    {isAddMoreMode ? "Add Items" : "Place Order"}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


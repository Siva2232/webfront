import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { Printer, RefreshCw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../../../context/CartContext";

export default function BillDetailsCard({
  foundBill,
  customItems,
  removedCount,
  stats,
  onResetItems,
  onRequestRemoveItem,
  onOpenPrint,
}) {
  const isTA = foundBill && (foundBill.table === TAKEAWAY_TABLE || !foundBill.table);
  const isDelivery = foundBill && foundBill.table === DELIVERY_TABLE;

  return (
    <div className="space-y-8">
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600" />

        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-gradient-to-br from-slate-900 to-black rounded-2xl flex items-center justify-center text-white font-black text-3xl italic">
                {isDelivery ? "HD" : isTA ? "TA" : foundBill.table}
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">
                  {isDelivery ? "Delivery" : isTA ? "Takeaway" : `Table ${foundBill.table}`}
                </h3>
                <p className="text-sm text-slate-500 font-medium">#{(foundBill._id || "").slice(-8)}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Placed</p>
              <p className="text-sm font-medium">{format(new Date(foundBill.createdAt || Date.now()), "dd MMM • hh:mm a")}</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-500">ITEMIZED MANIFEST</h3>
              {removedCount > 0 && (
                <button
                  onClick={onResetItems}
                  className="text-xs font-black text-orange-600 hover:text-orange-700 flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> RESET ({removedCount})
                </button>
              )}
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {customItems.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-between items-start bg-slate-50 rounded-2xl p-4 group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="h-8 w-8 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm">
                          {item.qty}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">{item.name}</p>
                          {item.selectedPortion && (
                            <p className="text-xs text-blue-600 font-medium">({item.selectedPortion})</p>
                          )}
                        </div>
                      </div>

                      {item.selectedAddons?.length > 0 && (
                        <div className="ml-11 mt-2 space-y-0.5 text-xs text-slate-500">
                          {item.selectedAddons.map((a, i) => (
                            <div key={i}>+ {a.name}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">
                          ₹{(item.price * item.qty).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <button
                        onClick={() => onRequestRemoveItem(idx)}
                        className="p-2.5 text-rose-500 hover:bg-rose-100 rounded-xl transition-all opacity-70 hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl p-8 space-y-6">
            <div className="flex justify-between text-sm">
              <span className="opacity-75">Subtotal</span>
              <span>₹{stats.subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="opacity-75">GST (5%)</span>
              <span>₹{stats.tax.toLocaleString("en-IN")}</span>
            </div>

            <div className="border-t border-slate-700 pt-6 flex justify-between items-center text-xl font-black tracking-tighter">
              <span>Total Due</span>
              <span>₹{stats.grandTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!customItems.length) return toast.error("No items left");
              onOpenPrint();
            }}
            className="mt-8 w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-lg shadow-indigo-200 hover:shadow-xl transition-all flex items-center justify-center gap-3"
          >
            <Printer size={20} />
            Print Custom Split Bill
          </button>
        </div>
      </div>
    </div>
  );
}


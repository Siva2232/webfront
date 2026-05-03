import React from "react";
import { Calendar, ChefHat, MessageSquare, Plus, Printer } from "lucide-react";
import { format } from "date-fns";
import { DELIVERY_TABLE } from "../../../context/CartContext";
import { isTakeawayOrder } from "../utils/isTakeawayOrder";

export default function KitchenBillCard({ kb, colors, batchTotal, billTimestamp, onPrint }) {
  const isServed = kb.status === "Served";

  return (
    <div className={`relative group ${isServed ? "opacity-70" : ""}`}>
      <button
        onClick={onPrint}
        className="absolute -top-3 right-4 z-10 bg-white border border-slate-200 shadow px-4 py-1.5 rounded-xl hover:bg-slate-900 hover:text-white transition-all flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
      >
        <Printer size={13} /> Print
      </button>

      <div className={`bg-white border-2 ${colors.border} rounded-3xl overflow-hidden shadow-sm h-full flex flex-col`}>
        <div className={`p-4 text-center ${colors.bg} border-b ${colors.border}`}>
          <div className="flex justify-center mb-2">
            <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center">
              <ChefHat size={18} />
            </div>
          </div>
          <h2 className="font-bold text-lg tracking-tight">Kitchen Bill</h2>

          {kb.batchNumber > 1 ? (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-0.5 text-[10px] font-bold text-white">
              <Plus size={10} /> Batch #{kb.batchNumber}
            </div>
          ) : (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-zinc-200 px-3 py-0.5 text-[10px] font-bold text-zinc-800">
              Initial Order
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 border-b text-sm">
          <div className="p-3">
            <p className="text-[9px] text-slate-400 uppercase">Order Ref</p>
            <p className="font-mono font-semibold text-sm">#{(kb.orderRef || kb._id || "").slice(-8)}</p>
          </div>
          <div className="p-3 text-right border-l">
            <p className="text-[9px] text-slate-400 uppercase">{isTakeawayOrder(kb) ? "Type" : "Table"}</p>
            <p className="font-bold text-base">
              {isTakeawayOrder(kb) ? (kb.table === DELIVERY_TABLE ? "Delivery" : "Takeaway") : `TBL ${kb.table}`}
            </p>
          </div>
        </div>

        <div className="p-3 flex justify-between items-center border-b text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar size={15} />
            <span>{format(billTimestamp, "hh:mm a")}</span>
          </div>
          <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full ${colors.text} ${colors.bg} border ${colors.border}`}>
            {kb.status}
          </span>
        </div>

        <div className="p-4 space-y-3 flex-1">
          {kb.items?.map((item, idx) => {
            const addonsTotal = item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
            const basePrice = item.price - addonsTotal;
            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl text-sm ${
                  item.isTakeaway ? "bg-orange-50 border border-orange-100" : "bg-slate-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <p className="font-medium leading-tight">{item.name}</p>
                    {item.selectedPortion && <p className="text-xs text-zinc-600">({item.selectedPortion})</p>}
                  </div>
                  <p className="font-bold shrink-0">×{item.qty}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ₹{basePrice} × {item.qty}
                </p>

                {item.selectedAddons?.length > 0 && (
                  <div className="mt-2 text-xs text-emerald-700">
                    {item.selectedAddons.map((a, i) => (
                      <div key={i}>+ {a.name}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {kb.notes && (
          <div className="mx-4 mb-4 flex gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <MessageSquare size={16} className="mt-0.5 flex-shrink-0 text-zinc-600" />
            <p className="italic text-slate-700 leading-tight">"{kb.notes}"</p>
          </div>
        )}

        <div className="mx-4 mb-4 p-4 bg-slate-900 text-white rounded-3xl mt-auto">
          <div className="flex justify-between items-center">
            <span className="uppercase text-xs tracking-widest text-slate-400">Total</span>
            <span className="text-xl font-bold">₹{batchTotal.toLocaleString()}</span>
          </div>
        </div>

        <div className="text-center py-3 border-t text-[9px] text-slate-400 font-medium">KITCHEN COPY</div>
      </div>
    </div>
  );
}


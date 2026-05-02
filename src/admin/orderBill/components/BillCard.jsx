import React, { useMemo } from "react";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle,
  Hash,
  Package,
  Printer,
  Wallet,
} from "lucide-react";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../../../context/CartContext";
import { computeBillStats } from "../billUtils";

export const BillCard = React.memo(function BillCard({
  order,
  isClosed,
  isMarkedPaid,
  isClosing,
  onPrint,
  onClose,
  onMarkPaid,
}) {
  const {
    unpaidAmount: rawUnpaidAmount,
    hasUnpaidCod: rawHasUnpaidCod,
    allCodPaid: rawAllCodPaid,
  } = useMemo(() => computeBillStats(order), [order]);

  const isActuallyClosed = isClosed || order.status === "Closed";
  const unpaidAmount = isMarkedPaid || isActuallyClosed ? 0 : rawUnpaidAmount;
  const hasUnpaidCod = isMarkedPaid || isActuallyClosed ? false : rawHasUnpaidCod;
  const allCodPaid = isMarkedPaid || isActuallyClosed ? true : rawAllCodPaid;

  const ts = order.createdAt || order.billedAt;
  const orderTimestamp = ts ? new Date(ts) : new Date();
  const isTA = order.table === TAKEAWAY_TABLE || !order.table || order.table === "TAKEAWAY";
  const isDelivery = order.table === DELIVERY_TABLE || order.table === "DELIVERY";
  const billId = order._id || order.id;
  const orderId = order.orderRef || billId;

  return (
    <div className="relative group w-full">
      {/* Print Button */}
      <button
        onClick={() => onPrint(order)}
        className="absolute -top-3 right-4 z-10 bg-white border border-slate-200 shadow-sm px-4 py-1.5 rounded-2xl hover:bg-slate-900 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
      >
        <Printer size={13} /> Print
      </button>

      {/* Small Premium Card */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm h-full flex flex-col">
        
        {/* Top Info Bar */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Order Ref</p>
              <p className="font-mono font-bold text-sm text-slate-900">
                #{(orderId || "").slice(-8)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Placed</p>
              <p className="text-xs font-medium text-slate-700">
                {format(orderTimestamp, "dd MMM • hh:mm")}
              </p>
            </div>
          </div>

          {/* Order Type / Table */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isTA || isDelivery ? (
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-rose-500" />
                  <span className="font-semibold text-base">
                    {isDelivery ? "Delivery" : "Takeaway"}
                  </span>
                </div>
              ) : (
                <span className="font-semibold text-base">Table {order.table}</span>
              )}
            </div>

            {isTA && order.tokenNumber && (
              <div className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-xl">
                Token #{order.tokenNumber}
              </div>
            )}
          </div>
        </div>

        {/* Items - Compact */}
        <div className="p-4 flex-1 space-y-2.5 text-sm">
          {order.items?.slice(0, 3).map((item, idx) => {
            const addonsTotal = item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
            const basePrice = item.price - addonsTotal;
            return (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex-1 pr-3">
                  <p className="font-medium leading-tight line-clamp-1">{item.name}</p>
                  {item.selectedPortion && (
                    <p className="text-xs text-blue-600">({item.selectedPortion})</p>
                  )}
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="font-bold">×{item.qty}</span>
                  <span className="ml-2 text-slate-600">₹{(basePrice * item.qty).toLocaleString()}</span>
                </div>
              </div>
            );
          })}

          {order.items?.length > 3 && (
            <p className="text-center text-xs text-slate-400 pt-1">
              +{order.items.length - 3} more items
            </p>
          )}
        </div>

        {/* Total Section */}
        <div className="mx-4 mb-4 p-4 bg-slate-900 text-white rounded-2xl mt-auto">
          <div className="flex justify-between items-center">
            <span className="uppercase text-xs tracking-widest text-slate-400">Total Due</span>
            <span className="text-2xl font-bold tracking-tight">
              ₹{unpaidAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-5">
          {isActuallyClosed ? (
            <div className="text-center py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
              <CheckCircle size={18} /> Closed
            </div>
          ) : (
            <div className="space-y-2">
              {hasUnpaidCod && (
                <button
                  onClick={() =>
                    onMarkPaid({
                      billId: order._id || order.id,
                      orderRef: order.orderRef || order._id || order.id,
                      amount: unpaidAmount,
                    })
                  }
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Wallet size={17} /> Mark Paid • ₹
                  {unpaidAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </button>
              )}

              <button
                onClick={() => onClose(order)}
                disabled={isClosing || hasUnpaidCod}
                className={`w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] ${
                  hasUnpaidCod
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-rose-500 hover:bg-rose-600 text-white"
                }`}
              >
                {order.table === TAKEAWAY_TABLE || !order.table
                  ? "Close Bill"
                  : "Close & Free Table"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
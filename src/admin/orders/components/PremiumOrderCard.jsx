import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle,
  Clock,
  CreditCard,
  Flame,
  MessageSquare,
  Package,
  Timer,
} from "lucide-react";
import { DELIVERY_TABLE } from "../../../context/CartContext";
import { isTakeawayOrder } from "../utils/isTakeawayOrder";
import { gradientMap, normalizeStatus, statusStep } from "../utils/orderStatus";
import OrderCardStatusModals from "./OrderCardStatusModals";
import {
  computeGstFromSubtotal,
  GST_TOTAL_PCT_LABEL,
} from "../../../utils/gstRates";

export default function PremiumOrderCard({ order, updateOrderStatus, isCompleted }) {
  const [timeAgo, setTimeAgo] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confirmedStatus, setConfirmedStatus] = useState("");

  // Billing Logic
  const subtotal = useMemo(
    () => order.items.reduce((acc, item) => acc + item.price * item.qty, 0),
    [order.items]
  );
  const computedGst = computeGstFromSubtotal(subtotal);
  const cgst = order.billDetails?.cgst ?? computedGst.cgst;
  const sgst = order.billDetails?.sgst ?? computedGst.sgst;
  const grandTotal = order.billDetails?.grandTotal ?? computedGst.grandTotal;

  const status = order.status;
  const statusKey = normalizeStatus(status);
  const currentStep = statusStep[statusKey] || 1;
  const gradient = gradientMap[statusKey] || "from-slate-400 to-slate-600";

  useEffect(() => {
    const formatElapsed = () => {
      const diffMs = Date.now() - new Date(order.createdAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const hours = Math.floor(diffMins / 60);
      if (hours < 24) return `${hours} hr ago`;
      const days = Math.floor(hours / 24);
      return days === 1 ? "1 day ago" : `${days} days ago`;
    };
    const update = () => setTimeAgo(formatElapsed());
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  return (
    <div
      className={`relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 shadow-sm transition-all ${
        isCompleted ? "scale-[0.98]" : ""
      }`}
    >
      {!isCompleted && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-50">
          <div
            className={`h-full bg-gradient-to-r ${gradient} transition-all duration-300`}
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      )}

      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-5">
            <div
              className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-2xl italic shadow-lg`}
            >
              {order.table === DELIVERY_TABLE ? "HD" : "TA"}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {isTakeawayOrder(order) ? (order.table === DELIVERY_TABLE ? "Delivery" : "Takeaway") : `Table ${order.table}`}
                {order.hasTakeaway && !isTakeawayOrder(order) && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider rounded-full">
                    <Package size={10} /> + Takeaway
                  </span>
                )}
              </h3>
              {order.customerName && <p className="text-sm font-medium text-slate-600">{order.customerName}</p>}
              {order.customerAddress && <p className="text-sm text-slate-500 italic">{order.customerAddress}</p>}
              {order.deliveryTime && (
                <p className="text-sm font-black text-rose-500 uppercase tracking-tighter mt-1">
                  Delivery Time: {order.deliveryTime}
                </p>
              )}
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Timer size={12} /> {timeAgo} • #{(order._id || order.id || "").slice(-5)}
                {(order.paymentMethod === "online" || order.paymentStatus === "paid") && (
                  <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded-full">
                    <CreditCard size={10} /> PAID
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {order.items.map((item, idx) => {
              const isNewlyAdded =
                item.isNewItem || (item.addedAt && Date.now() - new Date(item.addedAt).getTime() < 30 * 60 * 1000);
              const isTakeawayItem = item.isTakeaway;
              const isDineWithTA = !isTakeawayOrder(order) && isTakeawayItem;
              return (
                <div
                  key={idx}
                  className={`${isNewlyAdded ? "bg-emerald-50 -mx-2 px-2 py-1 rounded-xl border border-emerald-100" : ""} ${
                    isDineWithTA && !isNewlyAdded
                      ? "bg-orange-50 -mx-2 px-2 py-1 rounded-xl border border-orange-100"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <span className="h-7 w-7 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px] font-black italic shrink-0 mt-0.5">
                        {item.qty}
                      </span>
                      <div>
                        <span className="font-bold text-slate-700">{item.name}</span>
                        {item.selectedPortion && (
                          <span className="ml-1.5 text-[10px] font-bold text-blue-600">({item.selectedPortion})</span>
                        )}
                        {isNewlyAdded && (
                          <span className="ml-1.5 px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider rounded-full animate-pulse">
                            NEW
                          </span>
                        )}
                        {!isTakeawayOrder(order) && isTakeawayItem && (
                          <span className="ml-1.5 px-2 py-0.5 bg-orange-500 text-white text-[8px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 inline-flex">
                            <Package size={8} /> TAKEAWAY
                          </span>
                        )}
                        {(() => {
                          const addonsTotal =
                            item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
                          const basePrice = item.price - addonsTotal;
                          return (
                            <span className="block text-[9px] text-slate-400 font-bold italic mt-0.5">
                              {item.qty} × ₹{basePrice}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    {(() => {
                      const addonsTotal =
                        item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
                      const basePrice = item.price - addonsTotal;
                      return (
                        <span className="text-slate-400 font-bold italic text-sm shrink-0">
                          ₹{(basePrice * item.qty).toLocaleString()}
                        </span>
                      );
                    })()}
                  </div>
                  {item.selectedAddons?.length > 0 && (
                    <div className="ml-10 mt-1 space-y-0.5 border-l-2 border-emerald-200 pl-2">
                      {item.selectedAddons.map((a, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-emerald-600">+ {a.name}</span>
                          <span className="text-[9px] font-bold text-slate-400">₹{(a.price || 0) * item.qty}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-200">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Item Total</span>
                        <span className="text-xs font-black italic text-slate-700">
                          ₹{(item.price * item.qty).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {order.notes && (
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex gap-3 items-start">
              <MessageSquare size={16} className="text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-wider mb-1">Kitchen Request</p>
                <p className="text-sm font-bold text-slate-700 leading-tight italic">"{order.notes}"</p>
              </div>
            </div>
          )}
        </div>

        <div className="w-full md:w-48 flex flex-col justify-center border-l border-slate-50 md:pl-8 space-y-2">
          <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
            <span>Items</span>
            <span>₹{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
            <span>GST ({GST_TOTAL_PCT_LABEL})</span>
            <span>₹{(cgst + sgst).toLocaleString()}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Total Bill</span>
            <span className="text-lg font-black text-slate-900 italic">₹{grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {!isCompleted && (
          <div className="w-full md:w-56 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center italic">
              Move Status
            </p>
            <div className="flex flex-col gap-2">
              {["New", "Preparing", "Ready", "Served"].map((s) => {
                const statusOrder = { New: 0, Preparing: 1, Ready: 2, Served: 3 };
                // Backend sometimes sends "Pending" for fresh orders; treat it same as "New"
                const currentStatusLabel = statusKey === "pending" ? "New" : status;
                const currentStatusLevel = statusOrder[currentStatusLabel] ?? -1;
                const buttonStatusLevel = statusOrder[s] ?? -1;
                const isCurrentStatus = s === currentStatusLabel;
                const canclick = buttonStatusLevel > currentStatusLevel;

                return (
                  <button
                    key={s}
                    onClick={() => {
                      if (canclick) {
                        setSelectedStatus(s);
                        setIsModalOpen(true);
                      }
                    }}
                    disabled={!canclick}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                      isCurrentStatus
                        ? "bg-slate-900 text-white shadow-lg cursor-default"
                        : canclick
                          ? "bg-white text-slate-500 hover:bg-slate-900 hover:text-white border border-slate-100 cursor-pointer"
                          : "bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <OrderCardStatusModals
          openConfirm={isModalOpen}
          openSuccess={showSuccessModal}
          order={order}
          currentStatus={status}
          selectedStatus={selectedStatus}
          confirmedStatus={confirmedStatus}
          onCancelConfirm={() => setIsModalOpen(false)}
          onConfirmStatus={() => {
            updateOrderStatus(order._id || order.id, selectedStatus);
            setConfirmedStatus(selectedStatus);
            setIsModalOpen(false);
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 2000);
          }}
          onCloseSuccess={() => setShowSuccessModal(false)}
        />

        {isCompleted && (
          <div className="flex flex-col justify-center items-center px-8 text-emerald-500">
            <CheckCircle size={32} />
            <span className="text-[10px] font-black uppercase mt-2">Served</span>
          </div>
        )}
      </div>
    </div>
  );
}


import React, { useEffect, useState } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { 
  ChevronLeft, 
  Receipt, 
  Printer, 
  Calendar, 
  MapPin, 
  Phone,
  Scissors,
  Hash,
  Star,
  Package,
  CreditCard,
  CheckCircle,
  Wallet,
  AlertCircle
} from "lucide-react";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../context/CartContext";

export default function OrderBill() {
  const { bills, fetchBills, markBillPaid, isLoading } = useOrders();
  const navigate = useNavigate();
  
  // State for mark paid confirmation modal
  const [markPaidModal, setMarkPaidModal] = useState(null); // { billId, amount }
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  // Fetch bills on mount
  useEffect(() => {
    fetchBills();
  }, []);
  
  // Handle confirm mark paid
  const handleConfirmMarkPaid = async () => {
    if (!markPaidModal || isMarkingPaid) return;
    setIsMarkingPaid(true);
    try {
      await markBillPaid(markPaidModal.billId);
      toast.success(`₹${markPaidModal.amount.toLocaleString()} collected successfully!`, {
        icon: <CheckCircle size={18} className="text-emerald-500" />,
        duration: 3000,
      });
      fetchBills();
      setMarkPaidModal(null);
    } catch (err) {
      console.error("markBillPaid error", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to mark paid";
      toast.error(msg);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  // deduplicate by _id or id to prevent double rendering
  const uniqueBills = React.useMemo(() => {
    const seen = new Set();
    return bills.filter(b => {
      // prefer orderRef to collapse auto+manual entries, fallback to id
      const key = b.orderRef || b._id || b.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [bills]);

  // Isolated Print Logic
  const handlePrintSingle = (orderId) => {
    const printContent = document.getElementById(`bill-${orderId}`);
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.outerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); 
  };


  if (!uniqueBills || uniqueBills.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-[#F4F4F5]">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
          <Receipt size={32} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tighter uppercase">No Records</h2>
        <p className="text-slate-500 text-xs mb-8 uppercase tracking-widest font-bold">Clear of active invoices</p>
        <button onClick={() => navigate(-1)} className="text-[10px] font-black text-indigo-600 border-b-2 border-indigo-600 pb-1 uppercase tracking-widest">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-mono relative">
      {/* Premium Header */}
      <header className="top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 no-print">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Merchant Terminal</p>
            <h1 className="text-xs font-black uppercase tracking-widest">Invoices</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {uniqueBills.map((order, index) => {
          // Use billDetails if available (accurate after Add More Items), otherwise calculate
          const subtotal = order.billDetails?.subtotal ?? order.items?.reduce((sum, i) => sum + (i.price * i.qty), 0) ?? 0;
          const tax = order.billDetails?.cgst && order.billDetails?.sgst 
            ? (order.billDetails.cgst + order.billDetails.sgst) 
            : subtotal * 0.05;
          const grandTotal = order.billDetails?.grandTotal ?? (subtotal + tax);
          const orderTimestamp = order.createdAt ? new Date(order.createdAt) : new Date();

          // prepare payment summary values once so header/footer stay in sync
          const sessions = order.paymentSessions || [];
          const paidAmount = sessions
            .filter(s => ['paid', 'succeeded', 'success'].includes(s.status?.toLowerCase()))
            .reduce((acc, s) => acc + (s.amount || 0), 0);
          const unpaidAmount = Math.max(0, (order.totalAmount || 0) - paidAmount);
          const onlineSessions = sessions.filter(s => s.method === 'online');
          const allOnlinePaid = onlineSessions.length > 0 && onlineSessions.every(s => ['paid', 'succeeded', 'success'].includes(s.status?.toLowerCase()));
          // any unpaid cod session regardless of original paymentMethod
          const hasUnpaidCod = unpaidAmount > 0 && sessions.some(s => s.method === 'cod');
          const allCodPaid = sessions.some(s => s.method === 'cod') && unpaidAmount <= 0;

          return (
            <div 
              key={order._id || order.id || index}
              className="relative group w-full"
            >
              {/* Floating Print Trigger */}
              <button 
                onClick={() => handlePrintSingle(order._id || order.id || index)}
                className="absolute -top-5 right-6 z-10 no-print bg-white border border-slate-200 shadow-xl px-5 py-2.5 rounded-full hover:bg-slate-900 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <Printer size={12} /> Print Receipt
              </button>

              {/* Premium Receipt Canvas */}
              <div 
                id={`bill-${order._id || order.id || index}`}
                className="bg-white text-slate-900 border border-slate-200 relative overflow-hidden print:border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]"
              >
                {/* Branding Section */}
                <div className="p-10 text-center relative overflow-hidden border-b-4 border-double border-slate-100">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-[0.03] pointer-events-none">
                    <Receipt size={120} />
                  </div>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-full mb-4">
                    <Star size={20} fill="white" />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 italic">My<span className="text-indigo-600">Cafe</span></h2>
                  <div className="flex flex-col items-center text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] gap-1">
                    <span className="flex items-center gap-1"><MapPin size={8} /> 01 SKYLINE DRIVE, BUSINESS DISTRICT</span>
                    <span className="flex items-center gap-1"><Phone size={8} /> +91 0000 000 000</span>
                  </div>
                  
                  {/* Payment Summary */}
                  <div className="mt-4 flex flex-col items-center gap-1.5">
                    {order.paymentSessions && order.paymentSessions.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-2">
                        {/* show status pills based on precomputed amounts */}
                        {allOnlinePaid && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 shadow-sm">
                            <CheckCircle size={10} className="text-emerald-600" />
                            <span className="text-[9px] font-black uppercase tracking-wider italic">Online Paid</span>
                          </div>
                        )}
                        {hasUnpaidCod && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-full border border-rose-200 animate-pulse">
                            <Wallet size={10} className="text-rose-600" />
                            <span className="text-[9px] font-black uppercase tracking-wider italic">Collect Cash</span>
                          </div>
                        )}
                        {!hasUnpaidCod && allCodPaid && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 shadow-sm">
                            <CheckCircle size={10} className="text-emerald-600" />
                            <span className="text-[9px] font-black uppercase tracking-wider italic">Cash Paid</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${order.paymentMethod === 'online' || order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                        {order.paymentMethod === 'online' || order.paymentStatus === 'paid' ? <CheckCircle size={12} /> : <Wallet size={12} />}
                        <span className="text-[9px] font-black uppercase tracking-wider">{order.paymentMethod === 'online' || order.paymentStatus === 'paid' ? 'Online Paid' : 'Cash Pending'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Meta Grid */}
                {(() => {
                  // treat blank table same as TAKEAWAY_TABLE (older orders might
                  // have been saved incorrectly).  Conditionally render a smaller
                  // block for takeaway so the word "Takeaway" doesn't appear twice
                  const isTA = order.table === TAKEAWAY_TABLE || !order.table || order.table === "TAKEAWAY";
                  const isDelivery = order.table === DELIVERY_TABLE || order.table === "DELIVERY";
                  if (isTA || isDelivery) {
                    // keep two‑column layout but show order type right side
                    return (
                      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                        <div className="p-6 space-y-1">
                          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                            <Hash size={8}/> Order Ref
                          </p>
                          <p className="text-[10px] font-black text-slate-900 uppercase">
                            #{(order._id || order.id || '').slice(-10)}
                          </p>
                        </div>
                        <div className="p-6 text-right space-y-1">
                          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                            Order Type
                          </p>
                          <p className="text-xl font-black italic text-slate-900 leading-none">
                            {isDelivery ? "Delivery" : "Takeaway"}
                          </p>
                          {isDelivery && order.deliveryTime && (
                             <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-2">
                               EST. TIME: {order.deliveryTime}
                             </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                      <div className="p-6 space-y-1">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1"><Hash size={8}/> Order Ref</p>
                        <p className="text-[10px] font-black text-slate-900 uppercase">#{(order._id || order.id || '').slice(-10)}</p>
                      </div>
                      <div className="p-6 text-right space-y-1">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                          Location
                        </p>
                        <p className="text-xl font-black italic text-slate-900 leading-none">
                          TBL-{order.table}
                        </p>
                        {/* Show combined dine-in + takeaway indicator */}
                        {order.hasTakeaway && (
                          <p className="text-[9px] font-black text-orange-500 uppercase tracking-wider mt-1 flex items-center justify-end gap-1">
                            <Package size={10} /> + Takeaway
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* PLACED DATE & TIME (Fixed Bug) */}
                <div className="px-6 py-3 bg-slate-50/50 flex justify-between items-center border-b border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={10} /> Placed At
                  </span>
                  <span className="text-[10px] font-black text-slate-800">
                    {format(orderTimestamp, "dd/MM/yyyy • hh:mm a")}
                  </span>
                </div>

                {/* Delivery Info Section - Only for delivery orders */}
                {(order.table === DELIVERY_TABLE || order.table === "DELIVERY") && (
                  <div className="px-6 py-4 bg-rose-50/50 border-b border-rose-100 space-y-2">
                    {order.customerName && (
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Customer</span>
                        <span className="text-[10px] font-black text-slate-800">{order.customerName}</span>
                      </div>
                    )}
                    {order.customerAddress && (
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Address</span>
                        <span className="text-[10px] font-bold text-slate-700 text-right max-w-[60%]">{order.customerAddress}</span>
                      </div>
                    )}
                    {order.deliveryTime && (
                      <div className="flex justify-between items-center pt-2 border-t border-rose-100">
                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Delivery Time</span>
                        <span className="text-sm font-black text-rose-600 italic">{order.deliveryTime}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Items Manifest */}
                <div className="p-8 space-y-6">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] text-center mb-2 underline underline-offset-8 decoration-slate-100">Itemized Manifest</p>
                  {order.items?.map((item, idx) => (
                    <div key={idx} className={`flex justify-between items-start group ${item.isTakeaway ? 'bg-orange-50 -mx-2 px-2 py-2 rounded-lg border border-orange-100' : ''}`}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-tight text-slate-800 group-hover:text-indigo-600 transition-colors">{item.name}</span>
                          {item.isTakeaway && (
                            <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[7px] font-black uppercase rounded flex items-center gap-0.5">
                              <Package size={8} /> T/A
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter italic">{item.qty} units @ ₹{item.price}</span>
                      </div>
                      <span className="text-xs font-black italic text-slate-900">₹{(item.price * item.qty).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Financial Summary - Dark Premium Card */}
                {/* Financial Summary - Premium White Card */}
<div className="mx-6 mb-8 p-6 bg-white rounded-[2rem] text-slate-900 space-y-3 border border-slate-100 shadow-xl shadow-slate-200/50">
  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
    <span>Subtotal</span>
    <span className="text-slate-900 font-black">₹{subtotal.toLocaleString()}</span>
  </div>
  
  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
    <span>Tax (GST 5%)</span>
    <span className="text-slate-900 font-black">₹{tax.toLocaleString()}</span>
  </div>
  
  <div className="flex justify-between items-center pt-1">
    <div className="flex flex-col gap-1 w-full">
      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 leading-none">Total Summary</span>
      
      {order.paymentSessions && order.paymentSessions.length > 0 ? (
        <div className="mt-2 space-y-1 bg-slate-50 p-3 rounded-2xl border border-dotted border-slate-200">
          {order.paymentSessions.map((session, sidx) => {
            const isSuccessfullyPaid = ['paid', 'succeeded', 'success'].includes(session.status?.toLowerCase());
            const isOnline = session.method === 'online';

            return (
              <div key={sidx} className="flex justify-between text-[9px] font-black italic">
                <span className={`uppercase flex items-center gap-1 ${isSuccessfullyPaid ? "text-emerald-600" : "text-slate-500"}`}>
                  {isOnline ? <CheckCircle size={8}/> : <Wallet size={8}/>}
                  {session.method} 
                  {isSuccessfullyPaid ? (
                    <span className="text-emerald-500 ml-1 font-black">✓ PAID</span>
                  ) : (
                    <span className="text-rose-500 ml-1">⚠️ DUE</span>
                  )}
                </span>
                <span className={isSuccessfullyPaid ? "text-emerald-600" : "text-rose-600"}>
                  ₹{session.amount.toLocaleString()}
                </span>
              </div>
            );
          })}
          
          {(() => {
            // rely on previously computed unpaidAmount variable and pay type
            if (unpaidAmount <= 0 || !hasUnpaidCod) return null;

            return (
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-black text-xs uppercase transition-all gap-2">
                <span className="text-rose-600">Total Unpaid (Collect Cash)</span>
                <span className="text-rose-600 animate-pulse">
                  ₹{unpaidAmount.toLocaleString()}
                </span>
                <button
                  onClick={() => setMarkPaidModal({ billId: order._id || order.id, amount: unpaidAmount })}
                  disabled={isMarkingPaid}
                  className="ml-auto px-3 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark Paid
                </button>
              </div>
            );
          })()}
        </div>
      ) : (
        <span className="text-3xl font-black tracking-tighter italic text-slate-900 whitespace-nowrap flex-shrink-0 overflow-x-auto mt-2">
          ₹{grandTotal.toLocaleString()}
        </span>
      )}
    </div>
    
    {!order.paymentSessions && (
      <span className="text-3xl font-black tracking-tighter italic text-slate-900 whitespace-nowrap flex-shrink-0 overflow-x-auto transition-all">
        ₹{grandTotal.toLocaleString()}
      </span>
    )}
  </div>
</div>
                {/* Footer Section */}
                <div className="p-10 text-center border-t border-dashed border-slate-200 bg-slate-50/30">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.6em] mb-4">Official Receipt</p>
                  <div className="flex items-center justify-center gap-2 no-print">
                    <div className="h-px w-8 bg-slate-200" />
                    <Scissors size={12} className="text-slate-200" />
                    <div className="h-px w-8 bg-slate-200" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* Mark Paid Confirmation Modal */}
      <AnimatePresence>
        {markPaidModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isMarkingPaid && setMarkPaidModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mx-auto mb-4">
                <AlertCircle size={28} className="text-amber-600" />
              </div>
              <h3 className="text-lg font-black text-center text-slate-900 mb-2">Confirm Cash Collection</h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                Collect <span className="font-bold text-slate-900">₹{markPaidModal.amount.toLocaleString()}</span> cash from customer?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMarkPaidModal(null)}
                  disabled={isMarkingPaid}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMarkPaid}
                  disabled={isMarkingPaid}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isMarkingPaid ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
          div[id^="bill-"] {
            page-break-after: always;
            width: 80mm; 
            margin: 0 auto !important;
            padding: 5mm !important;
          }
        }
      `}</style>
    </div>
  );
}
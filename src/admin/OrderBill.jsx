import React, { useEffect, useState } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
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
  AlertCircle,
  User
} from "lucide-react";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../context/CartContext";
import { CASHIERS } from "../constants";

export default function OrderBill() {
  const { bills, fetchBills, markBillPaid, updateOrderStatus, isLoading } = useOrders();
  const navigate = useNavigate();
  const [closingBillId, setClosingBillId] = useState(null);
  
  // State for mark paid confirmation modal
  const [markPaidModal, setMarkPaidModal] = useState(null); // { billId, amount }
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  // State for print cashier selection modal
  const [printModalOrder, setPrintModalOrder] = useState(null);
  const [selectedCashier, setSelectedCashier] = useState(null);

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
      setMarkPaidModal(null);
    } catch (err) {
      console.error("markBillPaid error", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to mark paid";
      toast.error(msg);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  // Track which bills have been closed so the button stays disabled permanently
  const [closedBillIds, setClosedBillIds] = useState(new Set());

  const handleCloseBill = async (order) => {
    const orderId = order.orderRef || order._id || order.id;
    if (!orderId || closingBillId || closedBillIds.has(orderId)) return;
    
    setClosingBillId(orderId);
    try {
      await updateOrderStatus(orderId, "Closed");
      toast.success("Order closed & table freed!");
      setClosedBillIds(prev => new Set(prev).add(orderId));
    } catch (err) {
      console.error("close bill error", err);
      toast.error("Failed to close bill");
    } finally {
      setClosingBillId(null);
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

  // Isolated Print Logic - Enhanced Receipt Print
 const handlePrintSingle = (order, cashierName = "N/A") => {
  const printWindow = window.open("", "_blank");

  const subtotal = order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const generateLine = (left, right, width = 32) => {
    const space = width - (left.length + right.length);
    return left + " ".repeat(space > 0 ? space : 1) + right;
  };

  const generateItemLine = (name, qty, price) => {
    const nameWidth = 18;
    const qtyWidth = 4;
    const priceWidth = 10;

    const itemName = name.length > nameWidth 
      ? name.substring(0, nameWidth) 
      : name;

    return (
      itemName.padEnd(nameWidth) +
      qty.toString().padStart(qtyWidth) +
      price.toFixed(2).padStart(priceWidth)
    );
  };

  const itemsText = order.items.map(item => {
    const addonsTotal = item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
    const basePrice = item.price - addonsTotal;
    let line = generateItemLine(item.name, item.qty, basePrice * item.qty);
    if (item.selectedPortion) {
      line += "\n  Portion: " + item.selectedPortion;
    }
    if (item.selectedAddons?.length > 0) {
      item.selectedAddons.forEach(a => {
        const addonLine = "  + " + a.name;
        const addonPrice = "Rs." + ((a.price || 0) * item.qty).toFixed(2);
        line += "\n" + addonLine.padEnd(22) + addonPrice.padStart(10);
      });
      line += "\n  " + "-".repeat(28);
      line += "\n  " + "Item Total".padEnd(18) + ("Rs." + (item.price * item.qty).toFixed(2)).padStart(12);
    }
    return line;
  }).join("\n");

  const html = `
  <html>
  <head>
    <style>
      @page { 
        size: 80mm auto; 
        margin: 0; 
      }

      body {
        font-family: 'Courier New', Courier, monospace;
        white-space: pre;
        font-size: 13px;
        width: 80mm;
        margin: 0;
        padding: 5mm;
        box-sizing: border-box;
      }

      .header {
        text-align: center;
        font-weight: bold;
        margin-bottom: 2mm;
      }

      .line {
        border-bottom: 1px dashed #000;
        margin: 2mm 0;
      }

      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .bold { font-weight: bold; }
    </style>
  </head>
  <body>

<div class="header">
MY CAFE
01 SKYLINE DRIVE, BUSINESS DISTRICT
+91 0000 000 000
GST: 18AABCT1234H1Z0
</div>

<div class="text-center bold">${order.paymentStatus === 'paid' ? "PAID" : "Collect Cash"}</div>
<div class="text-center">Cashier: ${cashierName}</div>
<div class="line"></div>

${generateLine("Order Ref", "#" + (order._id || "").slice(-6))}
${generateLine("Location", order.table === TAKEAWAY_TABLE ? "TAKEAWAY" : "TBL-" + order.table)}
${generateLine("Placed At", format(new Date(order.createdAt), "dd/MM/yyyy • hh:mm a"))}

<div class="line"></div>
<div class="bold">Itemized Manifest</div>
<div class="line"></div>
${itemsText}

<div class="line"></div>
${generateLine("Subtotal", "Rs." + subtotal.toFixed(2))}
${generateLine("Tax (GST 5%)", "Rs." + tax.toFixed(2))}

<div class="line"></div>
<div class="bold">Total Summary</div>
${generateLine("Method", order.paymentMethod?.toUpperCase() || "COD")}
<div class="bold text-center">${order.paymentStatus === 'paid' ? "✔ COMPLETED" : "⚠️ DUE"}</div>
${generateLine("Total", "Rs." + total.toFixed(2))}
<div class="line"></div>

${order.paymentStatus === 'paid' ? `
<div class="text-center bold">
PAID IN FULL
Rs.${total.toFixed(2)}
</div>
` : `
<div class="text-center bold">
Total Unpaid (Collect Cash)
Rs.${total.toFixed(2)}
</div>
`}

<div class="line"></div>
<div class="text-center bold">${order.paymentStatus === 'paid' ? "Payment Confirmed" : "Mark Paid"}</div>
<div class="text-center">Official Receipt</div>
<div class="text-center">THANK YOU</div>

  <script>
    window.print();
    window.onafterprint = () => window.close();
  </script>

  </body>
  </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
  // Handle print button - show cashier selection modal
  const handlePrintClick = (order) => {
    setPrintModalOrder(order);
    setSelectedCashier(null);
  };

  // Handle confirm print
  const handleConfirmPrint = () => {
    if (!printModalOrder || !selectedCashier) {
      toast.error("Please select a cashier");
      return;
    }
    const cashierName = CASHIERS.find(c => c.id === selectedCashier)?.name || "N/A";
    handlePrintSingle(printModalOrder, cashierName);
    setPrintModalOrder(null);
    setSelectedCashier(null);
  };


  // Show loading skeleton while fetching
  if (isLoading && uniqueBills.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F4F5]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading invoices...</p>
      </div>
    );
  }

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
      {/* Header - Unchanged */}
      <header className="top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Merchant Terminal</p>
            <h1 className="text-lg font-black tracking-tighter">INVOICES</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Main Grid - Now supports 5 columns on large screens */}
      <main className="max-w-[1600px] mx-auto p-6 pt-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {uniqueBills.map((order, index) => {
            const subtotal = order.billDetails?.subtotal ?? order.items?.reduce((sum, i) => sum + (i.price * i.qty), 0) ?? 0;
            const tax = order.billDetails?.cgst && order.billDetails?.sgst 
              ? (order.billDetails.cgst + order.billDetails.sgst) 
              : subtotal * 0.05;
            const grandTotal = order.billDetails?.grandTotal ?? (subtotal + tax);
            const orderTimestamp = order.createdAt ? new Date(order.createdAt) : new Date();

            const sessions = order.paymentSessions || [];
            const paidAmount = sessions
              .filter(s => ['paid', 'succeeded', 'success'].includes(s.status?.toLowerCase()))
              .reduce((acc, s) => acc + (s.amount || 0), 0);
            const unpaidAmount = Math.max(0, (order.totalAmount || 0) - paidAmount);
            const onlineSessions = sessions.filter(s => s.method === 'online');
            const allOnlinePaid = onlineSessions.length > 0 && onlineSessions.every(s => ['paid', 'succeeded', 'success'].includes(s.status?.toLowerCase()));
            const hasUnpaidCod = unpaidAmount > 0 && sessions.some(s => s.method === 'cod');
            const allCodPaid = sessions.some(s => s.method === 'cod') && unpaidAmount <= 0;

            const isClosed = order.status === "Closed" || closedBillIds.has(order.orderRef || order._id || order.id);
            const isTA = order.table === TAKEAWAY_TABLE || !order.table || order.table === "TAKEAWAY";
            const isDelivery = order.table === DELIVERY_TABLE || order.table === "DELIVERY";

            return (
              <div key={order._id || order.id || index} className="relative group">
                {/* Print Button */}
                <button 
                  onClick={() => handlePrintClick(order)}
                  className="absolute -top-4 right-4 z-20 no-print bg-white border border-slate-300 shadow-lg px-5 py-2 rounded-2xl hover:bg-slate-900 hover:text-white transition-all duration-300 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                  <Printer size={14} /> PRINT
                </button>

                {/* Modern Square Bill Card */}
                <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                  
                  {/* Top Branding Bar */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 text-center relative">
                    <div className="inline-flex items-center justify-center w-11 h-11 bg-white/10 rounded-2xl mb-4">
                      <Star size={22} fill="white" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tighter">My<span className="text-amber-400">Cafe</span></h2>
                    <p className="text-[10px] text-slate-400 mt-1">EST. 2023 • GST: 18AABCT1234H1Z0</p>

                    {/* Status Badge */}
                    <div className="absolute top-6 right-6">
                      {order.paymentStatus === 'paid' || allOnlinePaid || allCodPaid ? (
                        <div className="px-4 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-2xl flex items-center gap-1.5">
                          <CheckCircle size={13} /> PAID
                        </div>
                      ) : (
                        <div className="px-4 py-1 bg-rose-500 text-white text-[10px] font-black rounded-2xl flex items-center gap-1.5 animate-pulse">
                          <Wallet size={13} /> DUE
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 tracking-widest">ORDER REF</p>
                        <p className="font-mono font-bold text-lg text-slate-900 tracking-tight">
                          #{(order._id || order.id || '').slice(-8)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 tracking-widest">TYPE</p>
                        <p className="font-bold text-xl text-slate-800">
                          {isDelivery ? "DELIVERY" : isTA ? "TAKEAWAY" : `TBL-${order.table}`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {format(orderTimestamp, "dd MMM • hh:mm a")}
                      </div>
                      {isDelivery && order.deliveryTime && (
                        <div className="text-rose-600 font-bold">Est: {order.deliveryTime}</div>
                      )}
                    </div>
                  </div>

                  {/* Items Section - Cleaner & Spacious */}
                  <div className="flex-1 p-6 space-y-5 overflow-hidden">
                    <p className="uppercase text-[9px] font-black tracking-[1px] text-slate-400 text-center">ITEMS</p>
                    
                    {order.items?.map((item, idx) => {
                      const addonsTotal = item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
                      const basePrice = item.price - addonsTotal;

                      return (
                        <div key={idx} className={`text-sm ${item.isTakeaway ? 'bg-orange-50 -mx-1 px-3 py-2.5 rounded-2xl border border-orange-100' : ''}`}>
                          <div className="flex justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-slate-800 leading-tight">
                                {item.name}
                                {item.isTakeaway && <span className="ml-2 text-orange-600 text-xs">• T/A</span>}
                              </div>
                              {item.selectedPortion && (
                                <div className="text-xs text-blue-600 mt-0.5">Portion: {item.selectedPortion}</div>
                              )}
                              <div className="text-xs text-slate-500 mt-0.5">
                                {item.qty} × ₹{basePrice}
                              </div>
                            </div>
                            <div className="font-semibold text-slate-700 text-right">
                              ₹{(basePrice * item.qty).toLocaleString()}
                            </div>
                          </div>

                          {item.selectedAddons?.length > 0 && (
                            <div className="ml-4 mt-2 space-y-1 border-l-2 border-emerald-200 pl-3 text-xs">
                              {item.selectedAddons.map((a, i) => (
                                <div key={i} className="flex justify-between text-emerald-700">
                                  <span>+ {a.name}</span>
                                  <span>₹{(a.price || 0) * item.qty}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Financial Summary - Clean & Bold */}
                  <div className="border-t border-slate-100 bg-slate-50 p-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm border-b pb-3 border-slate-200">
                        <span className="text-slate-500">GST (5%)</span>
                        <span className="font-medium">₹{tax.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-end pt-2">
                        <span className="text-lg font-black tracking-tight text-slate-900">GRAND TOTAL</span>
                        <span className="text-3xl font-black tracking-tighter text-slate-900">
                          ₹{grandTotal.toLocaleString()}
                        </span>
                      </div>

                      {unpaidAmount > 0 && hasUnpaidCod && (
                        <button
                          onClick={() => setMarkPaidModal({ billId: order._id || order.id, amount: unpaidAmount })}
                          disabled={isMarkingPaid}
                          className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2"
                        >
                          <Wallet size={18} />
                          MARK ₹{unpaidAmount.toLocaleString()} AS PAID
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 pt-4 border-t border-slate-100 bg-white">
                    {isClosed ? (
                      <div className="text-center py-3 bg-emerald-100 text-emerald-700 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                        <CheckCircle size={18} /> TABLE FREED
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCloseBill(order)}
                        disabled={!!closingBillId || hasUnpaidCod}
                        className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          hasUnpaidCod 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg'
                        }`}
                      >
                        {closingBillId === (order.orderRef || order._id || order.id) ? (
                          <>Closing...</>
                        ) : hasUnpaidCod ? (
                          <>Collect Payment First</>
                        ) : (
                          <>
                            <CheckCircle size={18} />
                            CLOSE & FREE TABLE
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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

        {/* Print Cashier Selection Modal */}
        {printModalOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPrintModalOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-full mx-auto mb-4">
                <User size={28} className="text-indigo-600" />
              </div>
              <h3 className="text-lg font-black text-center text-slate-900 mb-2">Select Cashier</h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                Who is handling this bill?
              </p>
              
              <div className="mb-6 max-h-64 overflow-y-auto">
                <select
                  value={selectedCashier || ""}
                  onChange={(e) => setSelectedCashier(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">-- Choose a cashier --</option>
                  {CASHIERS.map((cashier) => (
                    <option key={cashier.id} value={cashier.id}>
                      {cashier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPrintModalOrder(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPrint}
                  disabled={!selectedCashier}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Printer size={16} />
                  Print Bill
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
import React from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { 
  ChevronLeft, 
  Receipt, 
  Printer, 
  Calendar, 
  MapPin, 
  Phone,
  Scissors,
  Hash,
  Star
} from "lucide-react";

export default function OrderBill() {
  const { bills, fetchBills, isLoading } = useOrders();
  const navigate = useNavigate();

  // make sure bills are loaded when hitting the bill page directly
  // always call fetchBills on mount to refresh data, dedupe later
  React.useEffect(() => {
    fetchBills();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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

  if (isLoading && (!bills || bills.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
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
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-mono">
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
          const subtotal = order.items?.reduce((sum, i) => sum + (i.price * i.qty), 0) || 0;
          const tax = subtotal * 0.05; 
  const grandTotal = subtotal + tax; // exact amount, no rounding
          const orderTimestamp = order.createdAt ? new Date(order.createdAt) : new Date();

          return (
            <motion.div 
              key={order._id || order.id || index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group w-full"
            >
              {/* Floating Print Trigger */}
              <button 
                onClick={() => handlePrintSingle(order.id || index)}
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
                </div>

                {/* Meta Grid */}
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                  <div className="p-6 space-y-1">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1"><Hash size={8}/> Order Ref</p>
                    <p className="text-[10px] font-black text-slate-900 uppercase">#{(order._id || order.id || '').slice(-10)}</p>
                  </div>
                  <div className="p-6 text-right space-y-1">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Location</p>
                    <p className="text-xl font-black italic text-slate-900 leading-none">TBL-{order.table}</p>
                  </div>
                </div>

                {/* PLACED DATE & TIME (Fixed Bug) */}
                <div className="px-6 py-3 bg-slate-50/50 flex justify-between items-center border-b border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={10} /> Placed At
                  </span>
                  <span className="text-[10px] font-black text-slate-800">
                    {format(orderTimestamp, "dd/MM/yyyy • hh:mm a")}
                  </span>
                </div>

                {/* Items Manifest */}
                <div className="p-8 space-y-6">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] text-center mb-2 underline underline-offset-8 decoration-slate-100">Itemized Manifest</p>
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start group">
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase tracking-tight text-slate-800 group-hover:text-indigo-600 transition-colors">{item.name}</span>
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
    <div className="flex flex-col">
      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 leading-none">Total Payable</span>
      <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Inclusive of Taxes</span>
    </div>
    <span className="text-3xl font-black tracking-tighter italic text-slate-900 whitespace-nowrap flex-shrink-0 overflow-x-auto">
      ₹{grandTotal.toLocaleString()}
    </span>
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
            </motion.div>
          );
        })}
      </main>

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
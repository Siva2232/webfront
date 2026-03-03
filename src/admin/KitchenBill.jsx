import React, { useEffect } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { 
  ChevronLeft, 
  Receipt, 
  Printer, 
  Calendar, 
  Hash,
  Flame,
  Package,
  Plus,
  Clock,
  Coffee,
  BellRing,
  CheckCircle,
  ChefHat,
  MessageSquare
} from "lucide-react";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../context/CartContext";

// Helper to check if order is takeaway
const isTakeawayOrder = (kb) =>
  kb.table === TAKEAWAY_TABLE || kb.table === DELIVERY_TABLE || !kb.table || kb.table === "TAKEAWAY" || kb.table === "DELIVERY";

const statusColors = {
  Pending: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  Preparing: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  Cooking: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  Ready: { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
  Served: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
};

export default function KitchenBill() {
  const { kitchenBills, fetchActiveKitchenBills, updateKitchenBillStatus, isLoading } = useOrders();
  const navigate = useNavigate();

  useEffect(() => {
    fetchActiveKitchenBills();
  }, []);

  // Isolated Print Logic
  const handlePrintSingle = (billId) => {
    const printContent = document.getElementById(`kitchen-bill-${billId}`);
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.outerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); 
  };

  // Sort: active first, then by date
  const sortedBills = [...kitchenBills].sort((a, b) => {
    if (a.status === "Served" && b.status !== "Served") return 1;
    if (a.status !== "Served" && b.status === "Served") return -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (!sortedBills || sortedBills.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-[#F4F4F5]">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
          <ChefHat size={32} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tighter uppercase">No Kitchen Bills</h2>
        <p className="text-slate-500 text-xs mb-8 uppercase tracking-widest font-bold">Waiting for orders</p>
        <button onClick={() => navigate(-1)} className="text-[10px] font-black text-indigo-600 border-b-2 border-indigo-600 pb-1 uppercase tracking-widest">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-mono relative">
      {/* Header */}
      <header className="top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 no-print">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-500">Kitchen Terminal</p>
            <h1 className="text-xs font-black uppercase tracking-widest">Kitchen Bills</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-4 mt-6 no-print">
        <div className="flex gap-4 overflow-x-auto pb-2">
          <StatBadge label="Pending" count={kitchenBills.filter(kb => kb.status === "Pending").length} icon={Clock} color="slate" />
          <StatBadge label="Preparing" count={kitchenBills.filter(kb => kb.status === "Preparing").length} icon={Flame} color="amber" />
          <StatBadge label="Cooking" count={kitchenBills.filter(kb => kb.status === "Cooking").length} icon={Coffee} color="orange" />
          <StatBadge label="Ready" count={kitchenBills.filter(kb => kb.status === "Ready").length} icon={BellRing} color="indigo" />
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {sortedBills.map((kb, index) => {
          const batchTotal = kb.batchTotal || kb.items?.reduce((sum, i) => sum + (i.price * i.qty), 0) || 0;
          const billTimestamp = kb.createdAt ? new Date(kb.createdAt) : new Date();
          const isServed = kb.status === "Served";
          const colors = statusColors[kb.status] || statusColors.Pending;

          return (
            <div 
              key={kb._id || index}
              className={`relative group w-full ${isServed ? 'opacity-60 grayscale-[0.3]' : ''}`}
            >
              {/* Floating Print Button */}
              <button 
                onClick={() => handlePrintSingle(kb._id || index)}
                className="absolute -top-4 right-4 z-10 no-print bg-white border border-slate-200 shadow-lg px-4 py-2 rounded-full hover:bg-slate-900 hover:text-white transition-all duration-300 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
              >
                <Printer size={10} /> Print
              </button>

              {/* Kitchen Bill Receipt */}
              <div 
                id={`kitchen-bill-${kb._id || index}`}
                className={`bg-white text-slate-900 border-2 ${colors.border} relative overflow-hidden print:border-none shadow-lg`}
              >
                {/* Kitchen Header */}
                <div className={`p-6 text-center relative overflow-hidden border-b-4 border-double ${colors.border} ${colors.bg}`}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-[0.05] pointer-events-none">
                    <ChefHat size={100} />
                  </div>
                  <div className={`inline-flex items-center justify-center w-10 h-10 bg-slate-900 text-white rounded-full mb-3`}>
                    <ChefHat size={18} />
                  </div>
                  <h2 className="text-lg font-black uppercase tracking-tight mb-1">Kitchen Bill</h2>
                  
                  {/* Batch Badge */}
                  {kb.batchNumber > 1 ? (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500 text-white rounded-full text-[9px] font-black uppercase">
                      <Plus size={10} /> Batch #{kb.batchNumber} - Added Items
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase">
                      <Receipt size={10} /> Batch #1 - Initial Order
                    </div>
                  )}

                  {/* Customer Name */}
                  {kb.customerName && (
                    <div className="mt-2 text-[10px] font-black uppercase tracking-tight text-slate-500">
                      Customer: <span className="text-slate-900">{kb.customerName}</span>
                    </div>
                  )}
                </div>

                {/* Table/Order Info */}
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                  <div className="p-4 space-y-1">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                      <Hash size={8}/> Order Ref
                    </p>
                    <p className="text-[10px] font-black text-slate-900 uppercase">
                      #{(kb.orderRef || kb._id || '').slice(-8)}
                    </p>
                  </div>
                  <div className="p-4 text-right space-y-1">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                      {isTakeawayOrder(kb) ? "Type" : "Table"}
                    </p>
                    <p className="text-xl font-black italic text-slate-900 leading-none flex items-center justify-end gap-2">
                      {isTakeawayOrder(kb) ? (
                        <>
                          <Package size={18} className="text-rose-500" />
                          <span className="text-rose-600">T/A</span>
                        </>
                      ) : (
                        <>TBL-{kb.table}</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Time */}
                <div className="px-4 py-2 bg-slate-50/50 flex justify-between items-center border-b border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={9} /> Received
                  </span>
                  <span className="text-[9px] font-black text-slate-800">
                    {format(billTimestamp, "hh:mm a • dd MMM")}
                  </span>
                </div>

                {/* Status Bar */}
                <div className={`px-4 py-3 ${colors.bg} flex justify-between items-center border-b ${colors.border}`}>
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Status</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {kb.status}
                  </span>
                </div>

                {/* Items */}
                <div className="p-4 space-y-3">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] text-center underline underline-offset-4 decoration-slate-100">
                    Items to Prepare
                  </p>
                  {kb.items?.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`flex justify-between items-center p-3 rounded-xl ${
                        item.isTakeaway ? 'bg-orange-50 border border-orange-100' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black uppercase tracking-tight text-slate-800">
                            {item.name}
                          </span>
                          {item.isTakeaway && (
                            <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[7px] font-black uppercase rounded">
                              T/A
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">₹{item.price} × {item.qty}</span>
                      </div>
                      <span className="text-xl font-black text-slate-900">×{item.qty}</span>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {kb.notes && (
                  <div className="mx-4 mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-2">
                    <MessageSquare size={12} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-slate-700 italic">"{kb.notes}"</p>
                  </div>
                )}

                {/* Batch Total */}
                <div className="mx-4 mb-4 p-4 bg-slate-900 rounded-2xl text-white">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Batch Total</span>
                    <span className="text-2xl font-black tracking-tight">₹{batchTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Buttons - No Print */}
                {!isServed && (
                  <div className="p-4 border-t border-slate-100 no-print">
                    <StatusButtons kb={kb} updateStatus={updateKitchenBillStatus} />
                  </div>
                )}

                {/* Footer */}
                <div className="p-4 text-center border-t border-dashed border-slate-200 bg-slate-50/30">
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Kitchen Copy</p>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
          div[id^="kitchen-bill-"] {
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

function StatBadge({ label, count, icon: Icon, color }) {
  const colorClasses = {
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-amber-100 text-amber-600",
    orange: "bg-orange-100 text-orange-600",
    indigo: "bg-indigo-100 text-indigo-600",
  };
  
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${colorClasses[color]} whitespace-nowrap`}>
      <Icon size={14} />
      <span className="text-[10px] font-black uppercase">{label}</span>
      <span className="text-sm font-black">{count}</span>
    </div>
  );
}

function StatusButtons({ kb, updateStatus }) {
  const getNextStatus = () => {
    const statusFlow = ["Pending", "Preparing", "Cooking", "Ready", "Served"];
    const currentIndex = statusFlow.indexOf(kb.status);
    return currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null;
  };

  const nextStatus = getNextStatus();

  const buttonStyles = {
    Preparing: "bg-amber-500 hover:bg-amber-600",
    Cooking: "bg-orange-500 hover:bg-orange-600",
    Ready: "bg-indigo-500 hover:bg-indigo-600",
    Served: "bg-emerald-500 hover:bg-emerald-600",
  };

  if (!nextStatus) return null;

  return (
    <button
      onClick={() => updateStatus(kb._id, nextStatus)}
      className={`w-full py-3 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all ${buttonStyles[nextStatus]} flex items-center justify-center gap-2`}
    >
      {nextStatus === "Preparing" && <><Flame size={14} /> Start Preparing</>}
      {nextStatus === "Cooking" && <><Coffee size={14} /> Start Cooking</>}
      {nextStatus === "Ready" && <><BellRing size={14} /> Mark Ready</>}
      {nextStatus === "Served" && <><CheckCircle size={14} /> Mark Served</>}
    </button>
  );
}

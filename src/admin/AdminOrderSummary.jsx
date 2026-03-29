import { useOrders } from "../context/OrderContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { 
  ChevronLeft, Clock, ShoppingBag, 
  MapPin, CheckCircle2, AlertCircle, RefreshCcw, 
  ReceiptText, ArrowRight, MessageSquare, UtensilsCrossed, Plus 
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminOrderSummary() {
  const { orders, fetchOrders, fetchTableOrders } = useOrders();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableId = searchParams.get("table");

  useEffect(() => {
    if (!tableId) return;
    fetchOrders();
    fetchTableOrders(tableId);
  }, [tableId]);

  const currentOrders = useMemo(() => {
    const allOrders = orders || [];
    return allOrders.filter(o => {
      const orderTable = String(o.table);
      const targetTable = String(tableId);
      const isMatchingTable = orderTable === targetTable;
      const isActiveStatus = ["Pending", "Preparing", "New", "Ready", "Served"].includes(o.status) || o._optimistic;
      return isMatchingTable && isActiveStatus;
    });
  }, [orders, tableId]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "text-orange-500 bg-orange-50";
      case "Preparing": return "text-blue-500 bg-blue-50";
      case "Ready": return "text-emerald-500 bg-emerald-50";
      default: return "text-slate-500 bg-slate-50";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending": return <Clock size={14} />;
      case "Preparing": return <UtensilsCrossed size={14} />;
      case "Ready": return <CheckCircle2 size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <nav className="sticky top-0 z-60 bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/admin/tables")} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Admin Active Bill</h1>
            <p className="text-sm font-black text-slate-900 uppercase">Table {tableId}</p>
          </div>
          <button onClick={() => { fetchOrders(); fetchTableOrders(tableId); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-95 text-slate-400">
            <RefreshCcw size={20} />
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pt-8 pb-32">
        {currentOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm px-10">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <ShoppingBag size={24} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">No Active Orders</h3>
            <p className="text-slate-400 text-sm mt-1 mb-6">Start taking orders for Table {tableId} by choosing items from the menu.</p>
            <button 
                onClick={() => navigate(`/admin/products-ordering?table=${tableId}`)}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all w-full md:w-auto"
            >
                Open Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ongoing Sessions</h3>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase">Live Update</span>
            </div>

            {currentOrders.map((order, idx) => (
              <div key={order._id || idx} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-4">
                <div className="p-6 border-b border-slate-50">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Order ID: {order.id}</span>
                            <div className={`mt-1 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-current w-fit ${getStatusColor(order.status)}`}>
                                {getStatusIcon(order.status)}
                                {order.status}
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">{format(new Date(order.createdAt), "hh:mm a")}</span>
                    </div>

                    <div className="space-y-3">
                        {(order.items || order.orderItems || []).map((item, i) => (
                            <div key={i} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <img src={item.image || "https://via.placeholder.com/150"} className="w-10 h-10 rounded-xl object-cover grayscale-[0.2]" alt="" />
                                        <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-lg shadow-lg border-2 border-white">{item.qty}</span>
                                    </div>
                                    <p className="text-xs font-black text-slate-900 uppercase leading-none">{item.name}</p>
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase">₹{(item.price || 0) * (item.qty || 1)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-slate-50/30 flex justify-between items-center">
                    <div className="flex gap-4">
                        <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm transition-colors hover:text-indigo-600 cursor-pointer" onClick={() => navigate(`/admin/bill?table=${tableId}`)}>
                             <ReceiptText size={18} />
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Amount</p>
                        <p className="text-lg font-black text-slate-900 uppercase items-center flex justify-end gap-1 tracking-tight">
                            ₹{order.totalAmount || (order.billDetails?.grandTotal)}
                        </p>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

       {currentOrders.length > 0 && (
         <div className="fixed bottom-6 inset-x-0 px-6 max-w-3xl mx-auto flex gap-4 z-50">
            <button 
                onClick={() => navigate(`/admin/products-ordering?table=${tableId}`)}
                className="flex-1 bg-slate-900 text-white h-16 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] flex items-center justify-center gap-3 hover:scale-[0.98] transition-transform active:scale-95"
            >
                <Plus size={18} strokeWidth={3} />
                Add More Items
            </button>
            <button 
                onClick={() => navigate(`/admin/bill?table=${tableId}`)}
                className="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center shadow-lg hover:bg-slate-50 transition-colors"
                title="Settle Bill"
            >
                <ReceiptText size={22} className="text-indigo-600" />
            </button>
         </div>
       )}
    </div>
  );
}

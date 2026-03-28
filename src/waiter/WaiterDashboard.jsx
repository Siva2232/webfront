import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Table, Receipt, Utensils, ArrowRight, User, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export default function WaiterDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/kitchen-login");
  };

  const menuItems = [
    {
      title: "Active Tables",
      desc: "Live table monitoring",
      icon: <Table size={28} />,
      path: "/waiter/tables",
      color: "blue"
    },
    {
      title: "All Orders",
      desc: "Manage live orders",
      icon: <ShoppingCart size={28} />,
      path: "/waiter/orders",
      color: "orange"
    },
    {
      title: "Bill Registry",
      desc: "Print & Settle bills",
      icon: <Receipt size={28} />,
      path: "/waiter/bill",
      color: "emerald"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-6 sm:px-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Utensils size={18} className="text-orange-500" />
              <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Service Portal</h1>
            </div>
            <p className="text-2xl font-black text-slate-900 uppercase leading-none">Waiter Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
              onClick={handleLogout}
              className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all border border-slate-100"
            >
              <LogOut size={20} />
            </button>
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <User size={24} />
            </div>
          </div>
        </div>
      </div>

      <main className="p-6 sm:p-10 max-w-6xl mx-auto">
        <div className="mb-10">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Management Tools</h2>
          <div className="h-1 w-12 bg-orange-500 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {menuItems.map((item, idx) => (
            <motion.button
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => navigate(item.path)}
              className="group relative flex flex-col items-start p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-orange-100 transition-all duration-300 overflow-hidden text-left"
            >
              {/* Bg Decoration */}
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-slate-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
              
              <div className={`mb-6 p-4 rounded-2xl bg-slate-900 text-white shadow-lg transition-transform group-hover:-translate-y-1`}>
                {item.icon}
              </div>

              <div className="relative z-10">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-400 font-medium mb-6">
                  {item.desc}
                </p>
                
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open Tools <ArrowRight size={14} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Quick Stats or Footer Info */}
        <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] text-white overflow-hidden relative">
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Report</p>
              <h4 className="text-lg font-bold">Kitchen is running at normal capacity</h4>
            </div>
            <div className="flex items-center bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-3" />
              <span className="text-xs font-black uppercase tracking-widest">Live Sync Active</span>
            </div>
          </div>
          {/* Decorative pattern */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        </div>
      </main>
    </div>
  );
}

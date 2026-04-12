import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import API from "../api/axios";
import { 
  Building2, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  User,
  Coffee,
  HelpCircle,
  Send
} from "lucide-react";
import toast from "react-hot-toast";

export default function SupportDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    resolved: 0,
    restaurants: 0
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await API.get("/support-tickets/all");
        setRecentTickets(data.slice(0, 5));
        
        const open = data.filter(t => t.status === "Open" || t.status === "In Progress").length;
        const resolved = data.filter(t => t.status === "Resolved").length;
        const restaurants = new Set(data.map(t => t.restaurantId)).size;

        setStats({
          total: data.length,
          open,
          resolved,
          restaurants
        });
      } catch (error) {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statsCards = [
    { label: "Active Tickets", value: stats.open, icon: MessageSquare, color: "bg-indigo-600 text-white", shadow: "shadow-indigo-100" },
    { label: "Total Handled", value: stats.total, icon: CheckCircle2, color: "bg-emerald-600 text-white", shadow: "shadow-emerald-100" },
    { label: "Served Clients", value: stats.restaurants, icon: Building2, color: "bg-amber-600 text-white", shadow: "shadow-amber-100" },
    { label: "Pending Analysis", value: stats.open > 0 ? "Urgent" : "Good", icon: AlertCircle, color: "bg-slate-900 text-white", shadow: "shadow-slate-200" }
  ];

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Initializing Portal...</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Support Metrics</h2>
          <p className="text-slate-500 mt-2 font-medium">Monitoring restaurant technical performance and issues.</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <Clock className="text-indigo-600" size={20} />
          <div>
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase leading-none">Status</p>
            <p className="text-sm font-bold text-slate-800 mt-1">Live Tracking Enabled</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-xl transition-all hover:scale-105"
          >
            <div className={`p-4 rounded-2xl ${card.color} ${card.shadow} transition-transform group-hover:rotate-12`}>
              <card.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 leading-none">{card.label}</p>
              <p className="text-2xl font-black text-slate-800 mt-2">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Queue Management</h3>
                <p className="text-slate-400 text-sm mt-1">Latest tickets waiting for response.</p>
              </div>
              <button onClick={() => window.location.href = '/support-team/tickets'} className="text-xs font-black text-indigo-600 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all">
                Full Queue
              </button>
            </div>

            <div className="space-y-4">
              {recentTickets.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-3xl">
                   No active tickets in queue. Great work!
                </div>
              ) : (
                recentTickets.map((ticket, i) => (
                  <div 
                    key={i} 
                    className="p-5 bg-slate-50 rounded-2xl flex items-center justify-between gap-4 hover:bg-white border border-transparent hover:border-slate-100 transition-all cursor-pointer shadow-sm shadow-transparent hover:shadow-slate-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-100 text-slate-400 font-black text-xs">
                        {ticket.restaurantId.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-none">{ticket.subject}</p>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium flex items-center gap-1">
                          <Building2 size={10} /> {ticket.restaurantId} <span className="mx-2">•</span> <Clock size={10} /> {new Date(ticket.lastMessageAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${
                      ticket.status === 'Open' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {ticket.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden h-full shadow-2xl shadow-indigo-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-20 -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <TrendingUp className="text-white" size={24} />
                </div>
                <div>
                  <h4 className="font-bold">Team Objectives</h4>
                  <p className="text-[10px] text-indigo-400 font-black tracking-widest uppercase">Quarterly Review</p>
                </div>
              </div>

              <div className="space-y-6">
                {[
                  { label: "Wait Time", value: "2.4m", target: "5.0m", icon: Clock },
                  { label: "Resolution", value: "98.2%", target: "95.0%", icon: CheckCircle2 },
                  { label: "CSAT Score", value: "4.9/5", target: "4.5/5", icon: User }
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <stat.icon className="text-indigo-400" size={16} />
                      <p className="text-sm font-bold">{stat.label}</p>
                    </div>
                    <div>
                      <p className="text-sm font-black text-right">{stat.value}</p>
                      <p className="text-[10px] text-slate-500 text-right mt-1">Target: {stat.target}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-4 bg-indigo-600 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                   <Coffee className="text-white" size={20} />
                </div>
                <p className="text-xs font-bold leading-relaxed">
                  Excellent work today. 9 new resolutions achieved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

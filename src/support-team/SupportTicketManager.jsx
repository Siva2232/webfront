import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api/axios";
import toast from "react-hot-toast";
import { 
  Headset, 
  Send,
  MessageCircle,
  User as UserIcon,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Store,
  MessageSquare
} from "lucide-react";

export default function SupportTickerManager() {
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newReply, setNewReply] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    // Check if the user is authenticated for support
    if (localStorage.getItem("isSupportLoggedIn") !== "true") {
      window.location.href = "/support-team/login";
    }
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data } = await API.get("/support-tickets/all");
      
      // Auto-select ticket if passed from notification/modal
      if (location.state?.selectedTicketId) {
        const target = data.find(t => t._id === location.state.selectedTicketId);
        if (target) setSelectedTicket(target);
      } else setTickets(data);
      if (selectedTicket) {
        const updated = data.find(t => t._id === selectedTicket._id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (error) {
      toast.error("Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;

    try {
      const { data } = await API.post(`/support-tickets/${selectedTicket._id}/messages`, {
        text: newReply
      });
      setSelectedTicket(data);
      setNewReply("");
      fetchTickets();
      toast.success("Reply sent");
    } catch (error) {
      toast.error("Failed to send reply");
    }
  };

  const updateStatus = async (status) => {
    try {
      await API.put(`/support-tickets/${selectedTicket._id}/status`, { status });
      toast.success(`Ticket marked as ${status}`);
      fetchTickets();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.restaurantId.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "All" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-8 text-center">Loading tickets...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Support Tickets</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage and resolve restaurant support requests.</p>
        </div>

        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search Restaurant or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
          >
            <option>All</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-250px)]">
        {/* Ticket List */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-50 font-black text-xs uppercase tracking-widest text-slate-400">
            Tickets ({filteredTickets.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredTickets.map((ticket) => (
              <div 
                key={ticket._id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50 relative ${
                  selectedTicket?._id === ticket._id ? "bg-indigo-50 border-l-4 border-l-indigo-600" : ""
                }`}
              >
                {ticket.isRead === false && (
                  <span className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-200"></span>
                )}
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{ticket.restaurantId}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-600' : 
                    ticket.status === 'Open' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-800 truncate">{ticket.subject}</h4>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                   <Clock size={10} />
                   {new Date(ticket.lastMessageAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3">
          {selectedTicket ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm">
                    <Store className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{selectedTicket.restaurantId} <span className="mx-2 text-slate-300">|</span> {selectedTicket.subject}</h3>
                    <p className="text-xs text-slate-500">User: {selectedTicket.userId?.name} ({selectedTicket.userId?.email})</p>
                  </div>
                </div>

                <div className="flex gap-2">
                   {selectedTicket.status !== 'Resolved' && (
                     <button 
                       onClick={() => updateStatus('Resolved')}
                       className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all"
                     >
                       <CheckCircle2 size={14} /> Resolve
                     </button>
                   )}
                   {selectedTicket.status !== 'Closed' && (
                     <button 
                       onClick={() => updateStatus('Closed')}
                       className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
                     >
                       <XCircle size={14} /> Close
                     </button>
                   )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                {selectedTicket.messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex ${msg.senderModel === 'SuperAdmin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] p-4 rounded-3xl ${
                      msg.senderModel === 'SuperAdmin' 
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-100' 
                      : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-tl-none'
                    }`}>
                      <div className={`flex items-center gap-2 mb-1 opacity-70 text-[10px] font-black uppercase ${
                        msg.senderModel === 'SuperAdmin' ? 'text-indigo-50' : 'text-slate-400'
                      }`}>
                        {msg.senderModel === 'SuperAdmin' ? <Headset size={10} /> : <UserIcon size={10} />}
                        {msg.senderModel === 'SuperAdmin' ? "Support Agent (You)" : selectedTicket.userId?.name || "Customer"}
                      </div>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <p className="text-[9px] mt-2 opacity-50 text-right">
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleReply} className="p-6 bg-white border-t border-slate-50">
                <div className="flex gap-4">
                  <input 
                    type="text"
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    placeholder="Type your response..."
                    className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                  <button 
                    disabled={!newReply.trim()}
                    type="submit"
                    className="bg-slate-900 text-white px-8 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                  >
                    Send Reply
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm h-full flex items-center justify-center p-12 text-center">
              <div className="space-y-4">
                <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare size={48} />
                </div>
                <h3 className="text-2xl font-black text-slate-800">Support Dashboard</h3>
                <p className="text-slate-500 max-w-sm">Select a ticket from the left panel to start assisting restaurants with their technical or billing issues.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

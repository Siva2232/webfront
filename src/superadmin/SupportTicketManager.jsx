import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api/axios";
import toast from "react-hot-toast";
import { 
  Headset, 
  Send,
  MessageCircle,
  User as UserIcon,
  Search,
  Clock,
  Store,
  MessageSquare,
  CheckCircle2,
  XCircle
} from "lucide-react";

export default function SupportTicketManager() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newReply, setNewReply] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    fetchTickets();
  }, []);

  const totalTickets = tickets.length;
  const openCount = tickets.filter(t => t.status === "Open").length;
  const inProgressCount = tickets.filter(t => t.status === "In Progress").length;
  const resolvedCount = tickets.filter(t => t.status === "Resolved").length;
  const closedCount = tickets.filter(t => t.status === "Closed").length;
  const pendingCount = openCount + inProgressCount;

  const fetchTickets = async () => {
    try {
      const { data } = await API.get("/support-tickets/all");
      setTickets(data);
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
      toast.success("Reply sent successfully");
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
    const matchesSearch = t.restaurantId?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "All" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const lastSupportName = selectedTicket
    ? [...selectedTicket.messages].reverse().find(msg => msg.senderModel === 'SuperAdmin')?.senderName
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading tickets...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Headset className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white tracking-tight">Support Center</h1>
            </div>
            <p className="text-slate-400">Manage and resolve restaurant support requests in real-time</p>
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by restaurant or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-72 bg-slate-800 border border-slate-700 rounded-2xl pl-11 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="All">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-6 shadow-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 font-semibold">Total Tickets</p>
            <p className="mt-4 text-4xl font-black text-white">{totalTickets}</p>
            <p className="mt-2 text-sm text-slate-400">All support requests in the platform</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-6 shadow-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 font-semibold">Pending</p>
            <p className="mt-4 text-4xl font-black text-white">{pendingCount}</p>
            <p className="mt-2 text-sm text-slate-400">Open and in-progress tickets</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-6 shadow-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 font-semibold">Resolved</p>
            <p className="mt-4 text-4xl font-black text-white">{resolvedCount}</p>
            <p className="mt-2 text-sm text-slate-400">Tickets closed by support</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-6 shadow-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 font-semibold">Closed</p>
            <p className="mt-4 text-4xl font-black text-white">{closedCount}</p>
            <p className="mt-2 text-sm text-slate-400">Archived support tickets</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)]">
          {/* Ticket List */}
          <div className="lg:col-span-4 bg-slate-900/70 backdrop-blur-xl border border-slate-700 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-700 font-medium text-slate-400 text-sm flex items-center justify-between bg-slate-800/50">
              <span>Active Tickets ({filteredTickets.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredTickets.map((ticket) => (
                <div 
                  key={ticket._id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-6 border-b border-slate-700 cursor-pointer transition-all hover:bg-slate-800/50 ${
                    selectedTicket?._id === ticket._id ? "bg-slate-800 border-l-4 border-l-indigo-500" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs text-indigo-400 font-bold">
                      {ticket.restaurantId}
                    </span>
                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                      ticket.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400' : 
                      ticket.status === 'Open' ? 'bg-amber-500/20 text-amber-400' : 
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>

                  <h4 className="font-semibold text-white line-clamp-2 mb-3">
                    {ticket.subject}
                  </h4>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={14} />
                    {new Date(ticket.lastMessageAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              ))}

              {filteredTickets.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  No tickets found
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-8">
            {selectedTicket ? (
              <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700 rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-800 rounded-2xl">
                      <Store className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {selectedTicket.restaurantId} • {selectedTicket.subject}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-400">
                        <span>{selectedTicket.userId?.name} • {selectedTicket.userId?.email}</span>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs uppercase tracking-[0.24em]">
                          <Headset size={12} /> {lastSupportName || "Support Agent"}
                        </span>
                        {selectedTicket.status === 'Resolved' && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs uppercase tracking-[0.24em]">
                            Resolved by {lastSupportName || "Support Agent"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {selectedTicket.status !== 'Resolved' && (
                      <button 
                        onClick={() => updateStatus('Resolved')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-semibold transition"
                      >
                        <CheckCircle2 size={18} /> Resolve
                      </button>
                    )}
                    {selectedTicket.status !== 'Closed' && (
                      <button 
                        onClick={() => updateStatus('Closed')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl text-sm font-semibold transition"
                      >
                        <XCircle size={18} /> Close
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-950/30">
                  {selectedTicket.messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.senderModel === 'SuperAdmin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] p-5 rounded-3xl ${
                        msg.senderModel === 'SuperAdmin' 
                        ? 'bg-linear-to-br from-indigo-600 to-purple-600 text-white rounded-tr-none' 
                        : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none'
                      }`}>
                        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-wider opacity-75">
                          {msg.senderModel === 'SuperAdmin' ? (
                            <><Headset size={14} /> {msg.senderName || "Support Agent"}</>
                          ) : (
                            <><UserIcon size={14} /> {selectedTicket.userId?.name}</>
                          )}
                        </div>
                        <p className="leading-relaxed text-[15px]">{msg.text}</p>
                        <p className="text-[10px] mt-3 opacity-60 text-right">
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Input */}
                <form onSubmit={handleReply} className="p-6 border-t border-slate-700 bg-slate-900">
                  <div className="flex gap-4">
                    <input 
                      type="text"
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      placeholder="Type your reply here..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                      disabled={!newReply.trim()}
                      type="submit"
                      className="bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 px-8 rounded-2xl font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-500/30"
                    >
                      Send 
                      <Send size={18} />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Empty State */
              <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700 rounded-3xl h-full flex items-center justify-center text-center">
                <div>
                  <div className="w-28 h-28 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-8">
                    <MessageSquare size={56} className="text-slate-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-300 mb-3">No Ticket Selected</h3>
                  <p className="text-slate-500 max-w-md">
                    Choose a support ticket from the left panel to view conversation and respond
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
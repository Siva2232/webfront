import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api/axios";
import { useUI } from "../context/UIContext";
import toast from "react-hot-toast";
import { 
  Headset, 
  Mail, 
  MessageSquare, 
  BookOpen, 
  ChevronRight, 
  Send, 
  Clock,
  CheckCircle2,
  Loader2,
  History,
  MessageCircle,
  User as UserIcon
} from "lucide-react";

export default function CustomerSupport() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newReply, setNewReply] = useState("");

  const [formData, setFormData] = useState({
    subject: "Technical Issue",
    priority: "Medium",
    message: ""
  });

  const {
    fetchSupportTicketCount,
    markAllSupportTicketsRead,
    supportTicketCount,
  } = useUI();

  useEffect(() => {
    setSelectedTicket((prev) => {
      if (!prev?._id) return prev;
      const next = tickets.find((t) => t._id === prev._id);
      return next || prev;
    });
  }, [tickets]);

  useEffect(() => {
    if (location.state?.fromSupportNotification) {
      setShowHistory(true);
      markAllSupportTicketsRead();
    }
  }, [location.state, markAllSupportTicketsRead]);

  useEffect(() => {
    if (!tickets.length) return;
    if (location.state?.selectedTicketId) {
      const found = tickets.find((ticket) => ticket._id === location.state.selectedTicketId);
      if (found) {
        setSelectedTicket(found);
        return;
      }
    }
    if (location.state?.fromSupportNotification && !selectedTicket) {
      setSelectedTicket(tickets[0]);
    }
  }, [location.state, tickets, selectedTicket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) return toast.error("Please enter a message");
    
    setLoading(true);
    try {
      await API.post("/support-tickets", formData);
      setSubmitted(true);
      setFormData({ ...formData, message: "" });
      fetchSupportTicketCount();
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit ticket");
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
      fetchSupportTicketCount();
      toast.success("Reply sent");
    } catch (error) {
      toast.error("Failed to send reply");
    }
  };

  const supportCards = [
    // {
    //   title: "Live Chat",
    //   desc: "Average wait: 2 mins",
    //   icon: MessageSquare,
    //   color: "bg-blue-50 text-blue-600",
    //   action: "Start Chat"
    // },
    // {
    //   title: "Email Support",
    //   desc: "Response within 24h",
    //   icon: Mail,
    //   color: "bg-indigo-50 text-indigo-600",
    //   action: "Send Email"
    // },
    // {
    //   title: "Help Center",
    //   desc: "342 tutorials ready",
    //   icon: BookOpen,
    //   color: "bg-emerald-50 text-emerald-600",
    //   action: "View Docs"
    // }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Support Center</h1>
          <p className="text-slate-500 mt-2 font-medium">How can we help you with <span className="text-indigo-600">My Cafe</span> today?</p>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm font-bold text-slate-700 hover:shadow-md transition-all active:scale-95"
        >
          {showHistory ? <Send size={18} /> : <History size={18} />}
          {showHistory ? "Submit Ticket" : `My History (${tickets.length})`}
        </button>
      </div>

      {showHistory ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Ticket List */}
          <div className="lg:col-span-1 space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest ml-2 mb-4">Past Tickets</h3>
            {tickets.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-3xl">
                <p className="text-slate-400 text-sm">No tickets yet</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div 
                  key={ticket._id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedTicket?._id === ticket._id 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" 
                      : "bg-white border-slate-100 text-slate-800 hover:border-indigo-200"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      ticket.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-500' : 
                      ticket.status === 'Open' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      {ticket.status}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {new Date(ticket.lastMessageAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm truncate">{ticket.subject}</h4>
                  <p className={`text-xs mt-1 truncate ${selectedTicket?._id === ticket._id ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {ticket.messages[ticket.messages.length - 1]?.text}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-3">
            {selectedTicket ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-[70vh]">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800">{selectedTicket.subject}</h3>
                    <p className="text-xs text-slate-400">Raised on {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                    selectedTicket.priority === 'High' ? 'bg-red-50 text-red-600' : 
                    selectedTicket.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {selectedTicket.priority} Priority
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                  {selectedTicket.messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.senderModel === 'SuperAdmin' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-3xl ${
                        msg.senderModel === 'SuperAdmin' 
                        ? 'bg-slate-800 text-white rounded-tl-none' 
                        : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-tr-none'
                      }`}>
                        <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] font-black uppercase">
                          {msg.senderModel === 'SuperAdmin' ? <Headset size={10} /> : <UserIcon size={10} />}
                          {msg.senderModel === 'SuperAdmin' ? "Support Team" : "You"}
                        </div>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p className="text-[9px] mt-2 opacity-50 text-right">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTicket.status !== 'Closed' && (
                  <form onSubmit={handleReply} className="p-6 bg-white border-t border-slate-50 rounded-b-[2.5rem]">
                    <div className="flex gap-4">
                      <input 
                        type="text"
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                      />
                      <button 
                        type="submit"
                        className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm h-full flex flex-center items-center justify-center p-12 text-center">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageCircle size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Select a Ticket</h3>
                  <p className="text-slate-400 max-w-xs">Viewing your support history. Select a ticket from the left to view the conversation and status.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Support Options */}
          <div className="lg:col-span-1 space-y-4">
            {supportTicketCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-sky-50 p-6 rounded-3xl border border-sky-100 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">New Messages</p>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">Support updates waiting</h3>
                    <p className="mt-2 text-sm text-slate-600">You have {supportTicketCount} unread support ticket{supportTicketCount !== 1 ? "s" : ""}.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowHistory(true);
                    markAllSupportTicketsRead();
                    if (tickets.length > 0) setSelectedTicket(tickets[0]);
                  }}
                  className="mt-6 w-full rounded-2xl bg-slate-900 text-white py-3 text-sm font-bold hover:bg-slate-800 transition-colors"
                >
                  Open Support History
                </button>
              </motion.div>
            )}
            {supportCards.map((card, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -4 }}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-2xl ${card.color}`}>
                    <card.icon size={24} />
                  </div>
                  <div className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-black uppercase text-slate-400">Available</div>
                </div>
                <div className="mt-4">
                  <h3 className="font-bold text-slate-800 text-lg">{card.title}</h3>
                  <p className="text-slate-500 text-sm mt-1">{card.desc}</p>
                </div>
                <div className="mt-6 flex items-center text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                  {card.action} <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}

            {/* Business Hours */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
              <Clock className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
              <h4 className="font-bold mb-2">Support Hours</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Mon - Fri: 9:00 AM - 10:00 PM<br />
                Sat - Sun: 10:00 AM - 6:00 PM
              </p>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
              {submitted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800">Message Sent!</h2>
                  <p className="text-slate-500 mt-2">Our team will get back to you shortly.</p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="mt-8 text-indigo-600 font-bold hover:underline"
                  >
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-slate-800">Submit a Ticket</h3>
                    <p className="text-slate-400 text-sm mt-1">Directly contact our technical department.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
                        <select 
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                          <option>Technical Issue</option>
                          <option>Billing Inquiry</option>
                          <option>Feature Request</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Priority</label>
                        <div className="flex gap-2">
                          {['Low', 'Medium', 'High'].map((p) => (
                            <button 
                              key={p} 
                              type="button" 
                              onClick={() => setFormData({ ...formData, priority: p })}
                              className={`flex-1 py-3 px-2 rounded-2xl text-xs font-bold transition-all ${
                                formData.priority === p 
                                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                                  : "bg-slate-50 text-slate-600 hover:bg-white hover:shadow-sm"
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Message</label>
                      <textarea 
                        rows="5"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Describe your problem in detail..."
                        className="w-full bg-slate-50 border-none rounded-3xl px-6 py-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
                      ></textarea>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                      Submit Ticket
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
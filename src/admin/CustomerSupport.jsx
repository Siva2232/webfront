import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Headset, 
  Mail, 
  MessageSquare, 
  BookOpen, 
  ChevronRight, 
  Send, 
  Clock,
  CheckCircle2
} from "lucide-react";

export default function CustomerSupport() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const supportCards = [
    {
      title: "Live Chat",
      desc: "Average wait: 2 mins",
      icon: MessageSquare,
      color: "bg-blue-50 text-blue-600",
      action: "Start Chat"
    },
    {
      title: "Email Support",
      desc: "Response within 24h",
      icon: Mail,
      color: "bg-indigo-50 text-indigo-600",
      action: "Send Email"
    },
    {
      title: "Help Center",
      desc: "342 tutorials ready",
      icon: BookOpen,
      color: "bg-emerald-50 text-emerald-600",
      action: "View Docs"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Support Center</h1>
        <p className="text-slate-500 mt-2 font-medium">How can we help you with <span className="text-indigo-600">My Cafe</span> today?</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Support Options */}
        <div className="lg:col-span-1 space-y-4">
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
                      <select className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all">
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
                          <button key={p} type="button" className="flex-1 py-3 px-2 rounded-2xl bg-slate-50 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
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
                      placeholder="Describe your problem in detail..."
                      className="w-full bg-slate-50 border-none rounded-3xl px-6 py-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
                    ></textarea>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200"
                  >
                    <Send size={18} />
                    Submit Ticket
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
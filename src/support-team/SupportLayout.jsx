import React from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Headset, 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  LifeBuoy,
  Bell,
  ChevronDown,
  User,
  X,
  History,
  MessageCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useUI } from "../context/UIContext";
import { AnimatePresence } from "framer-motion";

export default function SupportLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { supportUnreadCount, markAllSupportTicketsRead } = useUI();
  const [showSupportModal, setShowSupportModal] = React.useState(false);
  const [supportModalTickets, setSupportModalTickets] = React.useState([]);
  const [supportModalLoading, setSupportModalLoading] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const supportRef = React.useRef(null);
  const profileRef = React.useRef(null);
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");

  // Close modals when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (supportRef.current && !supportRef.current.contains(event.target)) {
        setShowSupportModal(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadSupportModalTickets = async () => {
    setSupportModalLoading(true);
    try {
      const { data } = await API.get("/support-tickets/all");
      // filter unread tickets (isRead === false)
      const unreadTickets = Array.isArray(data)
        ? data.filter((t) => t.isRead === false)
        : [];
      setSupportModalTickets(unreadTickets.slice(0, 10)); // show top 10
    } catch (error) {
      console.error("Error loading support modal tickets:", error);
      setSupportModalTickets([]);
    } finally {
      setSupportModalLoading(false);
    }
  };

  const handleSupportIconClick = async () => {
    if (showSupportModal) {
      setShowSupportModal(false);
      return;
    }
    await loadSupportModalTickets();
    setShowSupportModal(true);
    if (supportUnreadCount > 0) {
      await markAllSupportTicketsRead();
    }
  };

  const handleOpenTicketsPage = () => {
    setShowSupportModal(false);
    navigate("/support-team/tickets");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("isSupportLoggedIn");
    toast.success("Support Agent Logged Out");
    navigate("/support-team/login");
  };

  const navItems = [
    { label: "Overview", icon: LayoutDashboard, to: "/support-team/dashboard" },
    { label: "Active Tickets", icon: MessageSquare, to: "/support-team/tickets" },
    { label: "Service Center", icon: LifeBuoy, to: "/support-team/service" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col z-20">
        <div className="p-8 flex items-center gap-4 border-b border-slate-50">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 ring-4 ring-indigo-50">
            <Headset className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-black text-slate-800 text-lg tracking-tight">SupportHub</h1>
            <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500 mt-0.5">Control Center</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto no-scrollbar">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-4">Internal Systems</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all group ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                }`
              }
            >
              <item.icon size={20} />
              <span className="flex-1">{item.label}</span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* Footer info only (removed logout) */}
        <div className="p-6 bg-slate-50/50 m-4 rounded-3xl border border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-slate-600">Active Duty</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-40">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              {navItems.find(item => item.to === location.pathname)?.label || "Overview"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Support Notifications */}
            <div className="relative" ref={supportRef}>
              <button
                onClick={handleSupportIconClick}
                className={`relative p-3 rounded-2xl transition-all duration-200 ${
                  supportUnreadCount > 0
                    ? "bg-indigo-50 text-indigo-600 shadow-sm"
                    : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                }`}
              >
                <Bell size={20} className={supportUnreadCount > 0 ? "animate-bounce" : ""} />
                {supportUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                    {supportUnreadCount > 9 ? "9+" : supportUnreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showSupportModal && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-96 bg-white rounded-3xl shadow-2xl shadow-indigo-100 border border-slate-100 p-2 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                      <h3 className="font-black text-slate-800 text-sm">New Tickets & Replies</h3>
                      <button onClick={() => setShowSupportModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto p-2 space-y-2 no-scrollbar">
                      {supportModalLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-xs font-bold text-slate-400">Loading alerts...</p>
                        </div>
                      ) : supportModalTickets.length > 0 ? (
                        supportModalTickets.map((ticket) => (
                          <button
                            key={ticket._id}
                            onClick={() => {
                              setShowSupportModal(false);
                              navigate("/support-team/tickets", { state: { selectedTicketId: ticket._id } });
                            }}
                            className="w-full p-4 rounded-2xl text-left bg-indigo-50/50 hover:bg-indigo-50 transition-all border border-indigo-100/50 group"
                          >
                            <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                <MessageCircle size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                  <p className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight truncate">
                                    {ticket.restaurantId}
                                  </p>
                                  <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100 flex-shrink-0">
                                    {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-slate-600 line-clamp-1">{ticket.subject}</p>
                                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                  <History size={10} />
                                  New Reply Received
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200">
                            <Bell size={32} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">All Caught Up</p>
                            <p className="text-[10px] font-bold text-slate-300 mt-1 px-8">No unread tickets or replies at the moment.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleOpenTicketsPage}
                      className="w-full mt-2 py-4 bg-slate-50 hover:bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest transition-all rounded-2xl"
                    >
                      View All Tickets
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-8 w-px bg-slate-100 mx-2"></div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-2 pr-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100"
              >
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-100">
                  <span className="text-white font-black text-sm">{userInfo.name?.charAt(0).toUpperCase() || 'A'}</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-slate-800 leading-none">{userInfo.name || "Agent"}</p>
                  <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Support Team</p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-60 bg-white rounded-3xl shadow-2xl shadow-indigo-100 border border-slate-100 p-2 z-50"
                  >
                    <div className="p-4 border-b border-slate-50 mb-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Signed in as</p>
                    <p className="text-xs font-bold text-slate-800 break-all">{userInfo.email || "support@resturmmnt.com"}</p>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate("/support-team/profile");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all group"
                    >
                      <User size={16} className="text-slate-400 group-hover:text-indigo-600" />
                      <span>My Profile</span>
                    </button>
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate("/support-team/profile");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all group"
                    >
                      <Settings size={16} className="text-slate-400 group-hover:text-indigo-600" />
                      <span>Account Settings</span>
                    </button>
                    
                    <div className="h-px bg-slate-50 my-2 mx-2"></div>
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all group"
                    >
                      <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
                      <span>Logout Account</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-8 pb-12 no-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

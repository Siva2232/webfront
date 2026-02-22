import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from "framer-motion";
import { Utensils, ShoppingCart, Receipt, ChefHat, Bell } from "lucide-react";

export default function Navbar({ title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [hasUnreadOffer, setHasUnreadOffer] = useState(false);

  const currentTable = searchParams.get("table")?.trim();

  const getLinkWithTable = (path) => {
    if (!currentTable) return path;
    return `${path}?table=${currentTable}`;
  };

  const links = [
    { path: "/menu", label: "Menu", icon: Utensils },
    { path: "/cart", label: "Cart", icon: ShoppingCart },
    { path: "/order-summary", label: "Orders", icon: Receipt },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  // Show notification dot when offer is viewed/closed
  useEffect(() => {
    const handleOfferViewed = () => {
      setHasUnreadOffer(true);
    };
    window.addEventListener("offerViewed", handleOfferViewed);
    return () => window.removeEventListener("offerViewed", handleOfferViewed);
  }, []);

  // When bell is clicked → show offers again + clear notification
  const handleBellClick = () => {
    setHasUnreadOffer(false);
    window.dispatchEvent(new Event("showOfferModal"));
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:block sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-3">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 group cursor-pointer"
              onClick={() => navigate(getLinkWithTable("/menu"))}
            >
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                <ChefHat className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                  {title || "MY CAFE"}
                </h1>
                <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] mt-1">PREMIUM DINING</p>
              </div>
            </motion.div>

            <div className="flex items-center gap-5">
              {/* Notification Bell */}
              <button
                onClick={handleBellClick}
                className="relative p-2.5 rounded-full hover:bg-slate-100/80 transition-colors focus:outline-none"
              >
                <Bell size={22} className="text-slate-700" strokeWidth={2} />
                {hasUnreadOffer && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-[1.5rem] border border-slate-200/50">
                {links.map((link) => {
                  const active = isActive(link.path);
                  const Icon = link.icon;
                  return (
                    <button
                      key={link.path}
                      onClick={() => navigate(getLinkWithTable(link.path))}
                      className={`relative px-6 py-2.5 rounded-[1.2rem] flex items-center gap-2 transition-all duration-300 ${
                        active ? "text-white" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Icon size={18} strokeWidth={active ? 2.5 : 2} className="relative z-10" />
                      <span className="text-sm font-black uppercase tracking-widest relative z-10">
                        {link.label}
                      </span>
                      {active && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-slate-900 rounded-[1.2rem] shadow-lg"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-slate-100 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3" onClick={() => navigate(getLinkWithTable("/menu"))}>
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase">
            {title || "MY CAFE"}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Notification Bell - Mobile */}
          <button
            onClick={handleBellClick}
            className="relative p-2 focus:outline-none"
          >
            <Bell size={22} className="text-slate-700" />
            {hasUnreadOffer && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>

          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white border-t border-slate-100 pb-safe">
        <div className="flex items-center justify-around h-20 px-4">
          {links.map((link) => {
            const active = isActive(link.path);
            const Icon = link.icon;

            return (
              <button
                key={link.path}
                onClick={() => navigate(getLinkWithTable(link.path))}
                className="relative flex flex-col items-center justify-center w-full h-full"
              >
                <div
                  className={`relative z-10 flex flex-col items-center transition-all duration-300 ${
                    active ? "text-slate-900 scale-110" : "text-slate-400"
                  }`}
                >
                  <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest mt-1 transition-opacity ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {link.label}
                  </span>
                </div>

                {active && (
                  <motion.div
                    layoutId="mobileActiveBG"
                    className="absolute inset-x-2 inset-y-2 bg-slate-50 rounded-2xl -z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}

                {active && (
                  <motion.div
                    layoutId="topBar"
                    className="absolute top-0 w-12 h-1 bg-slate-900 rounded-b-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
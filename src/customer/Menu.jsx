import { useCart, TAKEAWAY_TABLE } from "../context/CartContext";
import { useProducts } from "../context/ProductContext";
import { useUI } from "../context/UIContext";
import ProductCard from "../components/ProductCard";
import RestaurantLoader from "../components/RestaurantLoader";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingCart,
  Utensils,
  ArrowRight,
  Filter,
  Table as TableIcon,
  ChevronDown,
  X,
  Package
} from "lucide-react";
import API from "../api/axios";
import { getCurrentRestaurantId, tenantKey } from "../utils/tenantCache";
import butter from "../assets/images/butter.png";
import onion from "../assets/images/onion.png";
import gopi from "../assets/images/gopi.png";
import masa from "../assets/images/masa.png";
import mango from "../assets/images/mango.png";
import fal from "../assets/images/fal.png";
export default function Menu() {
  const { addToCart, removeFromCart, cart = [], table, setTable } = useCart();
  const { products, orderedCategories } = useProducts();
  const { banners: activeSlides } = useUI();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get("mode");
  const isTakeaway = table === TAKEAWAY_TABLE || mode === "takeaway";
  // Detect if customer is adding takeaway items to an existing dine-in order
  const addTakeawayMode = searchParams.get("addTakeaway") === "true";

  const [searchQuery, setSearchQuery] = useState("");
  const [slide, setSlide] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [foodTypeFilter, setFoodTypeFilter] = useState("all");
  // table modal removed – we rely on QR chooser or query param
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const sectionRefs = useRef({});
  const [showLoader, setShowLoader] = useState(() => {
    // Only show loader if not seen before
    const _rid = getCurrentRestaurantId();
    return !localStorage.getItem(tenantKey("hasSeenMenuLoader", _rid));
  });

  useEffect(() => {
    if (showLoader) {
      const timer = setTimeout(() => {
        setShowLoader(false);
        const _rid = getCurrentRestaurantId();
        localStorage.setItem(tenantKey("hasSeenMenuLoader", _rid), "true");
      }, 1500); // Show for 1.5 seconds
      return () => clearTimeout(timer);
    }
  }, [showLoader]);

  // Automatic table from QR code / mode handling
  useEffect(() => {
    const urlTable = searchParams.get("table");
    const mode = searchParams.get("mode");
    const from = searchParams.get("from");

    // if the user has scanned a table but hasn't chosen dine-in/takeaway yet,
    // send them to the chooser page first.  That page will in turn navigate
    // back here with either ?table=... or ?mode=takeaway.
    // only skip the redirect when we've just come from the chooser itself
    // (marked via ?from=chooser).  otherwise we want the guest to make a
    // choice even if the cart context already grabbed the table from the URL.
    if (urlTable && !mode && !isTakeaway && from !== "chooser") {
      const _rid = getCurrentRestaurantId();
      if (localStorage.getItem(tenantKey(`tableModeChosen_${urlTable}`, _rid))) {
        setTable(urlTable);
        navigate(`/menu?table=${urlTable}`, { replace: true });
      } else {
        navigate(`/choose-mode?table=${urlTable}`, { replace: true });
      }
      return;
    }

    if (mode === "takeaway") {
      const _rid = getCurrentRestaurantId();
      if (!localStorage.getItem(tenantKey(`tableModeChosen_${TAKEAWAY_TABLE}`, _rid))) {
        navigate(`/choose-mode?mode=takeaway`, { replace: true });
        return;
      }
      // don't prompt for a table; CartContext initialiser already set the
      // special TAKEAWAY_TABLE value but in case the user navigated here
      // after the fact we'll ensure it again and wipe any manual input.
      setTable(TAKEAWAY_TABLE);
      return;
    }

    if (urlTable && urlTable.trim() !== "") {
      const cleanTable = urlTable.trim().replace(/^0+/, "") || "1";
      setTable(cleanTable);
    } else if (!table) {
      // no table provided: continue showing menu but user will be prompted by
      // the QR chooser page; we no longer display an overlay here.
    }
  }, [searchParams, setTable, table, navigate]);

  const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!trimmedQuery) return [];

    // include even sold‑out items so the user sees the stock badge
    return products.filter(product => {
      const nameLower = product.name.toLowerCase();
      return nameLower.split(/\s+/).some(word => word.startsWith(trimmedQuery));
    }).slice(0, 8);
  }, [trimmedQuery]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900">
      <AnimatePresence>
        {showLoader && <RestaurantLoader />}
      </AnimatePresence>

      {!showLoader && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col flex-1">
          {/* Takeaway Mode Banner - Shows when customer is adding takeaway items to dine-in order */}
          {addTakeawayMode && (
            <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package size={20} />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">Adding Takeaway Items</p>
                  <p className="text-[10px] opacity-80">Items added here will be marked for takeaway</p>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/cart?table=${table}`)}
                className="px-4 py-2 bg-white text-orange-600 rounded-xl text-xs font-black uppercase"
              >
                Done
              </button>
            </div>
          )}
          
          {/* HEADER */}
          <header className="relative z-40 backdrop-blur-xl bg-white/80 border-b border-slate-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                {/* header removed per request; table assignment UI remains below */}

                {(table || isTakeaway) && (
  <div className="relative group select-none">
    {/* Subtle soft glow to anchor the element */}
    <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full" />

    <div className="relative flex items-center gap-3 bg-white/80 backdrop-blur-md border border-slate-200/60 px-4 py-2 rounded-2xl shadow-sm overflow-hidden">
      
      {/* Decorative Gradient Line (Top) */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

      {/* The Indicator Icon */}
      <div className="relative flex items-center justify-center">
        <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shadow-inner">
          <TableIcon size={16} className="text-slate-600" />
        </div>
        
        {/* Modern Live Status Dot */}
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-[1.5px] border-white"></span>
        </span>
      </div>

      {/* Text Stack */}
      <div className="flex flex-col pr-1">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight">
          {isTakeaway ? "Order Type" : "Assigned"}
        </span>
        <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">
          {isTakeaway ? "Takeaway" : `Table ${table}`}
        </span>
      </div>
    </div>
  </div>
)}
                
                {/* Takeaway/Dine-in Toggle Button in Menu.jsx */}
                {table && table !== TAKEAWAY_TABLE && !addTakeawayMode && (
                  <button 
                    onClick={() => {
                      // Navigate to takeaway mode while preserving table context in URL if needed
                      navigate(`/menu?mode=takeaway&from=chooser`);
                    }}
                    className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200/60 px-4 py-2 rounded-2xl shadow-sm hover:bg-orange-50 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-orange-100">
                      <Package size={16} className="text-orange-600" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight">
                        Switch To
                      </span>
                      <span className="text-sm font-black text-orange-600 uppercase tracking-tighter">
                        Takeaway
                      </span>
                    </div>
                  </button>
                )}

                {isTakeaway && !addTakeawayMode && (
                  <button 
                    onClick={() => {
                      // If we have a stored table or just go back to chooser/last table
                      const _rid = getCurrentRestaurantId();
                      const storedTable = localStorage.getItem(tenantKey("lastTable", _rid)) || "1";
                      navigate(`/menu?table=${storedTable}&from=chooser`);
                    }}
                    className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200/60 px-4 py-2 rounded-2xl shadow-sm hover:bg-emerald-50 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-emerald-100">
                      <TableIcon size={16} className="text-emerald-600" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight">
                        Switch To
                      </span>
                      <span className="text-sm font-black text-emerald-600 uppercase tracking-tighter">
                        Dine-In
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search size={18} strokeWidth={2.5} />
                </div>

                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What are you craving?"
                  className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-100/50 border-none text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-slate-400"
                />

                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                )}

                <AnimatePresence>
                  {isSearchFocused && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[60] max-h-[340px] overflow-y-auto"
                    >
                      {suggestions.length > 0 ? (
                        suggestions.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSearchQuery(p.name);
                              setIsSearchFocused(false);
                            }}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-50 last:border-none"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.target.src = "https://via.placeholder.com/40?text=🍛";
                                }}
                              />
                              <div className="text-left min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                                  {p.category?.name || p.category}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <p className="text-xs font-black text-emerald-600 flex-shrink-0">
                                ₹{p.price}
                              </p>
                              {!p.isAvailable && (
                                <span className="text-[8px] font-black uppercase bg-rose-600 text-white px-1 rounded">
                                  Sold Out
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      ) : trimmedQuery ? (
                        <div className="py-10 px-6 text-center">
                          <div className="mx-auto w-20 h-20 mb-5 opacity-60">
                            <svg
                              viewBox="0 0 100 100"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-full h-full text-slate-300"
                            >
                              <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="5" />
                              <path
                                d="M35 38 L45 48 L65 28 M32 68 L68 68"
                                stroke="currentColor"
                                strokeWidth="6"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>

                          <h3 className="text-lg font-bold text-slate-800 mb-2">No matches found</h3>
                          <p className="text-sm text-slate-500 mb-5">
                            Try searching for Biryani, Samosa, Paneer, Chai...
                          </p>

                          <div className="flex flex-wrap justify-center gap-2">
                            {['Biryani', 'Samosa', 'Paneer', 'Chai'].map((item) => (
                              <button
                                key={item}
                                onClick={() => setSearchQuery(item)}
                                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-medium text-slate-700 transition"
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 px-6 text-center text-slate-400 text-sm italic">
                          Start typing to discover delicious dishes...
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Filters & Category Bar */}
              <div className="border-t border-slate-50 bg-white/50 py-3">
                <div className="mx-auto flex min-w-0 max-w-7xl items-center gap-2 px-4 sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1 overflow-x-auto [-webkit-overflow-scrolling:touch] sm:flex-none sm:overflow-visible">
                    <div className="flex w-max max-w-none rounded-full border border-slate-200 bg-slate-100 p-1 sm:w-auto">
                    {['all', 'veg', 'non-veg'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFoodTypeFilter(type)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-black uppercase tracking-tighter transition-all sm:px-3 ${
                          foodTypeFilter === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {type === 'veg' && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                        {type === 'non-veg' && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />}
                        {type === 'all' ? 'All' : type}
                      </button>
                    ))}
                  </div>
                  </div>

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                      className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:border-slate-900 active:scale-95 sm:gap-2 sm:px-4"
                    >
                      <span>Quick Menu</span>
                      <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform duration-300 ${isCategoryOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isCategoryOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setIsCategoryOpen(false)} 
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-100 bg-white py-2 shadow-2xl max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-1/2 sm:left-auto sm:w-48 sm:translate-x-0"
                          >
                            <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                              <div className="px-5 py-2 border-b border-slate-100 bg-slate-50/50">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Select Category</span>
                              </div>
                              {orderedCategories.map((cat) => (
                                <button
                                  key={cat}
                                  onClick={() => {
                                    sectionRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
                                    setIsCategoryOpen(false);
                                  }}
                                  className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none"
                                >
                                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest leading-none block">
                                    {cat}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>


            </div>
          </header>

          {/* Banner Slider */}
          {!searchQuery && activeSlides.length > 0 && (
            <div className="relative h-[45vh] overflow-hidden bg-slate-900">
              <div
                className="absolute inset-0 flex transition-transform duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ transform: `translateX(-${slide * 100}%)` }}
              >
                {activeSlides.map((s, i) => (
                  <div key={s.id || i} className="w-full h-full flex-shrink-0 relative">
                    <img src={s.imageUrl} className="w-full h-full object-cover" alt={s.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />
                    <div className="absolute bottom-12 left-6 right-6 max-w-7xl mx-auto">
                      <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-orange-400 text-[10px] font-black uppercase tracking-[0.4em] inline-block mb-2"
                      >
                        {s.tag || "Exclusive Offer"}
                      </motion.span>
                      <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-black text-white uppercase tracking-tighter leading-none"
                      >
                        {s.title}
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-slate-300 text-sm font-medium mt-3 max-w-md"
                      >
                        {s.description}
                      </motion.p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                {activeSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      slide === i ? "w-10 bg-orange-500" : "w-2 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Product Grid */}
          <main className="max-w-7xl mx-auto w-full px-4 py-12">
            {(() => {
              const q = searchQuery.toLowerCase().trim();
              let foundMatch = false;

              const renderedSections = orderedCategories.map((cat) => {
                // products should remain visible even when sold out; ProductCard handles the overlay
                const filtered = products.filter((p) => {
                  const matchesSearch = (p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
                  const matchesCategory = (p.category || "Other") === cat;
                  let matchesFoodType = true;
                  const pType = (p.type || "").toLowerCase();
                  if (foodTypeFilter === "veg") matchesFoodType = pType === "veg";
                  if (foodTypeFilter === "non-veg") matchesFoodType = pType === "non-veg";
                  return matchesSearch && matchesCategory && matchesFoodType;
                });

                if (filtered.length > 0) {
                  foundMatch = true;
                  return (
                    <section key={cat} ref={(el) => (sectionRefs.current[cat] = el)} className="mb-20 scroll-mt-48">
                      <div className="flex items-end justify-between mb-8 border-b-2 border-slate-900/5 pb-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-1">Collection</span>
                          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{cat}</h2>
                        </div>
                        <span className="text-xs font-black text-slate-300">{filtered.length} Dishes</span>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
                        {filtered.map((product) => (
                          <div key={product._id || product.id}>
                            <ProductCard
                              product={product}
                              initialQty={cart.filter(i => (i._id || i.id) === (product._id || product.id) && (addTakeawayMode ? i.isTakeaway : !i.isTakeaway)).reduce((s, i) => s + i.qty, 0)}
                              onAdd={() => product.isAvailable !== false && addToCart(product, addTakeawayMode)}
                              onRemove={() => removeFromCart(product._id || product.id, null, addTakeawayMode)}
                              onAddConfigured={(configuredItem) => product.isAvailable !== false && addToCart({ ...configuredItem, isTakeaway: addTakeawayMode }, addTakeawayMode)}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }
                return null;
              });

              if (!foundMatch) {
                return (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Filter className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">No Dishes Found</h3>
                    <p className="text-slate-400 text-sm mt-1">Try resetting filters or changing your search.</p>
                    <button
                      onClick={() => { setSearchQuery(""); setFoodTypeFilter("all"); }}
                      className="mt-6 text-xs font-black uppercase text-orange-500 underline"
                    >
                      Reset All
                    </button>
                  </div>
                );
              }
              return renderedSections;
            })()}
          </main>

          {/* Floating Cart Button */}
          <AnimatePresence>
            {totalItems > 0 && (
              <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="fixed bottom-6 inset-x-4 z-50 flex justify-center pointer-events-none mb-19 sm:mb-0"
              >
                {/* Build cart link preserving mergeId for Add More Items flow */}
                <Link to={(() => {
                  const params = new URLSearchParams();
                  if (isTakeaway) {
                    params.set("mode", "takeaway");
                  } else if (table) {
                    params.set("table", table);
                  }
                  // Preserve mergeId if coming from Add More Items
                  const mergeId = searchParams.get("mergeId");
                  if (mergeId) params.set("mergeId", mergeId);
                  const qs = params.toString();
                  return isTakeaway ? `/takeaway-cart${qs ? `?${qs}` : ""}` : `/cart${qs ? `?${qs}` : ""}`;
                })()} className="pointer-events-auto group">
                  <div className="bg-slate-950 text-white px-8 py-4 rounded-[2rem] flex items-center gap-8 shadow-2xl transition-all hover:scale-[1.02] active:scale-95">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <ShoppingCart size={24} />
                        <span className="absolute -top-3 -right-3 bg-orange-500 text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-slate-950">
                          {totalItems}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Items Added</p>
                        <p className="text-sm font-bold leading-none">View Selection</p>
                      </div>
                    </div>
                    <div className="w-[1px] h-8 bg-slate-800" />
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}
    </div>
  );
}

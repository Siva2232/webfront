import React, { useState, useRef, useEffect } from "react";
import { Trash2, Plus, Upload, Save, CheckCircle, RefreshCcw, LayoutGrid, Sparkles } from "lucide-react";
import API from "../api/axios";

export default function PromoPanel() {
  const [promos, setPromos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const defaultPromoData = [
    { 
      title: "Art of Dining", 
      description: "Discover Flavors Beyond Boundaries", 
      imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1600&q=80", 
      tag: "Seasonal Menu",
      isPublished: true 
    },
    { 
      title: "Purely Organic", 
      description: "Farm to Fork, Every Single Day", 
      imageUrl: "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=1600", 
      tag: "Freshly Picked",
      isPublished: true 
    },
    { 
      title: "Chef's Special", 
      description: "Handcrafted Culinary Masterpieces", 
      imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80", 
      tag: "Must Try",
      isPublished: true 
    },
    { 
      title: "Midnight Feast", 
      description: "The best flavors for the night owl", 
      imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80", 
      tag: "Late Night",
      isPublished: true 
    },
    { 
      title: "Dessert Heaven", 
      description: "Sweet endings to beautiful stories", 
      imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1600&q=80", 
      tag: "Sweet Treats",
      isPublished: true 
    }
  ];

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    try {
      setIsLoading(true);
      const { data } = await API.get("/offers");
      const list = Array.isArray(data) ? data : [];
      if (list.length === 0) {
        setPromos(defaultPromoData);
      } else {
        setPromos(list);
      }
    } catch (error) {
      console.error("Error fetching promos:", error);
      setPromos(defaultPromoData);
    } finally {
      setIsLoading(false);
    }
  };

  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const [activeId, setActiveId] = useState(null);

  const handleReset = async () => {
    if (window.confirm("Restore defaults? This will delete existing promos.")) {
      try {
        for (const promo of promos) {
          if (promo._id) await API.delete(`/offers/${promo._id}`);
        }
        setPromos(defaultPromoData);
        for (const promo of defaultPromoData) {
          await API.post("/offers", promo);
        }
        fetchPromos();
        window.dispatchEvent(new Event("promosUpdated"));
      } catch (error) {
        console.error("Error resetting promos:", error);
      }
    }
  };

  const saveToLocal = async () => {
    try {
      setShowSuccess(true);
      for (const promo of promos) {
        
        // Prepare clean payload
        const payload = {
            title: promo.title,
            description: promo.description,
            imageUrl: promo.imageUrl,
            tag: promo.tag,
            isPublished: promo.isPublished
        };

        if (promo._id) {
          await API.put(`/offers/${promo._id}`, payload);
        } else {
          try {
              await API.post("/offers", payload);
          } catch(err) {
              console.error("Failed to create offer:", promo, err.response?.data);
              throw err;
          }
        }
      }
      fetchPromos();
      window.dispatchEvent(new Event("promosUpdated"));
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving promos:", error);
      alert("Failed to save promos: " + (error.response?.data?.message || error.message));
      setShowSuccess(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPromos(promos.map(p => (p._id || p.id) === activeId ? { ...p, imageUrl: reader.result } : p));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-12 pb-40 font-sans text-black">
      <div className="max-w-6xl mx-auto">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept="image/*" 
          className="hidden" 
        />

        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg">
              <LayoutGrid size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-black uppercase italic tracking-tighter leading-none">Deal Lab</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em] mt-2 italic">Creative Studio</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleReset} className="p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl transition-all">
              <RefreshCcw size={20} className="text-gray-400" />
            </button>
            <button
              onClick={() => setPromos([...promos, { 
                id: Date.now(), 
                title: "New Specific Offer", 
                description: "Describe the offer...", 
                imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b", 
                tag: "DEAL",
                isPublished: true 
              }])}
              className="px-8 py-4 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl flex items-center gap-3"
            >
              <Plus size={18} strokeWidth={3} /> Add Card
            </button>
          </div>
        </header>

        {/* --- GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {isLoading ? (
            <div className="col-span-full text-center p-20">Loading...</div>
          ) : promos.map((promo) => (
            <div 
              key={promo._id || promo.id} 
              className="group relative bg-white border-2 border-gray-100 rounded-[2.5rem] p-6 transition-all hover:border-black shadow-sm hover:shadow-2xl"
            >
              {/* Draft Badge - only shows when not published */}
              {!promo.isPublished && (
                <div className="absolute top-6 right-6 z-10">
                  <div className="bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-md border border-orange-200">
                    Draft
                  </div>
                </div>
              )}

              {/* IMAGE AREA */}
              <div
                onClick={() => { 
                  setActiveId(promo._id || promo.id); 
                  fileInputRef.current?.click(); 
                }}
                className="relative aspect-[4/3] bg-gray-50 rounded-[1.8rem] overflow-hidden mb-6 border border-dashed border-gray-200 cursor-pointer hover:border-gray-300 transition-all"
              >
                {promo.imageUrl ? (
                  <img 
                    src={promo.imageUrl} 
                    alt={promo.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                    <Upload size={32} className="mb-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Upload Image</span>
                  </div>
                )}
              </div>

              {/* TEXT INPUTS */}
              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Title</label>
                  <input
                    placeholder="Enter heading..."
                    value={promo.title}
                    onChange={(e) => setPromos(promos.map(p => (p._id || p.id) === (promo._id || promo.id) ? {...p, title: e.target.value} : p))}
                    className="w-full bg-transparent border-2 border-gray-100 rounded-xl px-5 py-4 text-lg font-black text-black focus:border-black outline-none transition-all placeholder:text-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Caption</label>
                  <textarea
                    placeholder="Describe this offer..."
                    value={promo.description}
                    onChange={(e) => setPromos(promos.map(p => (p._id || p.id) === (promo._id || promo.id) ? {...p, description: e.target.value} : p))}
                    className="w-full bg-transparent border-2 border-gray-100 rounded-xl px-5 py-4 text-sm text-gray-700 font-medium h-28 resize-none focus:border-black outline-none transition-all placeholder:text-gray-300"
                  />
                </div>

                <div className="flex justify-between items-center pt-3">
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                      <Sparkles size={14} className="text-gray-400" />
                      <input
                        value={promo.tag || ""}
                        onChange={(e) => setPromos(promos.map(p => (p._id || p.id) === (promo._id || promo.id) ? {...p, tag: e.target.value} : p))}
                        className="text-[11px] font-black uppercase text-black bg-transparent border-none outline-none min-w-32"
                        placeholder="ADD TAG"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPromos(promos.map(p => (p._id || p.id) === (promo._id || promo.id) ? { ...p, isPublished: !p.isPublished } : p))}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${promo.isPublished ? 'bg-black' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${promo.isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <span className={`text-[11px] font-black uppercase tracking-widest ${promo.isPublished ? 'text-black' : 'text-gray-500'}`}>
                        {promo.isPublished ? 'Live' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (window.confirm("Delete this card?")) {
                        try {
                          if (promo._id) {
                            await API.delete(`/offers/${promo._id}`);
                          }
                          setPromos(promos.filter(p => (p._id || p.id) !== (promo._id || promo.id)));
                        } catch (err) {
                          console.error("Failed to delete promo", err);
                        }
                      }
                    }}
                    className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* --- STICKY FOOTER --- */}
        <div className="fixed bottom-10 inset-x-0 flex justify-center px-6 z-50 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-xl border border-gray-200 p-3 rounded-[3rem] shadow-2xl pointer-events-auto">
            <button
              onClick={saveToLocal}
              className={`px-16 py-6 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] flex items-center gap-5 transition-all ${showSuccess ? "bg-emerald-600 text-white shadow-lg" : "bg-black text-white hover:bg-gray-800"}`}
            >
              {showSuccess ? <CheckCircle size={24} /> : <Save size={24} />}
              {showSuccess ? "Deployed Successfully" : "Deploy to Live"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
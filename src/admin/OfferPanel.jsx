import React, { useState, useRef, useEffect } from "react";
import { Trash2, Plus, Upload, X,LayoutGrid  } from "lucide-react";
import API from "../api/axios";
import StickyPageHeader from "./components/StickyPageHeader";

export default function PromoPanel() {
  const [promos, setPromos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    tag: "",
    isPublished: true
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    try {
      setIsLoading(true);
      const { data } = await API.get("/offers");
      setPromos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching promos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (promo = null) => {
    if (promo) {
      setEditingPromo(promo);
      setFormData({
        title: promo.title,
        description: promo.description,
        imageUrl: promo.imageUrl,
        tag: promo.tag,
        isPublished: promo.isPublished
      });
    } else {
      setEditingPromo(null);
      setFormData({
        title: "",
        description: "",
        imageUrl: "",
        tag: "",
        isPublished: true
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData };

      if (editingPromo) {
        await API.put(`/offers/${editingPromo._id}`, payload);
      } else {
        await API.post("/offers", payload);
      }
      setIsModalOpen(false);
      fetchPromos();
      window.dispatchEvent(new Event("promosUpdated"));
    } catch (error) {
      console.error("Error saving promo:", error);
      const msg = error.response?.data?.message || "Failed to save promo";
      alert(msg);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this offer card?")) {
      try {
        await API.delete(`/offers/${id}`);
        setPromos(promos.filter(p => p._id !== id));
      } catch (error) {
        console.error("Failed to delete promo", error);
      }
    }
  };

  if (isLoading) return <div className="p-10 text-center font-bold">Loading Deals...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 font-sans text-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />

      <StickyPageHeader
        icon={LayoutGrid}
        eyebrow="Promotions"
        title="Offers"
        subtitle="Create and manage your offer cards"
        rightAddon={
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md shadow-zinc-900/15 transition-colors hover:bg-zinc-800"
          >
            <Plus size={14} />
            New offer
          </button>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:px-8">

        {/* Promo Grid - unchanged */}
        {promos.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-[3rem]">
            <LayoutGrid size={64} className="mx-auto text-gray-100 mb-6" />
            <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-sm">No active deals found. Create your first offer!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {promos.map((promo) => (
              <div 
                key={promo._id} 
                className="group relative bg-white border-2 border-gray-100 rounded-[2.5rem] p-6 transition-all hover:border-black shadow-sm hover:shadow-2xl"
              >
                {!promo.isPublished && (
                  <div className="absolute top-6 right-6 z-10">
                    <div className="bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-md border border-orange-200">Draft</div>
                  </div>
                )}

                <div
                  onClick={() => openModal(promo)}
                  className="relative aspect-[4/3] bg-gray-50 rounded-[1.8rem] overflow-hidden mb-6 border border-gray-100 cursor-pointer group-hover:border-black transition-all"
                >
                  <img src={promo.imageUrl} alt={promo.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 shadow-lg">
                    <span className="text-[10px] font-black uppercase tracking-widest text-black">{promo.tag}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="cursor-pointer" onClick={() => openModal(promo)}>
                    <h3 className="text-2xl font-black text-black uppercase italic tracking-tighter leading-tight">{promo.title}</h3>
                    <p className="text-sm text-gray-500 font-medium line-clamp-2 mt-2">{promo.description}</p>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${promo.isPublished ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{promo.isPublished ? 'Live' : 'Draft'} Edition</span>
                    </div>
                    <button onClick={() => handleDelete(promo._id)} className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ==================== COMPACT MODAL (Reduced Height) ==================== */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[92vh] overflow-y-auto">
              <div className="p-5 md:p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xl font-black uppercase italic tracking-tighter">
                    {editingPromo ? 'Update Deal' : 'New Creation'}
                  </h2>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={22} />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Smaller Image Upload */}
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="relative aspect-[4/3] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 overflow-hidden cursor-pointer group hover:border-black transition-all flex items-center justify-center"
                  >
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="text-center px-4">
                        <Upload size={28} className="mx-auto text-gray-200 mb-2 group-hover:text-black transition-colors" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 block">Click to Upload Artwork</span>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                  </div>

                  {/* Live Toggle - Compact */}
                  <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-2xl">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Live Edition</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isPublished: !prev.isPublished }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isPublished ? 'bg-black' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Form Fields - Tighter spacing */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Hero Heading</label>
                      <input 
                        value={formData.title} 
                        onChange={(e) => setFormData({...formData, title: e.target.value})} 
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-base font-black hover:bg-gray-100 focus:bg-white focus:ring-2 ring-gray-100 outline-none transition-all placeholder:text-gray-200"
                        placeholder="Enter catchy title..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tagline</label>
                      <input 
                        value={formData.tag} 
                        onChange={(e) => setFormData({...formData, tag: e.target.value})} 
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-black text-xs uppercase tracking-widest hover:bg-gray-100 focus:bg-white focus:ring-2 ring-gray-100 outline-none transition-all placeholder:text-gray-200"
                        placeholder="e.g. LIMITED OFFER"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Narrative</label>
                      <textarea 
                        value={formData.description} 
                        onChange={(e) => setFormData({...formData, description: e.target.value})} 
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm leading-relaxed hover:bg-gray-100 focus:bg-white focus:ring-2 ring-gray-100 outline-none h-16 resize-none placeholder:text-gray-200"
                        placeholder="Describe the value proposition..."
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <button 
                    onClick={handleSave}
                    className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-xs hover:bg-gray-800 transition-all shadow-xl"
                  >
                    {editingPromo ? 'Deploy Update' : 'Launch Deal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
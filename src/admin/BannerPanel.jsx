import React, { useState, useRef, useEffect } from "react";
import { Trash2, Plus, Layout, Upload, X } from "lucide-react";
import API from "../api/axios";
import { useUI } from "../context/UIContext";
import StickyPageHeader from "./components/StickyPageHeader";

export default function BannerPanel() {
  const { banners, fetchBanners, isLoading: uiLoading } = useUI();
  const [slides, setSlides] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    tag: "",
    isActive: true
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    setSlides(Array.isArray(banners) ? banners : []);
  }, [banners]);

  const openModal = (slide = null) => {
    if (slide) {
      setEditingSlide(slide);
      setFormData({
        title: slide.title || "",
        description: slide.description || "",
        imageUrl: slide.imageUrl || "",
        tag: slide.tag || "",
        isActive: slide.isActive ?? true
      });
    } else {
      setEditingSlide(null);
      setFormData({
        title: "",
        description: "",
        imageUrl: "",
        tag: "",
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, imageUrl: reader.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData };
      
      if (editingSlide && editingSlide._id) {
        await API.put(`/banners/${editingSlide._id}`, payload);
      } else {
        await API.post("/banners", payload);
      }
      setIsModalOpen(false);
      await fetchBanners();
      window.dispatchEvent(new Event("bannersUpdated"));
    } catch (error) {
      console.error("Error saving banner:", error);
      const msg = error.response?.data?.message || "Failed to save banner";
      alert(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (window.confirm("Delete this banner?")) {
      try {
        await API.delete(`/banners/${id}`);
        await fetchBanners();
        window.dispatchEvent(new Event("bannersUpdated"));
      } catch (error) {
        console.error("Error deleting banner:", error);
      }
    }
  };

  if (uiLoading && slides.length === 0)
    return <div className="p-10 text-center font-bold">Loading Banners...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 font-sans text-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />

      <StickyPageHeader
        icon={Layout}
        eyebrow="Promotions"
        title="Banners"
        subtitle="Create and manage your home banners"
        rightAddon={
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md shadow-zinc-900/15 transition-colors hover:bg-zinc-800"
          >
            <Plus size={14} />
            New banner
          </button>
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:px-8">

        {slides.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-3xl">
            <Layout size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No banners found. Start by creating one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slides.map((slide) => (
              <div key={slide._id} className="bg-white border-2 border-gray-100 p-4 rounded-2xl hover:border-black transition-all group">
                <div
                  className="relative aspect-video bg-gray-50 overflow-hidden rounded-xl mb-4 cursor-pointer"
                  onClick={() => openModal(slide)}
                >
                  <img src={slide.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={slide.title} />
                  <div className="absolute top-2 left-2 bg-black text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{slide.tag}</div>
                </div>
                <div className="flex justify-between items-start">
                  <div className="cursor-pointer flex-1" onClick={() => openModal(slide)}>
                    <h3 className="font-black text-lg leading-tight uppercase tracking-tight">{slide.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{slide.description}</p>
                  </div>
                  <button onClick={() => handleDelete(slide._id)} className="text-gray-200 hover:text-red-500 p-2 transition-colors ml-4">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ==================== COMPACT SMALL MODAL ==================== */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xl font-black uppercase italic tracking-tighter">
                    {editingSlide ? 'Edit Banner' : 'New Banner'}
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
                    className="relative aspect-[16/9] bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl overflow-hidden cursor-pointer group hover:border-black transition-all"
                  >
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Upload size={28} className="mb-2 group-hover:text-black transition-colors" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-center px-4">Click to Upload Image</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>

                  {/* Form Fields - Compact */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Heading</label>
                      <input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 ring-black outline-none transition-all"
                        placeholder="Banner Title"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tag</label>
                      <input
                        value={formData.tag}
                        onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 ring-black outline-none transition-all"
                        placeholder="e.g. NEW"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold leading-relaxed focus:ring-2 ring-black outline-none transition-all h-16 resize-none"
                        placeholder="Enter banner details..."
                      />
                    </div>
                  </div>

                  {/* Active Toggle (Optional - added for consistency) */}
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Active Slide</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isActive ? 'bg-black' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    className="w-full bg-black text-white py-3.5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs hover:bg-gray-800 transition-all shadow-xl"
                  >
                    {editingSlide ? 'Update Banner' : 'Publish Banner'}
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
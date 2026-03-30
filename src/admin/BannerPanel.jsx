import React, { useState, useRef, useEffect } from "react";
import { Trash2, Plus, Layout, Upload, X } from "lucide-react";
import API from "../api/axios";

export default function BannerPanel() {
  const [slides, setSlides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const { data } = await API.get("/banners");
      setSlides(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
      if (editingSlide && editingSlide._id) {
        await API.put(`/banners/${editingSlide._id}`, formData);
      } else {
        await API.post("/banners", formData);
      }
      setIsModalOpen(false);
      fetchBanners();
      window.dispatchEvent(new Event("bannersUpdated"));
    } catch (error) {
      console.error("Error saving banner:", error);
      alert("Failed to save banner");
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (window.confirm("Delete this banner?")) {
      try {
        await API.delete(`/banners/${id}`);
        setSlides((prev) => prev.filter((s) => s._id !== id));
      } catch (error) {
        console.error("Error deleting banner:", error);
      }
    }
  };

  if (isLoading) return <div className="p-10 text-center font-bold">Loading Banners...</div>;

  return (
    <div className="min-h-screen bg-white p-6 md:p-12 font-sans text-black">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 pb-8 border-b border-gray-100 gap-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-black flex items-center justify-center">
              <Layout size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Banner Lab</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-1">Management Console</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openModal()} className="bg-black text-white px-8 py-4 font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-gray-800 transition-all shadow-lg rounded-xl">
              <Plus size={18} /> New Slide
            </button>
          </div>
        </header>

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

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 md:p-10">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">{editingSlide ? 'Edit Banner' : 'New Banner'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-5">
                  <div
                    onClick={() => fileInputRef.current.click()}
                    className="relative aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl overflow-hidden cursor-pointer group hover:border-black transition-all"
                  >
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Upload" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Upload size={32} className="mb-2 group-hover:text-black transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">Click to Upload Image</span>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Heading</label>
                      <input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 font-bold text-sm focus:ring-2 ring-black outline-none transition-all"
                        placeholder="Banner Title"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Tag</label>
                      <input
                        value={formData.tag}
                        onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 font-bold text-sm focus:ring-2 ring-black outline-none transition-all"
                        placeholder="e.g. NEW"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 font-bold text-sm focus:ring-2 ring-black outline-none transition-all h-20 resize-none"
                      placeholder="Enter banner details..."
                    />
                  </div>

                  <button
                    onClick={handleSave}
                    className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-gray-800 transition-all shadow-xl mt-2"
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

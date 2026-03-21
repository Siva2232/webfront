import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProducts } from "../context/ProductContext";
import { ArrowLeft, Save, IndianRupee, Type, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast"; // notifications

export default function EditForm() {
  const { id } = useParams(); // Gets the ID from the URL
  const navigate = useNavigate();
  const { products, addProduct, updateProduct, categories } = useProducts();
  
  const isEditMode = Boolean(id);
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "Main Courses",
    type: "veg",
    description: "",
    image: "",
    subItems: [],
  });

  // 1. If we are editing, find the product and fill the form
  useEffect(() => {
    if (isEditMode) {
      const existingProduct = products.find((p) => p._id === id);
      if (existingProduct) {
        setFormData({
          ...existingProduct,
          price: existingProduct.price.toString(),
        });
      }
    }
  }, [id, isEditMode, products]);

  const addSubItemGroup = () => {
    setFormData(prev => ({
      ...prev,
      subItems: [...(prev.subItems || []), { groupName: "", type: "single", required: false, options: [] }],
    }));
  };

  const updateSubItemGroup = (groupIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      subItems: prev.subItems.map((g, idx) => idx === groupIndex ? { ...g, [field]: value } : g),
    }));
  };

  const removeSubItemGroup = (groupIndex) => {
    setFormData(prev => ({
      ...prev,
      subItems: prev.subItems.filter((_, idx) => idx !== groupIndex),
    }));
  };

  const addSubItemOption = (groupIndex) => {
    setFormData(prev => ({
      ...prev,
      subItems: prev.subItems.map((g, idx) =>
        idx === groupIndex
          ? { ...g, options: [...(g.options || []), { name: "", price: 0 }] }
          : g
      ),
    }));
  };

  const updateSubItemOption = (groupIndex, optionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      subItems: prev.subItems.map((g, idx) =>
        idx === groupIndex
          ? {
              ...g,
              options: g.options.map((opt, optIdx) =>
                optIdx === optionIndex ? { ...opt, [field]: value } : opt
              ),
            }
          : g
      ),
    }));
  };

  const removeSubItemOption = (groupIndex, optionIndex) => {
    setFormData(prev => ({
      ...prev,
      subItems: prev.subItems.map((g, idx) =>
        idx === groupIndex
          ? { ...g, options: g.options.filter((_, optIdx) => optIdx !== optionIndex) }
          : g
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formattedData = { ...formData, price: parseFloat(formData.price) };

    try {
      if (isEditMode) {
        await updateProduct(id, formattedData);
        toast.success("Product updated successfully");
      } else {
        await addProduct(formattedData);
        toast.success("Product created successfully");
      }
      navigate("/admin/products"); // Go back to list after saving
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || "Failed to save product";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate("/admin/products")}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 font-black uppercase text-[10px] tracking-widest"
        >
          <ArrowLeft size={16} /> Cancel & Exit
        </button>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-100">
          <header className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 italic uppercase">
              {isEditMode ? "Edit" : "New"} <span className="text-blue-600">Product</span>
            </h1>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Product Name</label>
              <input 
                required
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Price (₹)</label>
                <input 
                  required
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black italic"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3 bg-slate-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Subitem Groups</p>
                <button
                  type="button"
                  onClick={addSubItemGroup}
                  className="text-xs font-black uppercase tracking-wider text-white bg-slate-900 px-3 py-1 rounded-lg"
                >
                  + Add Group
                </button>
              </div>

              {(formData.subItems || []).map((group, groupIdx) => (
                <div key={groupIdx} className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="grid gap-2 sm:grid-cols-3 items-end">
                    <input
                      type="text"
                      value={group.groupName}
                      onChange={(e) => updateSubItemGroup(groupIdx, "groupName", e.target.value)}
                      placeholder="Group name (e.g., Sauce)"
                      className="border rounded-lg px-3 py-2"
                    />
                    <select
                      value={group.type}
                      onChange={(e) => updateSubItemGroup(groupIdx, "type", e.target.value)}
                      className="border rounded-lg px-3 py-2"
                    >
                      <option value="single">Single select</option>
                      <option value="multiple">Multi select</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(e) => updateSubItemGroup(groupIdx, "required", e.target.checked)}
                      />
                      <span className="text-xs">Required</span>
                    </div>
                  </div>

                  {(group.options || []).map((opt, optIdx) => (
                    <div key={optIdx} className="mt-2 grid gap-2 sm:grid-cols-3 items-end">
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => updateSubItemOption(groupIdx, optIdx, "name", e.target.value)}
                        placeholder="Option name"
                        className="border rounded-lg px-3 py-2"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={opt.price}
                        onChange={(e) => updateSubItemOption(groupIdx, optIdx, "price", Number(e.target.value))}
                        placeholder="Price"
                        className="border rounded-lg px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() => removeSubItemOption(groupIdx, optIdx)}
                        className="text-xs text-rose-600 font-black"
                      >
                        Remove option
                      </button>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => addSubItemOption(groupIdx)}
                      className="text-xs font-black uppercase tracking-wider text-white bg-indigo-600 px-3 py-1 rounded-lg"
                    >
                      + Add option
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSubItemGroup(groupIdx)}
                      className="text-xs text-rose-500 font-black uppercase tracking-wider"
                    >
                      Remove group
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Image URL</label>
                <input 
                  name="image"
                  value={formData.image}
                  onChange={(e) => setFormData({...formData, image: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-500 text-sm"
                />
            </div>

            <button 
              type="submit"
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-600 transition-all shadow-lg active:scale-95 mt-4"
            >
              {isEditMode ? "Save Changes" : "Create Product"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
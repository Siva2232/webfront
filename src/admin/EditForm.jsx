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
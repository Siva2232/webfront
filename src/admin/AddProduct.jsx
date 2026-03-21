import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "../context/ProductContext";
import { generateId } from "../utils/generateId";
import toast from "react-hot-toast"; // toast notifications

export default function AddProduct() {
  const { addProduct, orderedCategories = [], addCategory } = useProducts();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    image: "",
    category: "",
    type: "veg", // ✅ veg | non-veg
    subItems: [],
  });

  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [addStatus, setAddStatus] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);

  /* ---------- Image Compression ---------- */
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = (MAX_WIDTH / width) * height;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    setIsCompressing(true);
    const compressed = await compressImage(file);
    setForm((prev) => ({ ...prev, image: compressed }));
    setIsCompressing(false);
  };

  const normalizeCategory = (str) =>
    str.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const addSubItemGroup = () => {
    setForm((prev) => ({
      ...prev,
      subItems: [
        ...prev.subItems,
        {
          groupName: "",
          type: "single",
          required: false,
          options: [],
        },
      ],
    }));
  };

  const updateSubItemGroup = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      subItems: prev.subItems.map((group, idx) =>
        idx === index ? { ...group, [field]: value } : group
      ),
    }));
  };

  const removeSubItemGroup = (index) => {
    setForm((prev) => ({
      ...prev,
      subItems: prev.subItems.filter((_, idx) => idx !== index),
    }));
  };

  const addSubItemOption = (groupIndex) => {
    setForm((prev) => ({
      ...prev,
      subItems: prev.subItems.map((group, idx) =>
        idx === groupIndex
          ? {
              ...group,
              options: [...(group.options || []), { name: "", price: 0 }],
            }
          : group
      ),
    }));
  };

  const updateSubItemOption = (groupIndex, optionIndex, field, value) => {
    setForm((prev) => ({
      ...prev,
      subItems: prev.subItems.map((group, idx) =>
        idx === groupIndex
          ? {
              ...group,
              options: group.options.map((opt, optIdx) =>
                optIdx === optionIndex ? { ...opt, [field]: value } : opt
              ),
            }
          : group
      ),
    }));
  };

  const removeSubItemOption = (groupIndex, optionIndex) => {
    setForm((prev) => ({
      ...prev,
      subItems: prev.subItems.map((group, idx) =>
        idx === groupIndex
          ? {
              ...group,
              options: group.options.filter((_, optIdx) => optIdx !== optionIndex),
            }
          : group
      ),
    }));
  };

  /* ---------- FIXED CATEGORY LOGIC ---------- */
  const handleAddCategory = async () => {
    const input = newCategoryInput.trim();
    if (!input) {
      setAddStatus("Please enter a category name");
      setTimeout(() => setAddStatus(""), 3000);
      return;
    }

    const normalized = normalizeCategory(input);

    try {
      setAddStatus("Adding Category...");
      // If category is new, add it to the global context (which now calls the API)
      if (!orderedCategories.includes(normalized)) {
        await addCategory(normalized);
      }

      // ✅ Crucial Fix: Update form state to select the new category immediately
      setForm((prev) => ({ ...prev, category: normalized }));
      setNewCategoryInput("");
      setAddStatus("Category Added!");
    } catch (err) {
      setAddStatus("Failed to add category");
    } finally {
      setTimeout(() => setAddStatus(""), 3000);
    }
  };

  const handleSubmit = async () => {
    if (
      !form.name.trim() ||
      !form.price ||
      !form.description.trim() ||
      !form.image ||
      !form.category
    ) {
      alert("Please fill all fields");
      return;
    }

    try {
      setAddStatus("Adding...");
      await addProduct({
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim(),
        image: form.image,
        category: form.category,
        type: form.type,
        available: true,
        subItems: form.subItems,
      });
      toast.success("Product created successfully");
      navigate("/admin/products");
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || "Failed to add product. See console.";
      toast.error(message);
      setAddStatus(message);
      setTimeout(() => setAddStatus(""), 5000);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 bg-white p-6 rounded-xl shadow-sm mb-20">
      <h1 className="text-xl font-semibold mb-4 tracking-tight">Add New Product</h1>

      <div className="grid gap-4">
        {/* Name Field */}
        <input
          type="text"
          placeholder="Product Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 font-medium"
        />

        {/* Price Field */}
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Price *"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 font-bold text-lg"
        />

        {/* Description Field */}
        <input
          type="text"
          placeholder="Description *"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 font-medium"
        />

        {/* Veg / Non-Veg Toggle */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Food Type <span className="text-red-500">*</span>
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 font-semibold"
          >
            <option value="veg">Veg (🟢)</option>
            <option value="non-veg">Non-Veg (🔴)</option>
          </select>
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 font-semibold"
          >
            <option value="" disabled>Select a category</option>
            {orderedCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Add New Category Logic UI */}
        <div className="border-t pt-4 bg-slate-50 p-3 rounded-lg">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Add New Category
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              placeholder="e.g. Desserts"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
            />
            <button
              type="button" // ✅ Prevents full form validation
              onClick={handleAddCategory}
              className="bg-slate-900 text-white font-bold px-4 py-2 rounded-lg text-sm transition active:scale-95"
            >
              Add
            </button>
          </div>
          {addStatus && (
            <p className="text-[10px] text-emerald-600 font-bold mt-2 uppercase">{addStatus}</p>
          )}
        </div>

        {/* Subitem/Variant Groups */}
        <div className="border-t pt-4 space-y-3 bg-slate-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subitem Groups (eg: Sauce, Vegetables, Size)</p>
            <button
              type="button"
              onClick={addSubItemGroup}
              className="text-xs font-black uppercase tracking-wider text-white bg-slate-900 px-3 py-1 rounded-lg"
            >
              + Add Group
            </button>
          </div>

          {form.subItems.map((group, groupIdx) => (
            <div key={`subitem-${groupIdx}`} className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="grid gap-2 sm:grid-cols-3 items-end">
                <input
                  type="text"
                  value={group.groupName}
                  onChange={(e) => updateSubItemGroup(groupIdx, "groupName", e.target.value)}
                  placeholder="Group name (e.g. Sauce)"
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

              {group.options.map((opt, optIdx) => (
                <div key={`subitem-${groupIdx}-opt-${optIdx}`} className="mt-2 grid gap-2 sm:grid-cols-3 items-end">
                  <input
                    type="text"
                    value={opt.name}
                    onChange={(e) => updateSubItemOption(groupIdx, optIdx, "name", e.target.value)}
                    placeholder="Option name (e.g. Tomato Sauce)"
                    className="border rounded-lg px-3 py-2"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={opt.price}
                    onChange={(e) => updateSubItemOption(groupIdx, optIdx, "price", Number(e.target.value))}
                    placeholder="Extra price"
                    className="border rounded-lg px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() => removeSubItemOption(groupIdx, optIdx)}
                    className="text-xs text-rose-600 font-bold"
                  >
                    Remove option
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addSubItemOption(groupIdx)}
                className="text-xs font-black uppercase tracking-wider text-white bg-indigo-600 px-3 py-1 rounded-lg mt-3"
              >
                + Add option
              </button>

              <button
                type="button"
                onClick={() => removeSubItemGroup(groupIdx)}
                className="text-xs text-rose-500 font-black uppercase tracking-wider mt-2"
              >
                Remove group
              </button>
            </div>
          ))}
        </div>

        {/* Image Upload Field */}
        <div className="mt-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Product Image <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isCompressing}
            className="w-full border rounded-lg px-4 py-3 bg-white"
          />
        </div>

        {/* Image Preview */}
        {form.image && (
          <div className="relative rounded-lg overflow-hidden border shadow-inner">
            <img
              src={form.image}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded">Preview</div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isCompressing}
          className="bg-black text-white font-black uppercase tracking-widest px-6 py-4 rounded-lg hover:bg-gray-800 transition shadow-lg mt-6 active:scale-95"
        >
          {isCompressing ? "Processing Image..." : "Add Product"}
        </button>
      </div>
    </div>
  );
}
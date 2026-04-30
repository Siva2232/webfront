import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";

export default function AddProductModal({
  open,
  isAdding,
  isCompressing,
  orderedCategories,
  libraryPortions,
  libraryAddonGroups,
  collapsedGroups,
  onToggleGroupCollapse,
  productForm,
  onChangeProductForm,
  newCategoryInput,
  onChangeNewCategoryInput,
  onAddCategory,
  onImageUpload,
  onClearImage,
  onAddPortion,
  onUpdatePortion,
  onRemovePortion,
  onAddFromLibraryPortion,
  onAddAddonGroup,
  onUpdateAddonGroup,
  onRemoveAddonGroup,
  onAddAddon,
  onUpdateAddon,
  onRemoveAddon,
  onAddFromLibraryGroup,
  onClose,
  onSubmit,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !isAdding && !isCompressing && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-slate-950 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Plus size={24} />
                  <h3 className="text-lg font-black uppercase tracking-tight">Add New Product</h3>
                </div>
                <button
                  onClick={onClose}
                  disabled={isAdding || isCompressing}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Margherita Pizza"
                  value={productForm.name}
                  onChange={(e) => onChangeProductForm({ ...productForm, name: e.target.value })}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 font-medium focus:border-indigo-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Price <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => onChangeProductForm({ ...productForm, price: e.target.value })}
                    className="w-full border-2 border-slate-100 rounded-xl pl-10 pr-4 py-3 font-bold text-lg focus:border-indigo-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Short description"
                  value={productForm.description}
                  onChange={(e) => onChangeProductForm({ ...productForm, description: e.target.value })}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 font-medium focus:border-indigo-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Food Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onChangeProductForm({ ...productForm, type: "veg" })}
                    className={`py-3 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      productForm.type === "veg"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                        : "border-slate-100 text-slate-400 hover:border-slate-200"
                    }`}
                  >
                    🟢 Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeProductForm({ ...productForm, type: "non-veg" })}
                    className={`py-3 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      productForm.type === "non-veg"
                        ? "bg-rose-50 border-rose-500 text-rose-600"
                        : "border-slate-100 text-slate-400 hover:border-slate-200"
                    }`}
                  >
                    🔴 Non-Veg
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) => onChangeProductForm({ ...productForm, category: e.target.value })}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 font-medium focus:border-indigo-500 outline-none transition-colors"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {orderedCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Or add new category</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => onChangeNewCategoryInput(e.target.value)}
                    placeholder="e.g. Desserts"
                    className="flex-1 border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={onAddCategory}
                    className="bg-slate-900 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-indigo-600 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Product Image <span className="text-rose-500">*</span>
                </label>
                <label
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
                    productForm.image ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                  }`}
                >
                  {isCompressing ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></span>
                      Compressing...
                    </div>
                  ) : productForm.image ? (
                    <div className="flex items-center gap-2 text-emerald-600 font-medium">
                      <CheckCircle size={20} />
                      Image selected
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Upload size={24} />
                      <span className="text-sm font-medium">Click to upload image</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onImageUpload}
                    disabled={isCompressing}
                    className="hidden"
                  />
                </label>
              </div>

              {productForm.image && (
                <div className="relative rounded-xl overflow-hidden border shadow-inner">
                  <img src={productForm.image} alt="Preview" className="w-full h-40 object-cover" />
                  <button
                    onClick={onClearImage}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enable Portions</label>
                  <button
                    type="button"
                    onClick={() => onChangeProductForm({ ...productForm, hasPortions: !productForm.hasPortions })}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      productForm.hasPortions ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                        productForm.hasPortions ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {productForm.hasPortions && (
                  <div className="space-y-3 pl-2">
                    <p className="text-[10px] text-slate-400 font-medium">
                      E.g. Half, Full, Family Pack. Each portion has its own price.
                    </p>
                    {productForm.portions.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input
                          placeholder="Portion name"
                          value={p.name}
                          onChange={(e) => onUpdatePortion(idx, "name", e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">
                            ₹
                          </span>
                          <input
                            type="number"
                            placeholder="Price"
                            value={p.price}
                            onChange={(e) => onUpdatePortion(idx, "price", e.target.value)}
                            className="w-28 pl-7 pr-3 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black outline-none focus:border-indigo-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemovePortion(idx)}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={onAddPortion}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                      >
                        <Plus size={14} /> Add Portion
                      </button>
                      {libraryPortions.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            onAddFromLibraryPortion(e.target.value);
                          }}
                          className="px-3 py-2.5 bg-violet-50 text-violet-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-violet-200 outline-none cursor-pointer max-w-[180px] overflow-hidden truncate"
                        >
                          <option value="">Pick from Library</option>
                          {libraryPortions
                            .filter((lp) => lp.isAvailable !== false)
                            .map((lp) => (
                              <option key={lp._id} value={lp._id}>
                                {lp.name} (₹{lp.price})
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add-on Groups</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onAddAddonGroup}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                    >
                      <Plus size={12} /> New Group
                    </button>
                    {libraryAddonGroups.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          onAddFromLibraryGroup(e.target.value);
                        }}
                        className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-violet-200 outline-none cursor-pointer"
                      >
                        <option value="">Pick from Library</option>
                        {libraryAddonGroups
                          .filter((lg) => lg.isAvailable !== false)
                          .map((lg) => (
                            <option key={lg._id} value={lg._id}>
                              {lg.name} ({lg.addons?.length || 0} items)
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Create groups like "Dips & Sauces", "Extra Toppings".</p>

                {productForm.addonGroups.map((group, gIdx) => (
                  <div key={gIdx} className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <input
                        placeholder="Group name"
                        value={group.name}
                        onChange={(e) => onUpdateAddonGroup(gIdx, "name", e.target.value)}
                        className="flex-1 px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Max"
                        title="Maximum selections (0 = unlimited)"
                        value={group.maxSelections || ""}
                        onChange={(e) => onUpdateAddonGroup(gIdx, "maxSelections", e.target.value)}
                        className="w-20 px-3 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-center outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => onToggleGroupCollapse(gIdx)}
                        className="p-2 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        {collapsedGroups[gIdx] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveAddonGroup(gIdx)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {!collapsedGroups[gIdx] && (
                      <div className="space-y-2 pl-2">
                        {group.addons.map((addon, aIdx) => (
                          <div key={aIdx} className="flex items-center gap-3">
                            <input
                              placeholder="Addon name"
                              value={addon.name}
                              onChange={(e) => onUpdateAddon(gIdx, aIdx, "name", e.target.value)}
                              className="flex-1 px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-500"
                            />
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={addon.price}
                                onChange={(e) => onUpdateAddon(gIdx, aIdx, "price", e.target.value)}
                                className="w-24 pl-7 pr-3 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-bold text-center outline-none focus:border-indigo-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveAddon(gIdx, aIdx)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => onAddAddon(gIdx)}
                          className="flex items-center gap-1.5 px-3 py-2 text-emerald-600 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Plus size={12} /> Add Item
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3 shrink-0 border-t border-slate-100">
              <button
                onClick={onClose}
                disabled={isAdding || isCompressing}
                className="flex-1 px-6 py-4 border-2 border-slate-200 font-bold uppercase text-xs tracking-widest rounded-xl hover:border-slate-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={isAdding || isCompressing}
                className="flex-1 px-6 py-4 bg-slate-950 text-white font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Product
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


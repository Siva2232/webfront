import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Save, Trash2, X } from "lucide-react";

export default function EditSubItemModal({
  open,
  saving,
  editing,
  form,
  onClose,
  onChangeForm,
  onAddAddonRow,
  onUpdateAddonRow,
  onRemoveAddonRow,
  onSave,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !saving && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-violet-600 text-white shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {editing ? "Edit" : "New"} {form.type === "portion" ? "Portion" : "Add-on Group"}
                </h3>
                <button onClick={onClose} disabled={saving} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {!editing && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Type</label>
                  <div className="flex gap-3">
                    {[
                      { key: "portion", label: "Portion" },
                      { key: "addonGroup", label: "Add-on Group" },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() =>
                          onChangeForm({ ...form, type: t.key, addons: t.key === "portion" ? [] : form.addons })
                        }
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all border-2 ${
                          form.type === t.key ? "bg-violet-50 text-violet-700 border-violet-500" : "bg-slate-50 text-slate-400 border-slate-100"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => onChangeForm({ ...form, name: e.target.value })}
                  placeholder={form.type === "portion" ? 'e.g. "Half", "Full", "Family Pack"' : 'e.g. "Dips & Sauces", "Extra Toppings"'}
                  className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {form.type === "portion" && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Default Price (₹)
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => onChangeForm({ ...form, price: e.target.value })}
                    placeholder="0"
                    className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-black outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}

              {form.type === "addonGroup" && (
                <>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                      Max Selections (0 = unlimited)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.maxSelections}
                      onChange={(e) => onChangeForm({ ...form, maxSelections: e.target.value })}
                      placeholder="0"
                      className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Addon Items</label>
                    <div className="space-y-2">
                      {form.addons.map((a, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            placeholder="Item name"
                            value={a.name}
                            onChange={(e) => onUpdateAddonRow(idx, "name", e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={a.price}
                              onChange={(e) => onUpdateAddonRow(idx, "price", e.target.value)}
                              className="w-24 pl-7 pr-3 py-2.5 bg-slate-50 rounded-xl text-sm font-bold text-center outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <button type="button" onClick={() => onRemoveAddonRow(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={onAddAddonRow}
                      className="mt-2 flex items-center gap-1.5 px-4 py-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 bg-slate-50 flex gap-3 shrink-0 border-t border-slate-100">
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-6 py-4 border-2 border-slate-200 font-bold uppercase text-xs tracking-widest rounded-xl hover:border-slate-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex-1 px-6 py-4 bg-violet-600 text-white font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {editing ? "Update" : "Create"}
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


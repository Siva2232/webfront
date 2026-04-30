import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";

export default function BulkCreateModal({
  open,
  saving,
  tab,
  bulkForm,
  onChangeCategory,
  onChangeRow,
  onAddRow,
  onRemoveRow,
  onClose,
  onSave,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
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
                  Bulk {tab === "portion" ? "Portions" : "Add-on Groups"}
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Group Name (e.g. {tab === "portion" ? '"Alpahm"' : '"Extra Toppings"'})
                </label>
                <input
                  value={bulkForm.category}
                  onChange={(e) => onChangeCategory(e.target.value)}
                  placeholder="Enter Group (category)"
                  className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Add {tab === "portion" ? "Portions" : "Groups"}
                </label>
                {bulkForm.items.map((it, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      placeholder={tab === "portion" ? "Name (e.g. Half)" : "Add-on Name (e.g. Extra Cheese)"}
                      value={it.name}
                      onChange={(e) => onChangeRow(idx, "name", e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 rounded-xl font-bold outline-none border focus:border-violet-300"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={it.price}
                      onChange={(e) => onChangeRow(idx, "price", e.target.value)}
                      className="w-24 px-4 py-2 bg-slate-50 rounded-xl font-bold outline-none border focus:border-violet-300"
                    />
                    {bulkForm.items.length > 1 && (
                      <button onClick={() => onRemoveRow(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={onAddRow}
                  className="flex justify-center items-center gap-2 w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-violet-300 hover:text-violet-500 transition-all font-bold text-xs"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3 border-t">
              <button onClick={onClose} className="flex-1 py-4 font-bold border rounded-xl">
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex-1 py-4 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? "Creating..." : "Save All"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


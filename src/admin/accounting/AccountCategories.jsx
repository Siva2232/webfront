import { useEffect, useState } from "react";
import { Layers, Plus, Pencil, Trash2, Search, RefreshCw, X } from "lucide-react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../../api/accountingApi";
import toast from "react-hot-toast";

const EMPTY = { name: "", type: "expense", description: "" };

export default function AccountCategories() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCategories();
      setCategories(res.data);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setForm(EMPTY);
    setModal({ mode: "add" });
  };
  const openEdit = (c) => {
    setForm({ 
      name: c.name, 
      type: c.type || "expense",
      description: c.description || "" 
    });
    setModal({ mode: "edit", id: c._id });
  };
  const closeModal = () => setModal(null);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.type) return toast.error("Type is required");
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await createCategory(form);
        toast.success("Category created");
      } else {
        await updateCategory(modal.id, form);
        toast.success("Category updated");
      }
      load();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? This will not delete transactions using this category.")) return;
    try {
      await deleteCategory(id);
      toast.success("Category deleted");
      load();
    } catch {
      toast.error("Failed to delete category");
    }
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Account Categories</h1>
          <p className="text-slate-500 text-sm font-medium">Manage groupings for your expenses</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
        >
          <Plus size={20} />
          <span>New Category</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
            />
          </div>
          <button onClick={load} className="p-3 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-xl">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400 italic">Loading categories...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400 italic">No categories found</td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <Layers size={18} />
                        </div>
                        <span className="text-slate-700 font-bold">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        c.type === 'expense' ? 'bg-rose-50 text-rose-500' : 
                        c.type === 'income' ? 'bg-emerald-50 text-emerald-500' :
                        c.type === 'asset' ? 'bg-indigo-50 text-indigo-500' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        {c.type || 'expense'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm max-w-[300px] truncate">{c.description || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                          <Pencil size={18} />
                        </button>
                        <button onClick={() => handleDelete(c._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    {modal.mode === "add" ? "New Category" : "Edit Category"}
                  </h2>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">Fill out the details below</p>
                </div>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Category Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all font-bold text-slate-700"
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all font-bold text-slate-700"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description (Optional)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all font-medium text-slate-700 min-h-[100px]"
                    placeholder="Brief description"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-10">
                <button onClick={closeModal} className="flex-1 py-4 px-6 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-2 py-4 px-10 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <RefreshCw className="animate-spin" size={20} /> : <span>{modal.mode === "add" ? "Create Category" : "Save Changes"}</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

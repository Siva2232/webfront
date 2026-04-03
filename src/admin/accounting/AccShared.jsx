// Shared helpers for the Accounting module
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export const fmt = (n = 0) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const StatusBadge = ({ status }) => {
  const map = {
    Paid: { icon: CheckCircle2, cls: "bg-green-100 text-green-700", label: "Paid" },
    Partial: { icon: AlertTriangle, cls: "bg-amber-100 text-amber-700", label: "Partial" },
    Unpaid: { icon: XCircle, cls: "bg-red-100 text-red-700", label: "Unpaid" },
  };
  const cfg = map[status] || map.Unpaid;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
};

export const PageHeader = ({ title, children }) => (
  <div className="flex items-center justify-between mb-6">
    <h1 className="text-xl font-bold text-slate-800">{title}</h1>
    <div className="flex gap-2">{children}</div>
  </div>
);

export const Btn = ({ children, onClick, variant = "primary", type = "button", disabled = false, className = "" }) => {
  const base = "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50";
  const vars = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${vars[variant]} ${className}`}>
      {children}
    </button>
  );
};

export const Input = ({ label, error, className = "", ...props }) => (
  <div className={className}>
    {label && <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>}
    <input
      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 ${
        error ? "border-red-400" : "border-slate-300"
      }`}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);

export const Select = ({ label, error, children, className = "", ...props }) => (
  <div className={className}>
    {label && <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>}
    <select
      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white ${
        error ? "border-red-400" : "border-slate-300"
      }`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);

export const Textarea = ({ label, error, className = "", ...props }) => (
  <div className={className}>
    {label && <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>}
    <textarea
      rows={3}
      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 resize-none ${
        error ? "border-red-400" : "border-slate-300"
      }`}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${className}`}>{children}</div>
);

export const Table = ({ columns, data, onRowClick, emptyMsg = "No records found." }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
        <tr>
          {columns.map((col) => (
            <th key={col.key || col.label} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="text-center py-8 text-slate-400 italic">
              {emptyMsg}
            </td>
          </tr>
        ) : (
          data.map((row, i) => (
            <tr
              key={row._id || i}
              onClick={() => onRowClick && onRowClick(row)}
              className={`hover:bg-slate-50 transition ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.key || col.label} className="px-4 py-3 whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
};

export const Breadcrumb = ({ items }) => (
  <nav className="flex items-center gap-1 text-xs text-slate-500 mb-4">
    {items.map((item, i) => (
      <span key={i} className="flex items-center gap-1">
        {i > 0 && <span className="text-slate-300">/</span>}
        {item.onClick ? (
          <button onClick={item.onClick} className="hover:text-indigo-600 font-medium">
            {item.label}
          </button>
        ) : (
          <span className={i === items.length - 1 ? "text-slate-800 font-semibold" : ""}>{item.label}</span>
        )}
      </span>
    ))}
  </nav>
);

export const Stat = ({ label, value, sub, color = "indigo" }) => {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
};

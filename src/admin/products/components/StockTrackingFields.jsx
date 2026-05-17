import { Package } from "lucide-react";

/** Toggle quantity tracking vs manual sold-out only. */
export default function StockTrackingFields({ trackStock, stock, onChange, compact = false }) {
  const setTrackStock = (value) => {
    onChange({
      trackStock: value,
      stock: value ? (stock === "" || stock === undefined ? "10" : String(stock)) : "",
    });
  };

  return (
    <div className={`rounded-xl border border-slate-100 bg-slate-50/80 ${compact ? "p-3 space-y-3" : "p-4 space-y-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Package size={compact ? 16 : 18} className="text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className={`font-black uppercase tracking-wide text-slate-800 ${compact ? "text-[10px]" : "text-xs"}`}>
              Track quantity
            </p>
            <p className={`text-slate-500 font-medium mt-0.5 ${compact ? "text-[10px] leading-snug" : "text-xs"}`}>
              {trackStock
                ? "Stock auto-decreases on orders. At 0, item is sold out."
                : "No quantity — use Stop Selling / Restore for sold out."}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={trackStock}
          onClick={() => setTrackStock(!trackStock)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            trackStock ? "bg-indigo-600" : "bg-slate-200"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
              trackStock ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {trackStock && (
        <div>
          <label className={`block font-bold uppercase text-slate-500 mb-1 ${compact ? "text-[9px]" : "text-[10px]"}`}>
            Starting quantity <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => onChange({ trackStock: true, stock: e.target.value })}
            placeholder="e.g. 50"
            className={`w-full border-2 border-slate-200 rounded-xl font-bold tabular-nums focus:border-indigo-500 outline-none ${
              compact ? "px-3 py-2 text-sm" : "px-4 py-3"
            }`}
          />
          <p className={`text-slate-400 mt-1 ${compact ? "text-[9px]" : "text-[10px]"}`}>
            Leave at 0 to list as sold out until you restock.
          </p>
        </div>
      )}
    </div>
  );
}

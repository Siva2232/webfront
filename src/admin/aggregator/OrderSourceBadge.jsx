const SOURCE_META = {
  swiggy: {
    label: "Swiggy",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  zomato: {
    label: "Zomato",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  inhouse: {
    label: "In-house",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

export function getOrderSource(order) {
  const source = String(order?.orderSource || "inhouse").toLowerCase();
  if (source === "swiggy" || source === "zomato") return source;
  return "inhouse";
}

export function isAggregatorOrder(order) {
  const source = getOrderSource(order);
  return source === "swiggy" || source === "zomato";
}

export default function OrderSourceBadge({ order, className = "" }) {
  const source = getOrderSource(order);
  const meta = SOURCE_META[source] || SOURCE_META.inhouse;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full border ${meta.className} ${className}`}
    >
      {meta.label}
    </span>
  );
}

export { SOURCE_META };

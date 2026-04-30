export const getTxTypeStyles = (type) => {
  switch (type) {
    case "Bill":
      return "bg-blue-50/50 text-blue-600 border-blue-100/50";
    case "Manual":
      return "bg-purple-50/50 text-purple-600 border-purple-100/50";
    case "Expense":
      return "bg-orange-50/50 text-orange-600 border-orange-100/50";
    case "Purchase":
      return "bg-cyan-50/50 text-cyan-600 border-cyan-100/50";
    default:
      return "bg-slate-50/50 text-slate-600 border-slate-100/50";
  }
};


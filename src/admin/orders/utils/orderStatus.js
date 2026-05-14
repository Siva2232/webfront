export const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

export const gradientMap = {
  new: "from-blue-400 to-blue-500",
  pending: "from-blue-400 to-blue-500",
  preparing: "from-orange-400 to-orange-500",
  ready: "from-indigo-500 to-purple-600",
  served: "from-emerald-500 to-teal-600",
  paid: "from-emerald-500 to-teal-600",
  closed: "from-emerald-500 to-teal-600",
};

export const statusStep = { new: 1, pending: 1, preparing: 2, ready: 3, served: 4, paid: 4, closed: 4 };

export const isStatusActive = (status) =>
  ["new", "preparing", "ready", "served", "pending", "paid", "closed"].includes(normalizeStatus(status));


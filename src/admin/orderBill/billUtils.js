export const isPaid = (s) =>
  ["paid", "succeeded", "success"].includes((s?.status || "").toLowerCase());

export const computeBillStats = (order) => {
  const subtotal =
    order.billDetails?.subtotal ??
    order.items?.reduce((s, i) => s + i.price * i.qty, 0) ??
    0;
  const tax =
    order.billDetails?.cgst && order.billDetails?.sgst
      ? order.billDetails.cgst + order.billDetails.sgst
      : subtotal * 0.05;
  const grandTotal = order.billDetails?.grandTotal ?? subtotal + tax;

  const sessions = order.paymentSessions || [];
  const paidAmount = sessions
    .filter(isPaid)
    .reduce((a, s) => a + (s.amount || 0), 0);
  const totalDue = order.totalAmount || order.billDetails?.grandTotal || 0;
  const unpaidAmount = Math.max(0, totalDue - paidAmount);
  const onlineSessions = sessions.filter((s) => s.method === "online");
  const allOnlinePaid =
    onlineSessions.length > 0 && onlineSessions.every(isPaid);
  const hasUnpaidCod =
    unpaidAmount > 1 && sessions.some((s) => s.method === "cod");
  const allCodPaid =
    sessions.some((s) => s.method === "cod") && unpaidAmount <= 1;

  return {
    subtotal,
    tax,
    grandTotal,
    sessions,
    paidAmount,
    unpaidAmount,
    allOnlinePaid,
    hasUnpaidCod,
    allCodPaid,
  };
};


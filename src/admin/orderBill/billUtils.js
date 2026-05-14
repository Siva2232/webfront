import { GST_TOTAL_RATE } from "../../utils/gstRates";

export const isPaid = (s) =>
  ["paid", "succeeded", "success"].includes((s?.status || "").toLowerCase());

export const computeBillStats = (order) => {
  const subtotal =
    order.billDetails?.subtotal ??
    order.items?.reduce((s, i) => s + i.price * i.qty, 0) ??
    0;
  const bd = order.billDetails;
  const tax =
    bd != null && (bd.cgst != null || bd.sgst != null)
      ? Number(bd.cgst || 0) + Number(bd.sgst || 0)
      : subtotal * GST_TOTAL_RATE;
  const computedTotal = subtotal + tax;
  // Invoice total: prefer stored grand total, then GST-inclusive computed amount.
  // Do not prefer order.totalAmount first — many flows store pre-GST subtotal there
  // (e.g. manual orders), which made Total Due / Mark Paid omit tax vs receipt.
  const billTotalRaw =
    bd?.grandTotal ?? computedTotal ?? order.totalAmount;
  const billTotal = Number(billTotalRaw);
  const grandTotal = Number.isFinite(billTotal) ? billTotal : computedTotal;

  const sessions = order.paymentSessions || [];
  const paidAmount = sessions
    .filter(isPaid)
    .reduce((a, s) => a + (s.amount || 0), 0);
  const unpaidAmount = Math.max(0, grandTotal - paidAmount);
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

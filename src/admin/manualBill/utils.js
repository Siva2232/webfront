import { GST_TOTAL_RATE } from "../../utils/gstRates";

export const computeStats = (items) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * GST_TOTAL_RATE;
  const grandTotal = subtotal + tax;
  return { subtotal, tax, grandTotal };
};

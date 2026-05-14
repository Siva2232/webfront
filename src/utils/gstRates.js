/** Total intra-state GST on orders (CGST + SGST). */
export const GST_TOTAL_RATE = 0.05;

export const GST_CGST_RATE = GST_TOTAL_RATE / 2;
export const GST_SGST_RATE = GST_TOTAL_RATE / 2;

export const GST_INCLUSIVE_MULTIPLIER = 1 + GST_TOTAL_RATE;

export const GST_TOTAL_PCT_LABEL = "5%";
export const GST_CGST_PCT_LABEL = "2.5%";
export const GST_SGST_PCT_LABEL = "2.5%";

export function computeGstFromSubtotal(subtotal) {
  const sub = Number(subtotal) || 0;
  const cgst = sub * GST_CGST_RATE;
  const sgst = sub * GST_SGST_RATE;
  return { cgst, sgst, grandTotal: sub + cgst + sgst };
}

/** Tax component on a taxable line (e.g. menu price) at the configured GST rate. */
export function taxOnTaxableAmount(amount) {
  return (Number(amount) || 0) * GST_TOTAL_RATE;
}

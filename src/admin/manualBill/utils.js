export const computeStats = (items) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;
  return { subtotal, tax, grandTotal };
};


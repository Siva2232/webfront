import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../../../context/CartContext";

// treat both takeaway or delivery (and legacy blank) as non-table orders
export const isTakeawayOrder = (o) =>
  o.table === TAKEAWAY_TABLE ||
  o.table === DELIVERY_TABLE ||
  !o.table ||
  o.table === "TAKEAWAY" ||
  o.table === "DELIVERY";


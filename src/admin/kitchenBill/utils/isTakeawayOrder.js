import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../../../context/CartContext";

export const isTakeawayOrder = (kb) =>
  kb.table === TAKEAWAY_TABLE ||
  kb.table === DELIVERY_TABLE ||
  !kb.table ||
  kb.table === "TAKEAWAY" ||
  kb.table === "DELIVERY";


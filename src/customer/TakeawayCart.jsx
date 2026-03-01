import React from "react";
import Cart from "./Cart";

// Dedicated page for takeaway orders.  We reuse the regular Cart but
// tell it to hide the table header entirely (hideTable=true).  This keeps
// all order behavior, pricing, notes, and swipe-to-order unchanged while
// removing any reference to a table number.
export default function TakeawayCart() {
  return <Cart hideTable={true} />;
}

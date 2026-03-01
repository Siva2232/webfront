import React, { useState, useEffect } from "react";
import OrdersDashboard from "../admin/Orders";
import { useOrders } from "../context/OrderContext";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../context/CartContext";


// The admin Orders component already shows everything; for the waiter we
// provide a small table-number filter and then render the same dashboard
// with filtered data.

export default function WaiterOrders() {
  const { orders, fetchOrders, fetchTableOrders } = useOrders();
  const [tableFilter, setTableFilter] = useState("");
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    // only fetch full order list when running in admin/kitchen context
    const admin = localStorage.getItem("isAdminLoggedIn") === "true";
    const kitchen = localStorage.getItem("isKitchenLoggedIn") === "true";
    if ((admin || kitchen) && orders.length === 0) {
      fetchOrders();
    }
  }, [orders, fetchOrders]);

  useEffect(() => {
    if (tableFilter.trim() === "") {
      setFiltered(orders);
    } else {
      // fetch fresh results for this table (unprotected endpoint)
      fetchTableOrders(tableFilter.trim());
      setFiltered(
        orders.filter(o => {
          const tf = tableFilter.trim();
          return (
            String(o.table) === tf ||
            ((tf === TAKEAWAY_TABLE || tf === DELIVERY_TABLE) && !o.table)
          );
        })
      );
    }
  }, [orders, tableFilter]);

  // reuse the existing admin component but override orders prop via context
  // hack: temporarily replace orders array in context? easier to just render
  // our own minimal list – but due to complexity we might just show simple
  // list ourselves.

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 sm:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold">Table:</label>
          <input
            type="text"
            value={tableFilter}
            onChange={e => setTableFilter(e.target.value.replace(/[^0-9A-Za-z]/g, "").toUpperCase())}
            className="border border-slate-200 rounded-lg px-3 py-2 w-32"
            placeholder={`any or ${TAKEAWAY_TABLE}/${DELIVERY_TABLE} (also blank)`}
          />
          <button
            onClick={() => setTableFilter("")}
            className="text-xs text-slate-500 underline"
          >Clear</button>
        </div>
        {/* we don't want to repurpose the whole admin dashboard; just show filtered orders below using existing card markup */}
        {tableFilter.trim() === "" ? (
          <p className="text-center text-slate-500 py-20">Enter a table number above to view orders.</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-500 py-20">No orders found for specified table.</p>
        ) : (
          // render minimal copy of order cards (we could reuse PremiumOrderCard but it's nested inside Orders.jsx)
          <OrdersDashboard overrideOrders={filtered} />
        )}
      </div>
    </div>
  );
}

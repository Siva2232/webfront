import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Table, Receipt } from "lucide-react";

export default function WaiterDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black mb-6">Waiter Home</h1>
      <p className="mb-4 text-slate-600">
        Use the options below to manage tables, take orders and print bills.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <button
          onClick={() => navigate("tables")}
          className="flex flex-col items-center gap-2 p-6 bg-white rounded-2xl shadow hover:shadow-lg transition">
          <Table size={32} />
          <span className="font-bold">Tables</span>
        </button>
        <button
          onClick={() => navigate("orders")}
          className="flex flex-col items-center gap-2 p-6 bg-white rounded-2xl shadow hover:shadow-lg transition">
          <ShoppingCart size={32} />
          <span className="font-bold">Orders</span>
        </button>
        <button
          onClick={() => navigate("bill")}
          className="flex flex-col items-center gap-2 p-6 bg-white rounded-2xl shadow hover:shadow-lg transition">
          <Receipt size={32} />
          <span className="font-bold">Bills</span>
        </button>
      </div>
    </div>
  );
}

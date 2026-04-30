import React from "react";
import { ChefHat } from "lucide-react";

export default function KitchenBillEmptyState({ embedded }) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 text-center bg-[#FDFDFD] ${
        embedded ? "min-h-[50vh]" : "min-h-screen"
      }`}
    >
      <ChefHat size={40} className="text-slate-300 mb-4" />
      <h2 className="text-lg font-bold text-slate-900">No Kitchen Bills</h2>
      <p className="text-slate-500 text-sm">Waiting for orders...</p>
    </div>
  );
}


import React from "react";
import { ChefHat } from "lucide-react";

export default function KitchenBillEmptyState({ embedded }) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 px-6 text-center font-sans ${
        embedded ? "min-h-[50vh] pb-8" : "min-h-screen pb-20"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
        <ChefHat size={36} className="text-zinc-500" />
      </div>
      <h2 className="text-lg font-bold text-zinc-900">No kitchen bills</h2>
      <p className="mt-1 text-sm text-zinc-600">Waiting for orders…</p>
    </div>
  );
}


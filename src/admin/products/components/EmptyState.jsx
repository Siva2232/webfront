import React from "react";
import { Sparkles } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-40 bg-white border border-slate-100 rounded-[4rem] shadow-sm text-center">
      <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-100">
        <Sparkles className="text-indigo-400" size={40} />
      </div>
      <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">The Vault is Clear</h3>
      <p className="text-slate-400 font-medium max-w-sm mx-auto mt-3">
        Ready to curate your next masterpiece? Add your first product to the gallery above.
      </p>
    </div>
  );
}


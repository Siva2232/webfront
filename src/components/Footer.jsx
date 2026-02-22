import React from "react";

export default function Footer() {
  const storeName = "MY CAFE";
  const currentYear = new Date().getFullYear();

  return (
<footer className="w-full bg-white border-t border-slate-100 pt-[45px] md:pt-40 pb-[200px]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center">
          
          {/* 🟢 Live Status Indicator */}
          <div className="flex items-center gap-2 mb-8 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 shadow-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">
              System Online & Live
            </span>
          </div>

          {/* 🏆 Brand Identity Section */}
          <div className="relative mb-16 flex flex-col items-center group cursor-default">
            {/* Watermark Background Text */}
            <span className="absolute -top-10 text-[55px] sm:text-[90px] font-black text-slate-100/50 select-none tracking-[0.1em] italic transition-all duration-700 group-hover:tracking-[0.2em] group-hover:opacity-100">
              ESTB 2026
            </span>

            {/* Main Logo Text */}
            <h2 className="relative text-5xl sm:text-7xl font-black text-slate-900 italic tracking-tighter uppercase leading-none z-10 transition-transform duration-500 group-hover:scale-105">
              {storeName.split(" ")[0]}
              <span className="text-orange-500 mx-px">.</span>
              {storeName.split(" ")[1] || ""}
            </h2>

            {/* Tagline with Lines */}
            <div className="relative flex items-center gap-4 mt-6 z-10">
              <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-slate-200 to-slate-200" />
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
                Premium Dining
              </p>
              <div className="h-[1px] w-10 bg-gradient-to-l from-transparent via-slate-200 to-slate-200" />
            </div>
          </div>

          {/* 📝 Bottom Copyright Bar */}
          <div className="w-full  border-t border-slate-50 flex flex-col items-center justify-center">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em] text-center leading-loose">
              © {currentYear} {storeName} <span className="mx-2 opacity-30">|</span> All Rights Reserved
            </p>
            
            {/* Subtle Design Credit or Version */}
            <p className="mt-2 text-[7px] font-black text-slate-200 uppercase tracking-widest">
              v1.0.4 Premium Experience
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}
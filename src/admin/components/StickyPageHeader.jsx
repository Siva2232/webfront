import React from "react";
import { ChevronLeft } from "lucide-react";

export default function StickyPageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  onBack,
  leftAddon,
  rightAddon,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
        
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/20">
            {Icon ? <Icon size={22} strokeWidth={2.25} /> : null}
          </div>
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                {eyebrow}
              </p>
            )}
            <h1 className="text-xl font-black tracking-tight text-zinc-900 md:text-2xl">
              {title}
            </h1>
            {subtitle && <p className="text-[11px] text-zinc-500">{subtitle}</p>}
          </div>
          {leftAddon ? <div className="ml-2">{leftAddon}</div> : null}
        </div>

        {rightAddon ? (
          <div className="flex flex-wrap items-center gap-2 md:gap-3 lg:justify-end">
            {rightAddon}
          </div>
        ) : null}
      </div>
    </header>
  );
}


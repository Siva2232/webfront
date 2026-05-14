import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * @param {{ label: string, to?: string }[]} [breadcrumbItems] — last item without `to` = current page
 */
export default function StickyPageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  onBack,
  leftAddon,
  rightAddon,
  breadcrumbItems,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50"
              aria-label="Back"
            >
              <ChevronLeft size={20} strokeWidth={2.25} />
            </button>
          ) : null}

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/20">
            {Icon ? <Icon size={22} strokeWidth={2.25} /> : null}
          </div>
          <div className="min-w-0">
            {breadcrumbItems && breadcrumbItems.length > 0 ? (
              <nav aria-label="Breadcrumb" className="mb-0.5 flex flex-wrap items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                {breadcrumbItems.map((item, i) => (
                  <React.Fragment key={`${item.label}-${i}`}>
                    {i > 0 ? <ChevronRight size={12} className="shrink-0 opacity-60" aria-hidden /> : null}
                    {item.to ? (
                      <Link to={item.to} className="transition hover:text-zinc-700">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-zinc-600" aria-current="page">
                        {item.label}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            ) : eyebrow ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">{eyebrow}</p>
            ) : null}
            <h1 className="text-xl font-black tracking-tight text-zinc-900 md:text-2xl">{title}</h1>
            {subtitle && <p className="text-[11px] text-zinc-500">{subtitle}</p>}
          </div>
          {leftAddon ? <div className="ml-2">{leftAddon}</div> : null}
        </div>

        {rightAddon ? (
          <div className="flex flex-wrap items-center gap-2 md:gap-3 lg:justify-end">{rightAddon}</div>
        ) : null}
      </div>
    </header>
  );
}


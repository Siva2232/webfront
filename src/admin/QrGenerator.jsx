import React, { useState } from "react";
import QRCode from "react-qr-code";
import { jsPDF } from "jspdf";
import { FileImage, FileText, Link2, QrCode as QrCodeIcon } from "lucide-react";
import StickyPageHeader from "./components/StickyPageHeader";

export default function QrGenerator() {
  const [table, setTable] = useState("");

  // use origin so it works both locally and after deployment
  // Include restaurantId so the customer menu scopes data to this restaurant
  const restaurantId = localStorage.getItem("restaurantId") || "";
  const baseUrl = restaurantId
    ? `${window.location.origin}/menu?restaurantId=${encodeURIComponent(restaurantId)}&table=`
    : `${window.location.origin}/menu?table=`;
  const link = table ? `${baseUrl}${encodeURIComponent(table)}` : "";

  // helper to convert SVG element to canvas and return data URL
  const svgToDataURL = (svgEl, format = "png") => {
    return new Promise((resolve, reject) => {
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svgEl);
      const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const mime = format === "jpg" ? "image/jpeg" : "image/png";
        resolve(canvas.toDataURL(mime));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const downloadImage = async (format) => {
    const svg = document.getElementById("qr-code");
    if (!svg) return;
    try {
      const dataUrl = await svgToDataURL(svg, format);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `table-${table}-qr.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("image conversion error", err);
    }
  };

  const downloadPDF = async () => {
    const svg = document.getElementById("qr-code");
    if (!svg) return;
    try {
      const dataUrl = await svgToDataURL(svg, "png");
      const pdf = new jsPDF({ unit: "pt", format: [220, 220] });
      pdf.addImage(dataUrl, "PNG", 10, 10, 200, 200);
      pdf.save(`table-${table}-qr.pdf`);
    } catch (err) {
      console.error("pdf export error", err);
    }
  };

  return (
    <div className="relative min-h-full w-full max-w-full overflow-x-hidden bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 font-sans pb-[max(3rem,env(safe-area-inset-bottom,0px)+2rem)]">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />

      <StickyPageHeader
        icon={QrCodeIcon}
        eyebrow="Guest menu"
        title="Table QR codes"
        subtitle="Generate a table QR that opens your menu"
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {/* Left: inputs */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-900/5 sm:p-8">
            <label
              htmlFor="qr-table"
              className="block text-xs font-bold uppercase tracking-widest text-zinc-500"
            >
              Table number
            </label>
            <input
              id="qr-table"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 12"
              value={table}
              onChange={(e) => setTable(e.target.value.replace(/[^0-9]/g, ""))}
              className="mt-2 w-full min-w-0 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-lg font-semibold tabular-nums text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-900/10"
            />

            {link ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-4">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <Link2 size={12} className="shrink-0" />
                    Generated link
                  </div>
                  <p className="break-all font-mono text-xs leading-relaxed text-zinc-700">
                    {link}
                  </p>
                </div>

                <p className="text-[11px] leading-relaxed text-zinc-400">
                  Tip: keep table numbers short for easier scanning.
                </p>
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-6 text-center text-sm text-zinc-500">
                Type a table number to preview the QR code and download options.
              </p>
            )}
          </section>

          {/* Right: preview + downloads */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-900/5 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                    Preview
                  </p>
                  <h2 className="mt-1 text-lg font-black tracking-tight text-zinc-900">
                    QR code
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {table ? (
                      <>
                        Table{" "}
                        <span className="font-bold tabular-nums text-zinc-800">
                          {table}
                        </span>
                      </>
                    ) : (
                      "Enter a table number"
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center">
                <div
                  id="qr-wrapper"
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-inner shadow-zinc-900/5"
                >
                  {link ? (
                    <QRCode id="qr-code" value={link} size={220} className="h-auto max-w-full" />
                  ) : (
                    <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl bg-zinc-50 text-sm font-semibold text-zinc-400">
                      No QR
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => downloadImage("png")}
                    disabled={!link}
                    className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-md shadow-zinc-900/20 transition-colors hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98]"
                  >
                    <FileImage size={18} />
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadImage("jpg")}
                    disabled={!link}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 active:scale-[0.98]"
                  >
                    <FileImage size={18} />
                    JPG
                  </button>
                </div>
                <button
                  type="button"
                  onClick={downloadPDF}
                  disabled={!link}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-zinc-900 bg-transparent px-4 py-3 text-sm font-bold text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-50 active:scale-[0.98]"
                >
                  <FileText size={18} />
                  Download PDF
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

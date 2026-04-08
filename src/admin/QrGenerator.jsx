import React, { useState } from "react";
import QRCode from "react-qr-code";
import { jsPDF } from "jspdf";

export default function QrGenerator() {
  const [table, setTable] = useState("");

  // use origin so it works both locally and after deployment
  // Include restaurantId so the customer menu scopes data to this restaurant
  const restaurantId = localStorage.getItem('restaurantId') || '';
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FDFDFD]">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-4xl font-black text-slate-900 text-center">QR Code Generator</h1>
        <p className="text-sm text-slate-500 text-center">
          Enter a table number below and a link will be generated. Patrons can scan
          the QR code to open the menu for that table.
        </p>
        <input
          type="text"
          placeholder="Table Number"
          value={table}
          onChange={(e) => setTable(e.target.value.replace(/[^0-9]/g, ""))}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
        />

        {link && (
          <div className="flex flex-col items-center gap-4">
            <div id="qr-wrapper" className="bg-white p-2 shadow-lg">
              <QRCode id="qr-code" value={link} size={180} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => downloadImage("png")}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm hover:bg-orange-600 transition-colors"
                >
                  Download PNG
                </button>
                <button
                  onClick={() => downloadImage("jpg")}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm hover:bg-orange-600 transition-colors"
                >
                  Download JPG
                </button>
              </div>
              <button
                onClick={downloadPDF}
                className="mt-1 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm hover:bg-orange-600 transition-colors"
              >
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

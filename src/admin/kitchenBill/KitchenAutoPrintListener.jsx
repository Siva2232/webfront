import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { getKitchenPrintMode } from "./kitchenPrintMode";
import { directPrintKitchenReceipt } from "./kitchenPrint";

/**
 * Listens for new kitchen tickets anywhere in admin/kitchen/waiter layouts
 * and sends them to the thermal printer when auto-print mode is enabled.
 */
export default function KitchenAutoPrintListener() {
  const printedIdsRef = useRef(new Set());

  useEffect(() => {
    const onCreated = (e) => {
      if (getKitchenPrintMode() !== "auto") return;

      const kb = e.detail;
      const id = String(kb?._id || kb?.id || "");
      if (!id || printedIdsRef.current.has(id)) return;

      printedIdsRef.current.add(id);
      if (printedIdsRef.current.size > 200) {
        printedIdsRef.current = new Set([...printedIdsRef.current].slice(-100));
      }

      void directPrintKitchenReceipt(kb)
        .then(() => toast.success("KOT sent to kitchen printer"))
        .catch((err) => toast.error(err?.message || "Auto print failed"));
    };

    window.addEventListener("kitchenBillCreated", onCreated);
    return () => window.removeEventListener("kitchenBillCreated", onCreated);
  }, []);

  return null;
}

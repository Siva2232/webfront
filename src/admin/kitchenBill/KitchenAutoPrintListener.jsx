import { useEffect } from "react";
import { maybeAutoPrintKitchenBill } from "./kitchenAutoPrint";

/**
 * Listens for new kitchen tickets anywhere in admin/kitchen/waiter layouts
 * and sends them to the thermal printer when auto-print mode is enabled.
 */
export default function KitchenAutoPrintListener() {
  useEffect(() => {
    const onCreated = (e) => {
      void maybeAutoPrintKitchenBill(e.detail);
    };

    window.addEventListener("kitchenBillCreated", onCreated);
    return () => window.removeEventListener("kitchenBillCreated", onCreated);
  }, []);

  return null;
}

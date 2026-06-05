import { useEffect } from "react";
import { fetchPrinterSettingsFromServer } from "./printerSettingsSync";

/** Loads printer IPs from the server into local tenant cache for staff devices. */
export default function PrinterSettingsHydrator() {
  useEffect(() => {
    void fetchPrinterSettingsFromServer();
  }, []);

  return null;
}

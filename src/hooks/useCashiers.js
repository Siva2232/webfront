import { useState, useEffect, useCallback } from "react";
import { getCurrentRestaurantId } from "../utils/tenantCache";
import { getStaffCashiers } from "../api/hrApi";

/**
 * Cashiers for POS print dialogs — sourced from HR staff with `isCashier: true`.
 * Shape: { id, name }[] (id is Mongo _id string)
 */
export function useCashiers() {
  const [cashiers, setCashiers] = useState([]);

  const reload = useCallback(async () => {
    const rid = getCurrentRestaurantId();
    if (!rid) {
      setCashiers([]);
      return [];
    }
    try {
      const { data } = await getStaffCashiers();
      const list = Array.isArray(data) ? data : [];
      const mapped = list.map((s) => ({
        id: String(s._id),
        name: s.name || "—",
      }));
      setCashiers(mapped);
      return mapped;
    } catch {
      setCashiers([]);
      return [];
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { cashiers, reload };
}

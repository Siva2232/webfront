import { useState, useEffect, useCallback } from "react";
import { getCurrentRestaurantId, tenantGet, tenantSet } from "../utils/tenantCache";

const STORAGE_KEY = "cashiersList";

function newCashierId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Restaurant-scoped cashier list (localStorage via tenant cache).
 * Shape: { id: string, name: string }[]
 */
export function useCashiers() {
  const [cashiers, setCashiers] = useState([]);

  const reload = useCallback(() => {
    const rid = getCurrentRestaurantId();
    const raw = rid ? tenantGet(STORAGE_KEY, rid) : null;
    setCashiers(Array.isArray(raw) ? raw : []);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addCashier = useCallback((name) => {
    const trimmed = String(name ?? "").trim();
    if (!trimmed) return { ok: false, error: "Enter a cashier name" };
    const rid = getCurrentRestaurantId();
    if (!rid) return { ok: false, error: "Restaurant not selected" };
    const prev = tenantGet(STORAGE_KEY, rid);
    const list = Array.isArray(prev) ? prev : [];
    const cashier = { id: newCashierId(), name: trimmed };
    const next = [...list, cashier];
    tenantSet(STORAGE_KEY, rid, next);
    setCashiers(next);
    return { ok: true, cashier };
  }, []);

  return { cashiers, addCashier, reload };
}

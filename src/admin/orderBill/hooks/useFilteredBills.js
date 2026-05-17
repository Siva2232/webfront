import { useMemo } from "react";
import { billIdentityKey } from "../../../utils/billIdentity";
import { computeGstFromSubtotal } from "../../../utils/gstRates";

function sessionRootForBill(bill, ordersById) {
  if (bill?.sessionRef) return String(bill.sessionRef);
  const ref = billIdentityKey(bill);
  const order = ordersById.get(ref);
  if (order?.sessionRef) return String(order.sessionRef);
  return ref;
}

function mergeBillGroup(group) {
  if (group.length === 1) return group[0];

  const primary =
    group.find((b) => b.sessionRef && billIdentityKey(b) === String(b.sessionRef)) ||
    group.sort(
      (a, b) =>
        new Date(a.billedAt || a.createdAt) - new Date(b.billedAt || b.createdAt)
    )[0];

  const items = [];
  const paymentSessions = [];
  const seenItemKeys = new Set();

  for (const b of group) {
    for (const item of b.items || []) {
      const key = `${item.name}|${item.qty}|${item.price}|${item.addedAt || ""}`;
      if (seenItemKeys.has(key)) continue;
      seenItemKeys.add(key);
      items.push(item);
    }
    for (const s of b.paymentSessions || []) {
      paymentSessions.push(s);
    }
  }

  const subtotal = items.reduce((sum, i) => sum + (i.price || 0) * (i.qty || 0), 0);
  const { cgst, sgst, grandTotal } = computeGstFromSubtotal(subtotal);

  return {
    ...primary,
    items,
    paymentSessions,
    totalAmount: grandTotal,
    billDetails: { subtotal, cgst, sgst, grandTotal },
    orderRef: primary.sessionRef || primary.orderRef,
    sessionRef: primary.sessionRef || primary.orderRef,
    _mergedSessionBills: group.length,
  };
}

export function useFilteredBills({ bills, orders, dateFilter, displayLimit }) {
  const ordersById = useMemo(() => {
    const map = new Map();
    (orders || []).forEach((o) => {
      const id = o?._id ?? o?.id;
      if (id != null) map.set(String(id), o);
    });
    return map;
  }, [orders]);

  const filteredBills = useMemo(() => {
    const dedupedMap = new Map();
    (bills || []).forEach((b, i) => {
      let key = billIdentityKey(b);
      if (!key) key = `__bill_${i}`;
      if (!dedupedMap.has(key)) dedupedMap.set(key, b);
    });

    let deduped = Array.from(dedupedMap.values());

    const sessionGroups = new Map();
    for (const b of deduped) {
      const root = sessionRootForBill(b, ordersById) || billIdentityKey(b);
      if (!root) continue;
      if (!sessionGroups.has(root)) sessionGroups.set(root, []);
      sessionGroups.get(root).push(b);
    }

    deduped = Array.from(sessionGroups.values()).map(mergeBillGroup);

    if (dateFilter) {
      const pick = new Date(dateFilter);
      const start = new Date(
        pick.getFullYear(),
        pick.getMonth(),
        pick.getDate(),
        0,
        0,
        0,
        0
      );
      const end = new Date(
        pick.getFullYear(),
        pick.getMonth(),
        pick.getDate(),
        23,
        59,
        59,
        999
      );
      deduped = deduped.filter((b) => {
        const d = new Date(b.billedAt || b.createdAt);
        return d >= start && d <= end;
      });
    }

    return deduped.sort(
      (a, b) =>
        new Date(b.billedAt || b.createdAt) - new Date(a.billedAt || a.createdAt)
    );
  }, [bills, ordersById, dateFilter]);

  const uniqueBills = useMemo(() => {
    return filteredBills.slice(0, displayLimit);
  }, [filteredBills, displayLimit]);

  return { filteredBills, uniqueBills };
}

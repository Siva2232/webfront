import { useMemo } from "react";

export function useFilteredBills({ bills, dateFilter, displayLimit }) {
  const filteredBills = useMemo(() => {
    const dedupedMap = new Map();
    (bills || []).forEach((b) => {
      const key = b.orderRef || b._id || b.id;
      if (!dedupedMap.has(key)) dedupedMap.set(key, b);
    });

    let deduped = Array.from(dedupedMap.values());

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
  }, [bills, dateFilter]);

  const uniqueBills = useMemo(() => {
    return filteredBills.slice(0, displayLimit);
  }, [filteredBills, displayLimit]);

  return { filteredBills, uniqueBills };
}


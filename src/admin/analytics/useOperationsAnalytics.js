import { useState, useEffect, useCallback } from "react";
import { getOperationsInsights } from "../../api/orderAnalyticsApi";
import { EMPTY_INSIGHTS } from "./operationsMetrics";

export function useOperationsAnalytics({ startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInsights = useCallback(async () => {
    if (!startDate || !endDate) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getOperationsInsights({ startDate, endDate });
      setData(res.data?.status === "success" ? res.data.data : res.data);
    } catch (err) {
      setData(null);
      setError(err.response?.data?.message || err.message || "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!startDate || !endDate) {
        if (!cancelled) {
          setData(null);
          setError(null);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await getOperationsInsights({ startDate, endDate });
        if (!cancelled) {
          setData(res.data?.status === "success" ? res.data.data : res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err.response?.data?.message || err.message || "Failed to load insights");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  return {
    insights: data || EMPTY_INSIGHTS,
    loading,
    error,
    retry: fetchInsights,
  };
}

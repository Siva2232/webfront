// src/context/SalesContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const SalesContext = createContext();

export function SalesProvider({ children }) {
  const [salesData, setSalesData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSalesByRange = useCallback(async (range) => {
    try {
      setIsLoading(true);
      setError(null);

      // Example endpoints — change according to your backend
      const endpoints = {
        day:   '/api/analytics/sales/day',
        week:  '/api/analytics/sales/week',
        month: '/api/analytics/sales/month',
        year:  '/api/analytics/sales/year',
      };

      const res = await fetch(endpoints[range] || endpoints.week);
      if (!res.ok) throw new Error('Failed to fetch sales data');

      const data = await res.json();

      setSalesData(prev => ({
        ...prev,
        [range]: data  // expected format: [{ date: "2025-01-13", revenue: 12400, orders: 47 }, ...]
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <SalesContext.Provider value={{ 
      salesData, 
      isLoading, 
      error,
      fetchSalesByRange 
    }}>
      {children}
    </SalesContext.Provider>
  );
}

export const useSalesData = () => useContext(SalesContext);
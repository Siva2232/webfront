// src/context/SalesContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import API from '../api/axios';

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
        day:   '/analytics/sales/day',
        week:  '/analytics/sales/week',
        month: '/analytics/sales/month',
        year:  '/analytics/sales/year',
      };

      const { data } = await API.get(endpoints[range] || endpoints.week);

      setSalesData(prev => ({
        ...prev,
        [range]: data  // expected format: [{ date: "2025-01-13", revenue: 12400, orders: 47 }, ...]
      }));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
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
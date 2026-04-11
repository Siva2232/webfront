import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { hrLogin, getMyHRProfile } from '../api/hrApi';

const HRContext = createContext(null);

export const HRProvider = ({ children }) => {
  const [hrStaff, setHRStaff] = useState(null);
  const [hrToken, setHRToken] = useState(() => localStorage.getItem('hrToken') || null);
  const [hrLoading, setHRLoading] = useState(true);

  // Load staff profile on mount when hrToken exists
  useEffect(() => {
    if (hrToken) {
      localStorage.setItem('hrToken', hrToken);
      getMyHRProfile()
        .then(({ data }) => setHRStaff(data))
        .catch(() => { logout(); })
        .finally(() => setHRLoading(false));
    } else {
      setHRLoading(false);
    }
  }, [hrToken]);

  const login = useCallback(async (email, password) => {
    const { data } = await hrLogin({ email, password });
    localStorage.setItem('hrToken', data.token);
    if (data.restaurantId) {
      localStorage.setItem('restaurantId', data.restaurantId.toUpperCase().trim());
    }
    setHRToken(data.token);
    setHRStaff(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hrToken');
    setHRToken(null);
    setHRStaff(null);
  }, []);

  return (
    <HRContext.Provider value={{ hrStaff, hrToken, hrLoading, login, logout }}>
      {children}
    </HRContext.Provider>
  );
};

export const useHR = () => {
  const ctx = useContext(HRContext);
  if (!ctx) throw new Error('useHR must be used within HRProvider');
  return ctx;
};

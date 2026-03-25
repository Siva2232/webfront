import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import API from "../api/axios";

export default function CashierModal({ isOpen, onClose, onConfirm, isLoading }) {
  const [cashiers, setCashiers] = useState([]);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [loadingCashiers, setLoadingCashiers] = useState(true);
  const [error, setError] = useState(null);

  // Fetch cashiers on mount
  useEffect(() => {
    if (isOpen) {
      fetchCashiers();
    }
  }, [isOpen]);

  const fetchCashiers = async () => {
    try {
      setLoadingCashiers(true);
      setError(null);
      const res = await API.get("/cashiers");
      if (res.data?.data) {
        setCashiers(res.data.data);
        // Auto-select first cashier
        if (res.data.data.length > 0 && !selectedCashier) {
          setSelectedCashier(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching cashiers:", err);
      setError("Failed to load cashiers");
    } finally {
      setLoadingCashiers(false);
    }
  };

  const handleConfirm = () => {
    if (selectedCashier) {
      onConfirm(selectedCashier);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-full mx-auto mb-4">
              <AlertCircle size={28} className="text-indigo-600" />
            </div>

            <h3 className="text-lg font-black text-center text-slate-900 mb-2">
              Select Cashier
            </h3>

            <p className="text-sm text-slate-500 text-center mb-6">
              Choose a cashier name for this receipt
            </p>

            {loadingCashiers ? (
              <div className="flex items-center justify-center py-8">
                <Loader size={24} className="text-indigo-600 animate-spin" />
              </div>
            ) : error ? (
              <div className="py-6 bg-red-50 rounded-xl border border-red-200 text-center">
                <p className="text-sm text-red-600 font-bold">{error}</p>
              </div>
            ) : (
              <select
                value={selectedCashier?.id || ""}
                onChange={(e) => {
                  const cashier = cashiers.find(
                    (c) => c.id === parseInt(e.target.value)
                  );
                  setSelectedCashier(cashier);
                }}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent mb-6"
              >
                <option value="">Select a cashier...</option>
                {cashiers.map((cashier) => (
                  <option key={cashier.id} value={cashier.id}>
                    {cashier.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || !selectedCashier || loadingCashiers}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Confirm & Print
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

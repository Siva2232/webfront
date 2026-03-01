import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// legacy placeholder, automatically redirect to purchase page
export default function ExpenseTracker() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/admin/expense/purchase", { replace: true });
  }, [navigate]);
  return null;
}

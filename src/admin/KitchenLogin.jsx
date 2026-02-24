import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// the system login page now handles both admin and kitchen users. this
// component exists for backwards‑compatibility in case someone hits
// "/kitchen/login" directly – it simply forwards them to the shared form.
export default function KitchenLogin() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}

import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useCart, TAKEAWAY_TABLE } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import { Utensils, ShoppingBag, CalendarX, RefreshCw } from "lucide-react";
import { getCurrentRestaurantId, tenantKey } from "../utils/tenantCache";
import API from "../api/axios";
import { format } from "date-fns";

export default function ChooseMode() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const table = searchParams.get("table")?.trim().replace(/^0+/, "") || "";
  const mode = searchParams.get("mode");
  const { setTable } = useCart();
  const { features } = useTheme();
  const reservationsEnabled = features.reservations !== false;

  const [isTableReserved, setIsTableReserved] = useState(false);
  const [reservationInfo, setReservationInfo] = useState(null);
  // Start as true immediately when there's a table — prevents flash of chooser or premature redirect
  const [checkingReservation, setCheckingReservation] = useState(!!table);
  // Tracks whether the first async check has finished so navigation logic knows it's safe to run
  const [reservationChecked, setReservationChecked] = useState(!table);
  const pollRef = useRef(null);

  // Check if this table has an active reservation within 1 hour of now
  const checkReservation = async () => {
    if (!table) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await API.get(`/reservations?date=${today}`);
      const now = Date.now();
      const ONE_HOUR = 60 * 60 * 1000;
      const active = (data || []).find((res) => {
        if (!["Pending", "Confirmed"].includes(res.status)) return false;
        if (String(res.table) !== String(table)) return false;
        const resTime = new Date(res.reservationTime).getTime();
        // Block from 1 hour before the reservation time until the reservation time passes
        return now >= resTime - ONE_HOUR;
      });
      setIsTableReserved(!!active);
      setReservationInfo(active || null);
    } catch {
      // On error, don't block customer
      setIsTableReserved(false);
      setReservationInfo(null);
    }
  };

  useEffect(() => {
    if (!table) return;
    if (!reservationsEnabled) {
      setCheckingReservation(false);
      setReservationChecked(true);
      setIsTableReserved(false);
      setReservationInfo(null);
      return;
    }
    setCheckingReservation(true);
    checkReservation().finally(() => {
      setCheckingReservation(false);
      setReservationChecked(true);
    });
    pollRef.current = setInterval(checkReservation, 30000);
    return () => clearInterval(pollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, reservationsEnabled]);

  // Navigation / mode-skip logic — only runs AFTER reservation check completes AND table is not reserved
  useEffect(() => {
    if (!reservationChecked || isTableReserved) return;

    // Once user selected mode for this table in current visit, skip chooser.
    const _rid = getCurrentRestaurantId();
    if (table && localStorage.getItem(tenantKey(`tableModeChosen_${table}`, _rid))) {
      setTable(table);
      navigate(`/menu?table=${table}`, { replace: true });
      return;
    }

    if (mode === "takeaway") {
      navigate(`/menu?mode=takeaway&from=chooser`, { replace: true });
    } else if (!table) {
      navigate("/menu", { replace: true });
    }
  }, [mode, table, navigate, setTable, reservationChecked, isTableReserved]);

  const chooseDineIn = () => {
    if (table) {
      const _rid = getCurrentRestaurantId();
      localStorage.setItem(tenantKey(`tableModeChosen_${table}`, _rid), "true");
      setTable(table);
      navigate(`/menu?table=${table}&from=chooser`);
    } else {
      navigate(`/menu`);
    }
  };

  const chooseTakeaway = () => {
    const _rid = getCurrentRestaurantId();
    localStorage.setItem(tenantKey(`tableModeChosen_${TAKEAWAY_TABLE}`, _rid), "true");
    navigate(`/menu?mode=takeaway&from=chooser`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 sm:px-6 py-8 md:py-12 font-sans antialiased text-black md:mt-[10px] mt-[0px]">
      <div className="w-full max-w-md space-y-10 sm:space-y-12">

        {/* Table Reserved Gate */}
        {checkingReservation ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Checking table status...</p>
          </div>
        ) : isTableReserved ? (
          <div className="flex flex-col items-center text-center space-y-6 py-8">
            <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
              <CalendarX size={36} className="text-amber-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">
                Table Reserved
              </h1>
              <div className="h-1 w-14 bg-amber-400 mx-auto rounded-full" />
              {reservationInfo && (
                <p className="text-base text-gray-600 pt-1">
                  Reserved at{" "}
                  <span className="font-bold text-black">
                    {format(new Date(reservationInfo.reservationTime), "hh:mm a")}
                  </span>
                </p>
              )}
              <p className="text-sm text-gray-500 max-w-xs mx-auto pt-1">
                This table is reserved for another guest. Please ask a staff member for assistance or choose another seat.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
              <RefreshCw size={12} className="animate-spin" />
              <span></span>
            </div>
          </div>
        ) : (
          <>
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase italic">
            Welcome
          </h1>
          <div className="h-1 w-14 bg-black mx-auto rounded-full" />
          <p className="text-base sm:text-lg font-medium text-gray-600 uppercase tracking-wide pt-1">
            Select Order Mode
          </p>
        </div>

        {/* Options */}
        <div className="grid gap-5 sm:gap-6">
          {/* Dine In */}
          <button
            onClick={chooseDineIn}
            disabled={!table}
            className={`
              group relative flex flex-col items-start p-6 sm:p-7 
              border-2 rounded-xl transition-all duration-300 text-left
              touch-manipulation active:scale-[0.98]
              ${table
                ? "border-black hover:bg-black hover:text-white shadow-sm hover:shadow-md"
                : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
              }
            `}
          >
            <div className="flex justify-between items-center w-full mb-5">
              <Utensils size={32} strokeWidth={2.2} className="shrink-0" />
              {table && (
                <span className="text-xs sm:text-sm font-bold px-3 py-1.5 border border-current rounded-full uppercase tracking-wide">
                  Table {table}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase italic leading-tight">
              Dine In
            </h2>
            <p className="text-sm sm:text-base mt-2 text-gray-600 group-hover:text-gray-200">
              Enjoy your meal at our table
            </p>
          </button>

          {/* Takeaway */}
          <button
            onClick={chooseTakeaway}
            className={`
              group relative flex flex-col items-start p-6 sm:p-7 
              border-2 border-black rounded-xl 
              hover:bg-black hover:text-white transition-all duration-300 
              shadow-sm hover:shadow-md text-left touch-manipulation active:scale-[0.98]
            `}
          >
            <div className="mb-5">
              <ShoppingBag size={32} strokeWidth={2.2} className="shrink-0" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase italic leading-tight">
              Takeaway
            </h2>
            <p className="text-sm sm:text-base mt-2 text-gray-600 group-hover:text-gray-200">
              Grab your food and go
            </p>
          </button>
        </div>

        {/* Footer hint */}
        <div className="text-center pt-4">
          {!table && (
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Scan a QR code to enable Dine-In
            </p>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
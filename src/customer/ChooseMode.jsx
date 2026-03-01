import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useCart } from "../context/CartContext";
import { Utensils, ShoppingBag, MapPin } from "lucide-react";

export default function ChooseMode() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const table = searchParams.get("table")?.trim().replace(/^0+/, "") || "";
  const mode = searchParams.get("mode");
  const { setTable } = useCart();

  useEffect(() => {
    if (mode === "takeaway") {
      navigate(`/menu?mode=takeaway&from=chooser`, { replace: true });
    } else if (!table) {
      navigate("/menu", { replace: true });
    }
  }, [mode, table, navigate]);

  const chooseDineIn = () => {
    if (table) {
      setTable(table);
      navigate(`/menu?table=${table}&from=chooser`);
    } else {
      navigate(`/menu`);
    }
  };

  const chooseTakeaway = () => {
    navigate(`/menu?mode=takeaway&from=chooser`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 sm:px-6 py-8 md:py-12 font-sans antialiased text-black mt-[-104px]">
      <div className="w-full max-w-md space-y-10 sm:space-y-12">
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
          {!table ? (
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Scan a QR code to enable Dine-In
            </p>
          ) : (
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gray-50 rounded-full border border-gray-200 shadow-sm">
              <MapPin size={14} className="text-gray-700" />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-tight text-gray-800">
                Location confirmed: Section A
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
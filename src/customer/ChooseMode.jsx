import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useCart } from "../context/CartContext";
import { Utensils, ShoppingBag, MapPin } from "lucide-react"; // Optional: lucide-react icons

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
    <div className="min-h-screen flex items-center justify-center bg-white p-6 font-sans antialiased text-black">
      <div className="max-w-md w-full space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">
            Welcome
          </h1>
          <div className="h-1 w-12 bg-black mx-auto" />
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest pt-2">
            Select Order Mode
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid gap-4">
          {/* Dine In Card */}
          <button
            onClick={chooseDineIn}
            disabled={!table}
            className={`group relative flex flex-col items-start p-6 border-2 transition-all duration-200 text-left
              ${table 
                ? "border-black hover:bg-black hover:text-white" 
                : "border-gray-100 opacity-50 cursor-not-allowed"
              }`}
          >
            <div className="flex justify-between w-full items-center mb-4">
              <Utensils size={28} strokeWidth={2.5} />
              {table && (
                <span className="text-xs font-bold px-2 py-1 border border-current uppercase">
                  Table {table}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black uppercase italic">Dine In</h2>
            <p className="text-sm mt-1 opacity-70">Enjoy your meal at our table.</p>
          </button>

          {/* Takeaway Card */}
          <button
            onClick={chooseTakeaway}
            className="group relative flex flex-col items-start p-6 border-2 border-black hover:bg-black hover:text-white transition-all duration-200 text-left"
          >
            <div className="mb-4">
              <ShoppingBag size={28} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black uppercase italic">Takeaway</h2>
            <p className="text-sm mt-1 opacity-70">Grab your food and go.</p>
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center">
          {!table ? (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">
              Scan a QR code to enable Dine-In
            </p>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-100">
              <MapPin size={12} />
              <span className="text-xs font-bold uppercase tracking-tight">
                Confirmed Location: Section A
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
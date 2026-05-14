import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useUI } from "../context/UIContext";
import { useProducts } from "../context/ProductContext";
import Navbar from "../components/Navbar";
import { Outlet, useLocation } from "react-router-dom";
import OfferModal from "../components/OfferModal";
import { getCurrentRestaurantId, syncRestaurantCache } from "../utils/tenantCache";

export default function CustomerLayout() {
  const { offers: activeOffers, fetchCustomerPromos } = useUI();
  const { ensureProductsLoaded } = useProducts();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchCustomerPromos();
    ensureProductsLoaded();
  }, [fetchCustomerPromos, ensureProductsLoaded]);

  // Keep tenant in sync when customer links include ?restaurantId= (SPA + cold loads).
  useEffect(() => {
    const r = searchParams.get("restaurantId")?.toUpperCase().trim();
    if (r) syncRestaurantCache(r);
  }, [searchParams]);

  const restaurantId = getCurrentRestaurantId();

  // Hide navbar on flow pages where we want a clean scanner (e.g. choose-mode)
  const showNavbar = !location.pathname.startsWith("/choose-mode");

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 py-12 text-center font-sans">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
          Flow Diner
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
          Venue link required
        </h1>
        <p className="mt-4 max-w-md text-sm text-slate-600 leading-relaxed">
          Open your menu using your restaurant&apos;s QR or link. 
                  </p>
        {/* <code className="mt-5 break-all rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-semibold text-slate-800 shadow-sm max-w-lg">
          {typeof window !== "undefined"
            ? `${window.location.origin}/menu?restaurantId=RESTO001`
            : "/menu?restaurantId=RESTO001"}
        </code> */}
        {/* <p className="mt-3 text-xs text-slate-500">
          Replace <span className="font-mono font-bold">RESTO001</span> with your restaurant code from the owner dashboard.
        </p> */}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {showNavbar && <Navbar title="Flow Diner" />}

      <OfferModal offerData={activeOffers} />

      <main className="flex-grow w-full overflow-y-auto no-scrollbar pb-24">
        <Outlet />
      </main>
    </div>
  );
}

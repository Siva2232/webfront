import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useUI } from "../context/UIContext";
import { useProducts } from "../context/ProductContext";
import Navbar from "../components/Navbar";
import { Outlet, useLocation } from "react-router-dom";
import OfferModal from "../components/OfferModal";
import { syncRestaurantCache } from "../utils/tenantCache";

export default function CustomerLayout() {
  const { offers: activeOffers, fetchCustomerPromos } = useUI();
  const { ensureProductsLoaded } = useProducts();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const venueLinked = Boolean(searchParams.get("restaurantId")?.trim());

  useEffect(() => {
    if (!venueLinked) return;
    fetchCustomerPromos();
    ensureProductsLoaded();
  }, [fetchCustomerPromos, ensureProductsLoaded, venueLinked]);

  useEffect(() => {
    const r = searchParams.get("restaurantId")?.toUpperCase().trim();
    if (r) syncRestaurantCache(r);
  }, [searchParams]);

  const showNavbar = !location.pathname.startsWith("/choose-mode");

  if (!venueLinked) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        {showNavbar && <Navbar title="Flow Diner" />}
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Venue link required</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Open the menu using your table&apos;s QR code or the link your venue shared. We
              don&apos;t load a restaurant&apos;s menu or offers without that link — it keeps each
              venue&apos;s data private.
            </p>
          </div>
        </main>
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

import { useEffect } from "react";
import { useUI } from "../context/UIContext";
import { useProducts } from "../context/ProductContext";
import Navbar from "../components/Navbar";
import { Outlet, useLocation } from "react-router-dom";
import OfferModal from "../components/OfferModal";

export default function CustomerLayout() {
  const { offers: activeOffers, fetchCustomerPromos } = useUI();
  const { ensureProductsLoaded } = useProducts();
  const location = useLocation();

  useEffect(() => {
    fetchCustomerPromos();
    ensureProductsLoaded();
  }, [fetchCustomerPromos, ensureProductsLoaded]);

  // Hide navbar on flow pages where we want a clean scanner (e.g. choose-mode)
  const showNavbar = !location.pathname.startsWith("/choose-mode");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {showNavbar && <Navbar title="MY CAFE" />}

      {/* This component now waits 6 seconds internally before showing */}
      <OfferModal offerData={activeOffers} />

      {/* Make main scrollable, hide scrollbar, add bottom padding for nav */}
      <main className="flex-grow w-full overflow-y-auto no-scrollbar pb-24">
        <Outlet />
      </main>
    </div>
  );
}
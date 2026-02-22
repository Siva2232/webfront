import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";
import OfferModal from "../components/OfferModal";
import API from "../api/axios";

export default function CustomerLayout() {
  const [activeOffers, setActiveOffers] = useState([]);

  useEffect(() => {
    const loadOffers = async () => {
      try {
        const { data } = await API.get("/offers");
        if (Array.isArray(data) && data.length > 0) {
          setActiveOffers(data.filter(p => p.isPublished !== false));
        } else {
          const saved = localStorage.getItem("promoDeals");
          if (saved) {
            setActiveOffers(JSON.parse(saved));
          }
        }
      } catch (err) {
        console.error("Failed to fetch offers from API, falling back to local", err);
        const saved = localStorage.getItem("promoDeals");
        if (saved) {
          setActiveOffers(JSON.parse(saved));
        }
      }
    };

    loadOffers();

    window.addEventListener("promosUpdated", loadOffers);
    return () => window.removeEventListener("promosUpdated", loadOffers);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar title="MY CAFE" />

      {/* This component now waits 6 seconds internally before showing */}
      <OfferModal offerData={activeOffers} />

      {/* Make main scrollable, hide scrollbar, add bottom padding for nav */}
      <main className="flex-grow w-full overflow-y-auto no-scrollbar pb-24">
        <Outlet />
      </main>
    </div>
  );
}
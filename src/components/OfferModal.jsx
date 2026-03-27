import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight } from "lucide-react";
import API from "../api/axios";
import { useUI } from "../context/UIContext";

export default function OfferModal({ offerData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const { offers } = useUI();
  const [isFlying, setIsFlying] = useState(false);

  const modalRef = useRef(null);

  const STORAGE_KEY = "promoDeals";
  const SLIDE_DURATION = 5000; // 5 seconds per slide

  // Navigation handlers - defined first to avoid reference errors
  const handleNext = useCallback(() => {
    setSlideProgress(0);
    setCurrentIndex((prev) => (prev + 1) % offers.length);
  }, [offers.length]);

  const handlePrev = useCallback(() => {
    setSlideProgress(0);
    setCurrentIndex((prev) => (prev - 1 + offers.length) % offers.length);
  }, [offers.length]);

  // Reset when offers change
  useEffect(() => {
    setCurrentIndex(0);
    setSlideProgress(0);
  }, [offers.length]);

  // Auto-open after 6 seconds (first visit only)
  useEffect(() => {
    const hasSeenOffer = sessionStorage.getItem("hasSeenOffer");
    if (offers.length > 0 && !hasSeenOffer) {
      const timer = setTimeout(() => setIsOpen(true), 6000);
      return () => clearTimeout(timer);
    }
  }, [offers.length]);

  // Listen for re-open from bell
  useEffect(() => {
    const handleShowModal = () => {
      if (offers.length > 0) {
        setIsFlying(false);
        setIsOpen(true);
      }
    };
    window.addEventListener("showOfferModal", handleShowModal);
    return () => window.removeEventListener("showOfferModal", handleShowModal);
  }, [offers.length]);

  // ── FIXED AUTO-PLAY ── with transition delay to prevent skipping
  useEffect(() => {
    if (!isOpen || offers.length <= 1) return;

    let intervalId = null;

    // Give time for slide animation to complete before starting progress
    const delayTimer = setTimeout(() => {
      setSlideProgress(0);

      intervalId = setInterval(() => {
        setSlideProgress((prev) => {
          if (prev >= 99.9) {
            handleNext();
            return 0;
          }
          // Smooth increment, prevent overshooting
          return Math.min(100, prev + 100 / (SLIDE_DURATION / 50));
        });
      }, 50);
    }, 380); // 380ms delay - good balance for spring animation

    return () => {
      clearTimeout(delayTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, currentIndex, offers.length, handleNext]);

  const closeOffer = () => {
    if (!modalRef.current) {
      setIsOpen(false);
      sessionStorage.setItem("hasSeenOffer", "true");
      return;
    }

    setIsFlying(true);

    setTimeout(() => {
      setIsOpen(false);
      setIsFlying(false);
      sessionStorage.setItem("hasSeenOffer", "true");
      window.dispatchEvent(new Event("offerViewed"));
    }, 1100);
  };

  if (offers.length === 0) return null;
  const current = offers[currentIndex];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOffer}
            className="absolute inset-0 bg-black/70 backdrop-blur-md pointer-events-auto"
          />

          <motion.div
            ref={modalRef}
            initial={{ scale: 0.88, opacity: 0, y: 40 }}
            animate={
              isFlying
                ? {
                    scale: 0.08,
                    opacity: 0.3,
                    x: "calc(50vw - 50%)",
                    y: "-46vh",
                    borderRadius: "9999px",
                    transition: { duration: 1.1, ease: [0.42, 0, 0.58, 1] },
                  }
                : { scale: 1, opacity: 1, x: 0, y: 0 }
            }
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="relative w-full max-w-[340px] aspect-[10/14] bg-black overflow-hidden rounded-3xl shadow-2xl border border-white/10 pointer-events-auto"
          >
            {/* Progress Bars */}
            <div className="absolute top-5 inset-x-6 z-50 flex gap-1.5">
              {offers.map((_, i) => (
                <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    animate={{
                      width:
                        i === currentIndex
                          ? `${slideProgress}%`
                          : i < currentIndex
                          ? "100%"
                          : "0%",
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              ))}
            </div>

            {/* Tap Zones */}
            <div className="absolute inset-0 z-40 flex pointer-events-none">
              <div
                className="w-1/3 h-full cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
              />
              <div
                className="w-2/3 h-full cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ x: 340 }}
                animate={{ x: 0 }}
                exit={{ x: -340 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0"
              >
                <img
                  src={current.imageUrl}
                  alt={current.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                <div className="absolute bottom-8 inset-x-6 z-50">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 bg-white text-black px-3 py-1 rounded-full">
                      <Sparkles size={12} className="fill-black" />
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {current.tag || "Special Offer"}
                      </span>
                    </div>
                    <h2 className="text-white text-3xl font-black uppercase italic leading-none tracking-tighter">
                      {current.title}
                    </h2>
                    <p className="text-white/90 text-sm font-medium leading-relaxed">
                      {current.description}
                    </p>
                    <button
                      onClick={closeOffer}
                      className="w-full mt-5 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg"
                    >
                      Got It <ArrowRight size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <button
              onClick={closeOffer}
              className="absolute top-5 right-5 z-60 p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all"
            >
              <X size={18} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
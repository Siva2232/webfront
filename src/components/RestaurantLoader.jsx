import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, ChefHat } from "lucide-react";

export default function RestaurantLoader({ text = "Preparing your feast", onFinish }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) setTimeout(onFinish, 800);
    }, 3500); // Slightly longer for premium feel
    return () => clearTimeout(timer);
  }, [onFinish]);

  // For individual letter animation
  const letters = Array.from(text);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(40px)" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#fafafa]"
        >
          {/* BACKGROUND: Premium Mesh Gradients */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                rotate: [0, 45, 0],
                opacity: [0.4, 0.6, 0.4]
              }}
              transition={{ duration: 15, repeat: Infinity }}
              className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-orange-100/40 to-rose-100/40 blur-[140px]"
            />
          </div>

          <div className="relative flex flex-col items-center">
            {/* CENTRAL ICON: The Rotating Plate */}
            <div className="relative group">
              {/* Outer Rotating Halo */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-6 rounded-full border border-dashed border-orange-200/50"
              />
              
              {/* Main Plate */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 20 }}
                className="relative z-10 w-40 h-40 rounded-full bg-white shadow-[0_30px_100px_rgba(0,0,0,0.08)] flex items-center justify-center overflow-hidden"
              >
                {/* Floating Elements inside plate */}
                <motion.div
                  animate={{ 
                    y: [0, -8, 0],
                    rotate: [-5, 5, -5]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="flex flex-col items-center"
                >
                  <UtensilsCrossed className="text-zinc-900" size={48} strokeWidth={1} />
                  <motion.div
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mt-2"
                  >
                    <ChefHat size={16} className="text-orange-400" />
                  </motion.div>
                </motion.div>

                {/* Glass Reflection Shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </motion.div>

              {/* Steam Particles */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex gap-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      y: [0, -60], 
                      opacity: [0, 0.5, 0],
                      scale: [1, 2],
                      x: [0, (i - 1) * 20]
                    }}
                    transition={{ 
                      duration: 2.5, 
                      repeat: Infinity, 
                      delay: i * 0.6,
                      ease: "easeOut" 
                    }}
                    className="w-1 h-10 bg-gradient-to-t from-orange-300/30 to-transparent rounded-full blur-[3px]"
                  />
                ))}
              </div>
            </div>

            {/* TEXT SECTION: Kinetic Typography */}
            <div className="mt-16 overflow-hidden">
              <div className="flex justify-center mb-4">
                {letters.map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ 
                      delay: i * 0.05, 
                      duration: 0.8,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    className="text-xl font-black text-zinc-900 uppercase tracking-widest inline-block"
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </div>

              {/* Sleek Progress Bar */}
              <div className="w-48 h-[2px] bg-zinc-100 rounded-full mx-auto relative overflow-hidden">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500 to-transparent"
                />
              </div>
            </div>

            {/* Footer Detail */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-8 text-[9px] font-bold text-zinc-400 uppercase tracking-[0.5em]"
            >
              Exquisite Culinary Experience
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
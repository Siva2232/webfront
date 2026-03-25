// import { motion, AnimatePresence } from "framer-motion";
// import { useState } from "react";
// import { Plus, Minus, Check } from "lucide-react"; // Added for better UI

// /* ---------- Veg / Non-Veg Icon ---------- */
// function FoodTypeIcon({ type }) {
//   const isVeg = type === "veg";
//   return (
//     <div className={`w-5 h-5 border-2 flex items-center justify-center rounded-sm ${isVeg ? "border-green-600" : "border-red-600"}`}>
//       <div className={`w-2.5 h-2.5 rounded-full ${isVeg ? "bg-green-600" : "bg-red-600"}`} />
//     </div>
//   );
// }

// export default function ProductCard({ product, onAdd, onRemove, initialQty = 0 }) {
//   const {
//     name,
//     description,
//     price,
//     image,
//     isAvailable = true,
//     type = "veg",
//   } = product;

//   // Track quantity locally for the UI transition
//   const [quantity, setQuantity] = useState(initialQty);
//   const [showCheck, setShowCheck] = useState(false);

//   const handleIncrement = (e) => {
//     e.stopPropagation();
//     if (!isAvailable) return;

//     setQuantity(prev => prev + 1);
//     onAdd(product); // Existing logic to update global cart context
    
//     // Show splash effect only on first add
//     if (quantity === 0) {
//       setShowCheck(true);
//       setTimeout(() => setShowCheck(false), 800);
//     }
//   };

//   const handleDecrement = (e) => {
//     e.stopPropagation();
//     if (quantity > 0) {
//       setQuantity(prev => prev - 1);
//       // Assuming you have a remove/update function in your context
//       if (onRemove) onRemove(product._id); 
//     }
//   };

//   return (
//     <motion.div
//       className="relative rounded-[2rem] overflow-hidden bg-white shadow-lg hover:shadow-xl transition-shadow duration-300"
//       animate={isAvailable ? {} : { x: [0, -5, 5, -5, 5, 0] }}
//       transition={{ duration: 0.6 }}
//     >
//       <div className="relative aspect-[4/5]">
//         {/* Image */}
//         <img
//           src={image || "https://via.placeholder.com/600x800"}
//           alt={name}
//           className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
//             !isAvailable ? "grayscale contrast-90" : "hover:scale-110"
//           }`}
//         />

//         {/* Veg / Non-Veg Icon */}
//         <div className="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-sm">
//           <FoodTypeIcon type={type} />
//         </div>

//         {/* OUT OF STOCK Overlay */}
//         <AnimatePresence>
//           {!isAvailable && (
//             <motion.div
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-900/70 backdrop-blur-[2px]"
//             >
//               <motion.div
//                 animate={{ scale: [1, 1.05, 1] }}
//                 transition={{ repeat: Infinity, duration: 1.2 }}
//                 className="bg-white px-6 py-3 rounded-2xl shadow-2xl text-slate-900 font-black text-sm uppercase tracking-widest"
//               >
//                 Sold Out
//               </motion.div>
//             </motion.div>
//           )}
//         </AnimatePresence>

//         {/* Bottom Info Gradient */}
//         <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent p-6 pt-20">
//           <h3 className="text-white text-lg font-black leading-tight tracking-tight line-clamp-1">{name}</h3>

//           {description && (
//             <p className="text-slate-300/90 text-[10px] font-medium mt-1 line-clamp-2 leading-relaxed">
//               {description}
//             </p>
//           )}

//           <div className="mt-5 flex items-center justify-between">
//             <div className="flex flex-col">
//               <span className="text-white text-2xl font-black tracking-tighter">
//                 ₹{price}
//               </span>
//             </div>

//             {/* --- SMART QUANTITY TOGGLE --- */}
//             {isAvailable && (
//               <div className="relative flex items-center">
//                 <AnimatePresence mode="wait">
//                   {quantity === 0 ? (
//                     /* Initial Add Button */
//                     <motion.button
//                       key="add-btn"
//                       initial={{ opacity: 0, scale: 0.8 }}
//                       animate={{ opacity: 1, scale: 1 }}
//                       exit={{ opacity: 0, scale: 0.8 }}
//                       onClick={handleIncrement}
//                       whileTap={{ scale: 0.9 }}
//                       className="relative bg-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl overflow-hidden group"
//                     >
//                       <AnimatePresence>
//                         {showCheck && (
//                           <motion.div
//                             initial={{ scale: 0 }}
//                             animate={{ scale: 2.5 }}
//                             exit={{ scale: 3, opacity: 0 }}
//                             className="absolute inset-0 bg-emerald-400 rounded-full"
//                           />
//                         )}
//                       </AnimatePresence>
//                       <Plus className="text-emerald-600 w-6 h-6 font-bold z-10 group-hover:rotate-90 transition-transform" />
//                     </motion.button>
//                   ) : (
//                     /* - QTY + Selector */
//                     <motion.div
//                       key="qty-selector"
//                       initial={{ width: 48, opacity: 0 }}
//                       animate={{ width: 110, opacity: 1 }}
//                       exit={{ width: 48, opacity: 0 }}
//                       className="bg-white h-12 rounded-2xl flex items-center justify-between px-1 shadow-2xl border border-white/20"
//                     >
//                       <button
//                         onClick={handleDecrement}
//                         className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
//                       >
//                         <Minus size={18} strokeWidth={3} />
//                       </button>
                      
//                       <span className="text-slate-900 font-black text-sm w-4 text-center">
//                         {quantity}
//                       </span>

//                       <button
//                         onClick={handleIncrement}
//                         className="w-9 h-9 flex items-center justify-center text-emerald-600"
//                       >
//                         <Plus size={18} strokeWidth={3} />
//                       </button>
//                     </motion.div>
//                   )}
//                 </AnimatePresence>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </motion.div>
//   );
// }

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";

function FoodTypeIcon({ type }) {
  const isVeg = type === "veg";
  return (
    <div className={`w-3.5 h-3.5 border-2 flex items-center justify-center rounded-sm ${isVeg ? "border-green-600" : "border-red-600"}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? "bg-green-600" : "bg-red-600"}`} />
    </div>
  );
}

export default function ProductCard({ product, onAdd, onRemove, initialQty = 0 }) {
  const { name, description, price, image, isAvailable = true, type = "veg" } = product;

  const [quantity, setQuantity] = useState(initialQty);

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;
    setQuantity(prev => prev + 1);
    onAdd(product);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (quantity > 0) {
      setQuantity(prev => prev - 1);
      if (onRemove) onRemove(product._id || product.id);
    }
  };

  return (
    <div className="group relative flex flex-col bg-white border border-gray-100 rounded-[2rem] overflow-hidden hover:shadow-2xl hover:border-black transition-all duration-500 h-full">
      {/* --- IMAGE SECTION --- */}
      <div className="relative aspect-square overflow-hidden shrink-0 bg-gray-50">
        <img
          src={image || "https://via.placeholder.com/600x600"}
          alt={name}
          className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${!isAvailable ? "grayscale brightness-95" : ""}`}
        />
        <div className="absolute top-4 left-4 z-10 bg-white p-1.5 rounded-xl shadow-sm">
          <FoodTypeIcon type={type} />
        </div>
        {!isAvailable && (
          <div className="absolute inset-0 z-20 bg-white/40 flex items-center justify-center backdrop-blur-[2px]">
            <div className="bg-rose-600 text-white px-5 py-2 font-black text-[10px] uppercase tracking-widest">
              Sold Out
            </div>
          </div>
        )}
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex flex-col flex-grow p-5 md:p-6 bg-white">
        
        {/* HEADING & PRICE: Fully Responsive, No Cutoff */}
        <div className="flex justify-between items-start gap-3 w-full mb-3">
          <h3 className="text-[14px] md:text-lg font-black leading-tight uppercase tracking-tight text-black break-words flex-1">
            {name}
          </h3>
          <span className="text-black text-base md:text-xl font-black tracking-tighter shrink-0">
            ₹{price}
          </span>
        </div>

        {/* DESCRIPTION: Static and fully visible */}
        {description && (
          <p className="text-gray-500 text-[11px] md:text-[13px] leading-relaxed font-medium mb-6">
            {description}
          </p>
        )}

        {/* --- BUTTONS SECTION --- */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          {isAvailable ? (
            <div className="h-11 md:h-12 w-full">
              <AnimatePresence mode="wait">
                {quantity === 0 ? (
                  <motion.button
                    key="add-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleIncrement}
                    className="w-full h-full bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-zinc-800"
                  >
                    <Plus size={14} strokeWidth={4} /> Add
                  </motion.button>
                ) : (
                  <motion.div
                    key="qty-selector"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full h-full grid grid-cols-3 border-2 border-black overflow-hidden"
                  >
                    <button 
                      onClick={handleDecrement} 
                      className="flex items-center justify-center border-r-2 border-black hover:bg-gray-50 transition-colors"
                    >
                      <Minus size={16} strokeWidth={3} />
                    </button>
                    <div className="flex items-center justify-center font-black text-xs md:text-sm">
                      {quantity}
                    </div>
                    <button 
                      onClick={handleIncrement} 
                      className="flex items-center justify-center border-l-2 border-black hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-11 md:h-12 w-full bg-gray-50 flex items-center justify-center text-gray-300 font-black text-[9px] uppercase tracking-widest">
              Out of Stock
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

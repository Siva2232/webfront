import { motion } from "framer-motion";
import {
  ChefHat,
  Flame,
  Bell,
  CheckCircle
} from "lucide-react";

const steps = [
  { key: "New", label: "New", icon: ChefHat },
  { key: "Preparing", label: "Preparing", icon: Flame },
  { key: "Ready", label: "Ready", icon: Bell },
  { key: "Served", label: "Served", icon: CheckCircle },
];

export default function OrderProgress({ status }) {
  const currentStep = steps.findIndex((s) => s.key === status);

  return (
    <div className="bg-white px-2 py-2 sm:px-4 sm:py-3">
      <h3 className="mb-2 text-[10px] font-bold text-gray-700 sm:mb-3 sm:text-xs">
        Order Progress
      </h3>

      <div className="relative flex min-h-[4rem] w-full items-center justify-between gap-0 px-0.5 sm:min-h-[4.5rem] sm:px-0">
        {/* Progress Line */}
        <div className="absolute left-2 right-2 top-[42%] -z-10 h-0.5 rounded-full bg-gray-200 sm:left-5 sm:right-5 sm:top-1/2 sm:h-1 md:left-7 md:right-7">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${(currentStep / (steps.length - 1)) * 100}%`,
            }}
            transition={{ duration: 0.6 }}
          />
        </div>

        {steps.map((step, index) => {
          const active = index <= currentStep;
          const Icon = step.icon;

          return (
            <motion.div
              key={step.key}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex min-w-0 flex-1 flex-col items-center gap-0.5 sm:gap-1"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm transition-all sm:h-10 sm:w-10 sm:shadow-md
                ${
                  active
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                <Icon className="h-[15px] w-[15px] sm:h-[18px] sm:w-[18px]" strokeWidth={2.5} />
              </div>

              <span
                className={`text-center text-[8px] font-semibold leading-tight sm:text-[10px] ${
                  active ? "text-green-600" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

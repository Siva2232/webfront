import { motion } from "framer-motion";
import {
  ChefHat,
  Flame,
  Bell,
  CheckCircle
} from "lucide-react";

const steps = [
  { key: "Preparing", label: "Preparing", icon: ChefHat },
  { key: "Cooking", label: "Cooking", icon: Flame },
  { key: "Ready", label: "Ready", icon: Bell },
  { key: "Served", label: "Served", icon: CheckCircle },
];

export default function OrderProgress({ status }) {
  const currentStep = steps.findIndex((s) => s.key === status);

  return (
    <div className="px-5 py-6 bg-white">
      <h3 className="text-sm font-bold text-gray-700 mb-5">
        Order Progress
      </h3>

      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full -z-10">
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
              className="flex flex-col items-center gap-2"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all
                ${
                  active
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                <Icon size={22} strokeWidth={2.5} />
              </div>

              <span
                className={`text-xs font-semibold ${
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

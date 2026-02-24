import AppRoutes from "./routes";
import { Toaster } from "react-hot-toast"; // toast container

/**
 * Root App Component
 * - Renders all routes (Dashboard, Bookings, Funds, etc.)
 * - Wrapped in contexts and router from main.jsx
 * - Tailwind global layout styling applied
 */
function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* All page routing handled here */}
      <AppRoutes />
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
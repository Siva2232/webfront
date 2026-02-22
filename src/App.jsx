import AppRoutes from "./routes";

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
    </div>
  );
}

export default App;
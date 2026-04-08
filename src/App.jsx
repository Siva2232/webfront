import AppRoutes from "./routes";
import { Toaster } from "react-hot-toast";
import ScrollToTop from "./components/ScrollToTop";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <AppRoutes />
      <ScrollToTop />
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

/* CLEAR STALE CACHE before any provider mounts */
import { bootstrapTenantCache } from "./utils/tenantCache";
bootstrapTenantCache();

/* CONTEXT PROVIDERS */
import { ProductProvider } from "./context/ProductContext";
import { OrderProvider } from "./context/OrderContext";
import { CartProvider } from "./context/CartContext";
import { HRProvider } from "./context/HRContext";
import { SalesProvider } from "./context/SalesContext";
import { UIProvider } from "./context/UIContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <SalesProvider>
            <UIProvider>
              <ProductProvider>
                <OrderProvider>
                  <CartProvider>
                    <HRProvider>
                      <App />
                    </HRProvider>
                  </CartProvider>
                </OrderProvider>
              </ProductProvider>
            </UIProvider>
          </SalesProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

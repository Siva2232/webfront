# Frontend Documentation — Multi-Tenant Restaurant SaaS

## Introduction
React single-page application for a multi-tenant Restaurant Management SaaS. Serves **four distinct user types** from a single deployment: customers (QR menu), restaurant admins, kitchen/waiter staff, and super admins. Each restaurant gets isolated data, branding, and feature flags.

## Tech Stack
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 4 + Framer Motion (animations)
- **State Management:** React Context API (6 providers)
- **HTTP Client:** Axios (with tenant-aware interceptor)
- **Real-Time:** Socket.io Client
- **Routing:** React Router v6
- **Deployment:** Vercel (SPA rewrites via `vercel.json`)

---

## Multi-Tenant Frontend Architecture

### How restaurantId Flows
```
QR Code / URL
  → http://localhost:5173/menu?restaurantId=RESTO001&table=1
  → bootstrapTenantCache() saves to localStorage
  → Axios interceptor attaches to EVERY request as:
      - Query param: ?restaurantId=RESTO001
      - Header: X-Restaurant-Id: RESTO001
      - Bearer token (JWT contains restaurantId)
  → Backend returns data from aktech_RESTO001 database only
```

### Tenant Cache (`utils/tenantCache.js`)
All `localStorage` keys are **namespaced** by restaurant to prevent cross-tenant data leakage:
```
products_RESTO001       ← RESTO001's product cache
products_RESTO002       ← RESTO002's product cache (separate)
cachedOrders_RESTO001   ← RESTO001's orders
ui_banners_RESTO001     ← RESTO001's banners
```

Key functions:
| Function | Purpose |
|:---|:---|
| `getCurrentRestaurantId()` | Reads from URL param → localStorage |
| `tenantKey(base, rid)` | Returns `base_RESTOXXX` |
| `tenantGet(base, rid)` | JSON.parse from namespaced localStorage |
| `tenantSet(base, rid, value)` | JSON.stringify to namespaced localStorage |
| `tenantRemove(base, rid)` | Remove namespaced key |
| `bootstrapTenantCache()` | Called ONCE before React renders — saves URL restaurantId to localStorage |
| `syncRestaurantCache(id)` | Persists active restaurantId |

### Axios Interceptor (`api/axios.js`)
Every HTTP request automatically includes:
1. `Authorization: Bearer <token>` (from localStorage `token` or `hrToken`)
2. `X-Restaurant-Id: RESTOXXX` header
3. `?restaurantId=RESTOXXX` query parameter

The interceptor resolves `restaurantId` with priority:
```
URL query param → localStorage → JWT payload decode (last resort)
```

### Branding / White-Label (`context/ThemeContext.jsx`)
Each restaurant has custom branding (colors, logo, font, theme). On load:
1. Restores from `sessionStorage` (namespaced: `restaurantBranding_RESTO001`) for instant paint
2. Fetches fresh from `/api/restaurants/:id/branding`
3. Applies to CSS custom properties: `--primary`, `--secondary`, `--accent`, `--font`

### Session Isolation on Logout / Switch
- **Hard Reloads:** All logout handlers use `window.location.href` (not React `navigate()`) to fully destroy memory state, socket connections, and context values.
- **Login Detection:** When a user logs into a different restaurant, `Login.jsx` detects the restaurantId change and forces a hard reload.
- **Context Reset:** Each context (`ProductContext`, `OrderContext`, `UIContext`) monitors for restaurantId changes via `focus`/`popstate` events and resets state + re-fetches.

---

## Project Structure
```
webfront/src/
├── main.jsx                    # Entry point — bootstraps tenant cache, wraps providers
├── App.jsx                     # Root component
├── api/
│   └── axios.js                # Axios instance with tenant-aware interceptors
├── routes/
│   ├── index.jsx               # All routes: Customer, Admin, Kitchen, Waiter, HR, SuperAdmin
│   ├── ProtectedRoute.jsx      # Auth gate for admin routes
│   ├── KitchenRoutes.jsx       # Kitchen panel routing
│   └── WaiterRoutes.jsx        # Waiter panel routing
├── context/
│   ├── AuthContext.jsx          # Login/logout state, user info
│   ├── ThemeContext.jsx         # Branding, CSS variables, white-label
│   ├── ProductContext.jsx       # Products, categories, sub-items + Socket.io sync
│   ├── OrderContext.jsx         # Orders, bills, kitchen bills + Socket.io sync
│   ├── CartContext.jsx          # Customer cart (namespaced by restaurant + table)
│   ├── UIContext.jsx            # Banners, offers, notifications, reservations
│   ├── SalesContext.jsx         # Analytics data
│   └── HRContext.jsx            # HR module state
├── customer/
│   ├── CustomerLayout.jsx       # Layout with navbar + offer modal
│   ├── Menu.jsx                 # Product listing (QR menu)
│   ├── Cart.jsx                 # Dine-in cart
│   ├── TakeawayCart.jsx         # Takeaway cart
│   ├── ChooseMode.jsx           # Dine-in vs Takeaway selector
│   ├── OrderStatus.jsx          # Order tracking
│   └── OrderSummary.jsx         # Post-order summary
├── admin/
│   ├── AdminLayout.jsx          # Sidebar navigation + feature-gated menu items
│   ├── Dashboard.jsx            # Real-time analytics
│   ├── Products.jsx             # Product management
│   ├── AddProduct.jsx           # Product creation form
│   ├── EditForm.jsx             # Product edit form
│   ├── Orders.jsx               # Live order management
│   ├── ManualOrder.jsx          # Admin manual order creation
│   ├── OrderBill.jsx            # Bill management
│   ├── ManualBill.jsx           # Manual bill creation
│   ├── KitchenBill.jsx          # Kitchen bill view
│   ├── Tables.jsx               # Table layout management
│   ├── QrGenerator.jsx          # QR code generator (includes restaurantId in URL)
│   ├── Token.jsx                # Order token display
│   ├── Reservations.jsx         # Reservation management
│   ├── CustomerSupport.jsx      # Customer issue tracking
│   ├── OfferPanel.jsx           # Offer/deal management
│   ├── BannerPanel.jsx          # Banner image management
│   ├── Analytics.jsx            # Sales reports
│   ├── SubscriptionPage.jsx     # Subscription status
│   ├── Subitem.jsx              # Sub-item library
│   ├── hr/                      # Admin-embedded HR pages
│   │   ├── AdminHRDashboard.jsx
│   │   ├── AdminStaff.jsx
│   │   ├── AdminAttendance.jsx
│   │   ├── AdminLeaves.jsx
│   │   ├── AdminShifts.jsx
│   │   └── AdminPayroll.jsx
│   └── accounting/              # Accounting module
│       ├── AccountingLayout.jsx
│       ├── AccDashboard.jsx
│       ├── AccParties.jsx
│       ├── AccAccounts.jsx
│       ├── AccOrders.jsx
│       ├── AccPurchases.jsx
│       ├── AccExpenses.jsx
│       ├── AccLoans.jsx
│       ├── AccPayments.jsx
│       ├── AccLedger.jsx
│       └── AccReports.jsx
├── hr/                          # Standalone HR portal
│   ├── HRLogin.jsx
│   ├── HRLayout.jsx
│   ├── HRDashboard.jsx
│   ├── staff/
│   ├── attendance/
│   ├── leaves/
│   ├── shifts/
│   ├── payroll/
│   └── portal/StaffPortal.jsx   # Staff self-service
├── superadmin/
│   ├── SuperAdminLogin.jsx
│   ├── SuperAdminLayout.jsx
│   ├── SuperAdminDashboard.jsx
│   ├── RestaurantList.jsx       # Create/manage restaurants
│   ├── PlanManager.jsx          # Subscription plan CRUD
│   └── SuperAdminAnalytics.jsx
├── components/
│   ├── Navbar.jsx               # Customer navigation bar
│   ├── ProductCard.jsx          # Product display card
│   ├── StatusBadge.jsx          # Order status indicator
│   ├── OfferModal.jsx           # Promotional offer popup
│   ├── RestaurantLoader.jsx     # Branded loading animation
│   └── SelfieAttendance.jsx     # Camera attendance component
└── utils/
    └── tenantCache.js           # Namespaced localStorage helpers
```

---

## Context Providers (State Management)

All providers wrap the app in `main.jsx`:
```jsx
<AuthProvider>
  <ThemeProvider>
    <SalesProvider>
      <UIProvider>
        <ProductProvider>
          <OrderProvider>
            <CartProvider>
              <HRProvider>
                <App />
```

### AuthContext
| Value | Type | Description |
|:---|:---|:---|
| `user` | Object | Current user info |
| `login(data)` | Function | Persist token + user, sync restaurantId |
| `logout()` | Function | Clear all storage, namespaced caches, sessionStorage |
| `isAdmin` | Boolean | Role check |
| `isKitchen` | Boolean | Role check |
| `isWaiter` | Boolean | Role check |
| `isSuperAdmin` | Boolean | Role check |

### ThemeContext
| Value | Type | Description |
|:---|:---|:---|
| `branding` | Object | `{ primaryColor, secondaryColor, accentColor, theme, fontFamily, logo, name, features }` |
| `loadBranding(rid)` | Function | Fetch and apply branding from backend |
| `previewBranding(overrides)` | Function | Live preview (Super Admin) |
| `resetPreview()` | Function | Revert to saved branding |

### ProductContext
| Value | Type | Description |
|:---|:---|:---|
| `products` | Array | All menu products (hydrated from namespaced cache) |
| `categories` | Array | Product categories |
| `subitems` | Array | Add-on items |
| `orderedCategories` | Array | Sorted category list |
| `isLoading` | Boolean | Loading state |
| `fetchProducts()` | Function | Full fetch (categories + subitems + products) |
| `fetchProductsFresh()` | Function | Force-fresh fetch (no cache) |

**Socket events listened:** `productsUpdated`, `productUpdated`, `productDeleted`, `subItemUpdated`, `subItemDeleted`, `subItemsUpdated`

### OrderContext
| Value | Type | Description |
|:---|:---|:---|
| `orders` | Array | Active orders |
| `bills` | Array | Generated bills |
| `kitchenBills` | Array | Kitchen display tickets |
| `isLoading` | Boolean | Loading state |
| `billsReady` | Boolean | Bills data loaded |
| `fetchOrders()` | Function | Fetch active orders (admin only) |
| `fetchBills()` | Function | Fetch bills (admin only) |
| `fetchTableOrders(num)` | Function | Fetch orders for a table |
| `addOrder(data)` | Function | Create order (optimistic + server) |
| `addManualOrder(data)` | Function | Admin manual order |
| `updateOrderStatus(id, s)` | Function | Change order status |
| `markBillPaid(id)` | Function | Mark bill as paid |
| `closeBill(id)` | Function | Close bill |

**Socket events listened:** `orderCreated`, `orderUpdated`, `orderItemsAdded`, `billCreated`, `billUpdated`, `kitchenBillCreated`, `kitchenBillUpdated`, `tokenReset`, `ordersSnapshot`

### UIContext
| Value | Type | Description |
|:---|:---|:---|
| `banners` | Array | Promotional banners |
| `offers` | Array | Active offers |
| `notifications` | Array | Admin notifications (gated by auth) |
| `reservations` | Array | Today's reservations (gated by auth) |
| `fetchData()` | Function | Fetch all UI data |

**Socket events listened:** `newNotification`, `notificationUpdated`, `newReservation`

### CartContext
| Value | Type | Description |
|:---|:---|:---|
| `cart` | Array | Items in cart |
| `table` | String | Current table number (or `"TAKEAWAY"`) |
| `addToCart(item)` | Function | Add item with qty/portion/addons |
| `removeFromCart(id)` | Function | Remove item |
| `clearCart()` | Function | Empty cart |
| `setTable(num)` | Function | Set table number |

Cart key is namespaced: `cart_RESTO001_TABLE3`

---

## Routing Architecture (`routes/index.jsx`)

### Route Groups
| Path Pattern | Layout | Auth Required | Description |
|:---|:---|:---|:---|
| `/menu`, `/cart`, `/order-status/*` | `CustomerLayout` | No | Customer QR menu |
| `/login` | None | No | Staff login |
| `/admin/*` | `AdminLayout` | Yes (admin) | Restaurant admin dashboard |
| `/kitchen/*` | `KitchenLayout` | Yes (kitchen) | Kitchen display system |
| `/waiter/*` | `WaiterLayout` | Yes (waiter) | Waiter order panel |
| `/hr/*` | `HRLayout` | Yes (HR) | HR management portal |
| `/hr/portal` | None | Yes (staff) | Staff self-service |
| `/superadmin/*` | `SuperAdminLayout` | Yes (superadmin) | Platform management |

### Feature Guards
```jsx
<FeatureGuard feature="hr">
  <Route path="hr/*" ... />
</FeatureGuard>
```
Reads `branding.features[feature]` from ThemeContext. If `false`, redirects to dashboard.

---

## Socket.io Client Architecture

Three independent socket connections (one per context):

### ProductContext Socket
- Connects on mount, joins restaurant room
- Listens for product/subitem CRUD events
- Auto-refreshes product list on changes

### OrderContext Socket
- Connects on mount, joins restaurant room
- Receives order snapshots on connect (staff only)
- Handles optimistic updates with server reconciliation
- 15-second protection window for local changes

### UIContext Socket
- Connects on mount, joins restaurant room
- Receives notification/reservation events
- Dispatches custom DOM events for sound alerts (`billRequested`, `waiterCall`)

### joinRoom Handshake
All sockets send:
```js
socket.emit('joinRoom', {
  restaurantId: 'RESTO001',
  token: 'jwt_token_here'  // undefined for customers
});
```
Server joins the socket to a room named `RESTO001` and (for authenticated staff) sends an `ordersSnapshot`.

---

## QR Code Flow
1. Admin generates QR in `QrGenerator.jsx`
2. QR encodes: `https://domain.com/menu?restaurantId=RESTO001&table=3`
3. Customer scans → app loads with `restaurantId` in URL
4. `bootstrapTenantCache()` saves to localStorage
5. `ChooseMode` page → dine-in or takeaway
6. Menu loads products from `aktech_RESTO001` database
7. Customer places order → POST `/api/orders?restaurantId=RESTO001`
8. Order appears in RESTO001's admin dashboard only

---

## Setup & Installation
1. `cd webfront`
2. `npm install`
3. Create `.env`:
```env
VITE_API_BASE_URL=https://your-backend.onrender.com/api   # Production
VITE_API_BASE_URL_DEV=http://localhost:5000/api            # Development (optional)
```
4. `npm run dev` (development at http://localhost:5173)
5. `npm run build` (production build)

## Scripts
- `npm run dev` — Vite dev server with HMR
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run preview` — Preview production build locally

## Styling
- Global styles: `src/index.css`
- Tailwind config: `tailwind.config.js`
- CSS custom properties set by ThemeContext: `--primary`, `--secondary`, `--accent`, `--font`
- Dark mode via `document.body.classList.toggle("dark")`

# Frontend Documentation

## Introduction
The frontend is a React-based application for the Restaurant Management System. It provides interfaces for administrators, waiters, and HR staff to manage the restaurant efficiently.

## Tech Stack
- **Framework:** React.js
- **Build Tool:** Vite
- **Styling:** Tailwind CSS & Headless UI
- **State Management:** React Context API
- **Networking:** Axios for API requests
- **Components:** Heroicons, Radix UI, Framer Motion (animations)
- **Deployment:** Optimized for Vercel

## Project Structure
- `src/App.jsx`: Main routing and layout configuration.
- `src/admin/`: Admin dashboard components, accounting, and reports.
- `src/waiter/`: Interface for waiters to take orders and manage tables.
- `src/hr/`: HR modules for staff management, attendance, and payroll.
- `src/customer/`: Customer-facing features like reservations or digital menus.
- `src/api/`: Axios instances and API service functions.
- `src/components/`: Reusable UI components (buttons, modals, inputs).
- `src/context/`: Context providers for global state (Auth, Cart, Settings).
- `src/utils/`: Utility functions and helper methods.
- `src/routes/`: Route definitions and protected route logic.

## Key Features
- **Admin Dashboard:** Real-time analytics, product management, and settings.
- **Order Taking:** A fast, intuitive interface for waiters to manage table-side ordering.
- **HR & Payroll:** Attendance tracking, leave management, and automated payslip generation.
- **Accounting:** Ledger management, expense tracking, and financial reporting.
- **Responsive Design:** Mobile-first approach using Tailwind CSS.

## Setup & Installation
1. Navigate to the `webfront` directory.
2. Install dependencies: `npm install`
3. Configure environment variables (VITE URLs for backend).
4. Run in development mode: `npm run dev`
5. Build for production: `npm run build`

## Scripts
- `npm run dev`: Start Vite development server.
- `npm run build`: Build production assets.
- `npm run lint`: Run ESLint for code quality.
- `npm run format`: Format code with Prettier.

## Styling & Layout
- Global styles are defined in `src/index.css`.
- Tailwind CSS configuraton is in `tailwind.config.js`.
- Headless UI is used for accessible, unstyled components like modals and dropdowns.

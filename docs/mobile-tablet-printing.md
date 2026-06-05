# Mobile & multi-tablet thermal printing

Print bills and kitchen tickets from **any staff tablet or phone** — no Windows POS PC required.

## How it works

```
Staff tablet (any)  →  Hosted API  →  Print connector (1–3 tablets)  →  Thermal printer (LAN)
```

- **Any tablet** logged into the webapp can tap **Print** on a bill or KOT.
- **One or more tablets** at the restaurant run **RestoPrint** in the background (the print connector).
- The connector receives jobs over the internet and sends them to your printer on the local Wi‑Fi (port 9100).
- You do **not** need a dedicated desktop PC. With 5+ order tablets, run the connector on **2–3** of them for redundancy — not every device.

## One-time setup

### 1. Printer IPs (Admin Profile)

1. Log in as **admin** on any device.
2. Open **Admin Profile** → **Invoice / POS printer** and **Kitchen / KOT printer**.
3. Enter each thermal printer's network IP (port **9100**).
4. Save changes.

### 2. Connector token (SaaS / backend)

Your backend needs `PRINT_CONNECTOR_TOKEN` set (same value on every connector device). See `print-bridge/print-bridge/PRINT_BRIDGE_INSTALLATION.md`.

### 3. Run RestoPrint on restaurant tablet(s)

**Windows tablet / PC (same as before)**

```bash
cd print-bridge
npm install
# copy .env with RESTO_CONNECTOR_API_BASE, RESTO_CONNECTOR_RESTAURANT_ID, RESTO_CONNECTOR_TOKEN
npm run print-bridge
```

**Android tablet (Termux)**

1. Install [Termux](https://termux.dev/) from F-Droid.
2. Install Node.js: `pkg install nodejs-lts`
3. Copy the `print-bridge` folder to the tablet (or clone your repo).
4. Create `print-bridge/.env`:

```
RESTO_CONNECTOR_API_BASE=https://your-backend.onrender.com
RESTO_CONNECTOR_RESTAURANT_ID=RESTO001
RESTO_CONNECTOR_TOKEN=<same-as-PRINT_CONNECTOR_TOKEN>
```

5. Run: `cd print-bridge && npm install && npm run print-bridge`
6. Keep Termux session alive (disable battery optimization for Termux).

**Optional — LAN bridge from other tablets**

If one tablet runs the bridge with `PRINT_BRIDGE_BIND=0.0.0.0`, other tablets on the same Wi‑Fi can set `bridgeUrl` to that tablet's LAN IP (e.g. `http://192.168.1.20:17881`) in local printer settings for faster on-site printing.

## Multi-tablet restaurants (5+ devices)

| Role | What to do |
|------|------------|
| Order tablets (all) | Use webapp normally; tap Print when needed |
| Connector tablets (2–3 recommended) | Run `npm run print-bridge` with connector `.env` |
| Admin | Check **Admin Profile** → connector status (green = online) |

When a connector is offline, jobs are **queued** and print automatically when any connector comes back online (polls every 30 seconds).

## Verify

1. Admin Profile shows **"X print connector(s) online"** (green).
2. From a **different** tablet, open Invoice Center → Print on a bill.
3. Receipt prints without a browser dialog.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Print connector offline (job queued)" | Start RestoPrint on at least one restaurant tablet |
| "Please log in again to print" | Staff session expired — log in and retry |
| "Printer IP not set" | Admin Profile → enter printer IP → Save |
| Job queued but never prints | Check connector token matches backend; tablet has internet |
| Duplicate prints | Should not happen — only one connector handles each job |

## Related files

- `src/admin/printing/sendToBridge.js` — routes mobile → cloud relay
- `print-bridge/server.mjs` — connector + optional local bridge
- `docs/kitchen-thermal-print.md` — kitchen auto-print modes

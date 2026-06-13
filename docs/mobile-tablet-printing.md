# Mobile & multi-tablet thermal printing

Print bills and kitchen tickets from **any staff tablet or phone** — no Windows POS PC required.

## How it works

```
Staff tablet (any)  →  Hosted API  →  RestoPrint Android app  →  Thermal printer (LAN)
```

- **Any tablet** logged into the webapp can tap **Print** on a bill or KOT.
- **One or more tablets** at the restaurant run **RestoPrint** in the background.
- The connector receives jobs over the internet and sends them to your printer on the local Wi‑Fi (port 9100).
- You do **not** need a dedicated desktop PC. With 5+ order tablets, run RestoPrint on **2–3** of them for redundancy.

## One-time setup

### 1. Printer IPs (Admin Profile)

1. Log in as **admin** on any device.
2. Open **Admin Profile** → **Invoice / POS printer** and **Kitchen / KOT printer**.
3. Enter each thermal printer's network IP (port **9100**).
4. Save changes.

### 2. Pair RestoPrint tablet(s)

1. Install the **RestoPrint** Android app on 1–3 restaurant tablets.
2. In **Admin Profile** → **Pair RestoPrint Tablet**, click **Generate Pair Code**.
3. On the tablet, open RestoPrint and scan the QR code (or enter the 6-digit code).
4. In RestoPrint → **Printer Settings**, enter and validate each printer IP.
5. Keep RestoPrint running — it uses a foreground service to stay connected.

### 3. Verify

1. Admin Profile shows **"X print connector(s) online"** (green).
2. From a **different** tablet, open Invoice Center → Print on a bill.
3. Receipt prints without a browser dialog.

## Multi-tablet restaurants (5+ devices)

| Role | What to do |
|------|------------|
| Order tablets (all) | Use webapp normally; tap Print when needed |
| Connector tablets (2–3 recommended) | Run RestoPrint with pairing completed |
| Admin | Check **Admin Profile** → connector status (green = online) |

When a connector is offline, jobs are **queued** and print automatically when any connector comes back online.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Print connector offline (job queued)" | Open RestoPrint on at least one restaurant tablet |
| "Please log in again to print" | Staff session expired — log in and retry |
| "Printer IP not set" | Admin Profile → enter printer IP → Save |
| Job queued but never prints | Re-pair RestoPrint; check tablet has internet + same Wi‑Fi as printer |
| Duplicate prints | Should not happen — print lock ensures one connector per job |

## Related files

- `src/admin/printing/sendToBridge.js` — routes mobile → cloud relay
- `src/admin/printing/RestoPrintPairing.jsx` — Admin pairing QR UI
- `restoprint/` — Android RestoPrint connector app
- `docs/kitchen-thermal-print.md` — kitchen auto-print modes

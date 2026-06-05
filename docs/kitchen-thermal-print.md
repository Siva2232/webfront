# Kitchen Bill thermal printing

Kitchen Bill (KOT) uses the same direct-print stack as Invoice Center, but targets a **separate network thermal printer**.

## Requirements

1. **Print Connector** running on at least one restaurant device (POS PC or counter tablet — required for mobile + hosted webapp):

   ```bash
   cd print-bridge
   npm run print-bridge
   ```

   You should see:
   - `RestoPrint bridge listening on http://127.0.0.1:17881`
   - `Print Connector online for restaurant RESTO001`

   See `print-bridge/print-bridge/PRINT_BRIDGE_INSTALLATION.md` for token setup. For **multi-tablet** restaurants (no desktop PC), see [`mobile-tablet-printing.md`](mobile-tablet-printing.md).

2. **Two printers** (recommended setup):
   - **Invoice / POS printer** — customer bills from Invoice Center
   - **Kitchen / KOT printer** — kitchen tickets from Kitchen Bill

   Both share the same connector; each job sends to a different IP.

## Admin Profile setup

1. Open **Admin Profile**.
2. Under **Invoice / POS printer**, enter the bill printer IP and run **Test invoice printer**.
3. Under **Kitchen / KOT printer**, enter the kitchen printer IP and run **Test kitchen printer**.
4. Click **Save Changes**.

Printer IPs are saved to the **server** (per restaurant) and synced to staff devices on login. Local browser cache is used as a fast fallback.

## Print modes (`VITE_PRINT_MODE`)

Set in Netlify / `.env` (default: `auto`):

| Mode | Behavior |
|------|----------|
| `auto` | Desktop: try local bridge first, then cloud relay. Mobile: cloud relay (or LAN bridge if `bridgeUrl` set). |
| `cloud` | Always send jobs via `POST /api/print-jobs` → any online print connector. |
| `local` | Same PC/tablet only — `http://127.0.0.1:17881/print` (or LAN `bridgeUrl`). |

```
Mobile / Netlify webapp
  → POST /api/print-jobs (authenticated)
  → Render backend
  → Socket.IO → Print Connector (any online tablet/PC)
  → LAN thermal printer
```

Admin Profile shows **connector online count**. Queued jobs print when any connector comes online.

## Kitchen Bill — Auto vs Manual

On the **Kitchen bill** page header:

| Mode | Behavior |
|------|----------|
| **Manual** | New tickets do not print automatically. Tap **Print** on a card → preview modal → **Send to printer**. |
| **Auto print** | When a new KOT arrives (socket), prints from any admin/waiter/kitchen page via `KitchenAutoPrintListener`. **Print** on a card still opens the preview and auto-sends. |

The mode is saved per restaurant.

## No browser print dialog

Kitchen printing does **not** use `window.print()` or Chrome’s print preview. All jobs go through ESC/POS → RestoPrint → network printer.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Cannot reach RestoPrint” | Run `npm run print-bridge` on a POS PC or restaurant tablet. |
| “Print Connector is offline (job queued)” | Start connector on any tablet; jobs queue and print when a connector is online. |
| “Kitchen printer IP not set” | Admin Profile → Kitchen / KOT printer → Save Changes. |
| “Please log in again to print” | Session expired; log in and retry. |
| Auto print not firing | Enable **Auto print** on Kitchen Bill header. |
| Mobile print fails | Ensure connector online on POS PC; printer IPs saved in Admin Profile. |
| Wrong printer | Verify kitchen IP in Admin Profile is not the same as invoice IP if you use two devices. |
| Print timeout | Check printer is on the same LAN, port **9100** open, printer powered on. |

## Related files

- `src/admin/kitchenBill/kitchenPrint.js` — direct kitchen print API
- `src/admin/kitchenBill/kitchenPrinterSettings.js` — kitchen printer IP/port
- `src/admin/kitchenBill/kitchenPrintMode.js` — auto / manual toggle
- `src/admin/kitchenBill/KitchenAutoPrintListener.jsx` — global auto-print listener
- `src/admin/printing/sendToBridge.js` — shared print client (local + cloud)
- `src/admin/printing/printerSettingsSync.js` — server sync for printer IPs
- `src/admin/printing/ThermalReceiptPrintModal.jsx` — shared preview UI

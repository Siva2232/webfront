# Kitchen Bill thermal printing

Kitchen Bill (KOT) uses the same direct-print stack as Invoice Center, but targets a **separate network thermal printer**.

## Requirements

1. **RestoPrint bridge** running on the POS PC (once per machine):

   ```bash
   cd webfront
   npm run print-bridge
   ```

   You should see: `RestoPrint bridge listening on http://127.0.0.1:17881`

2. **Two printers** (recommended setup):
   - **Invoice / POS printer** — customer bills from Invoice Center
   - **Kitchen / KOT printer** — kitchen tickets from Kitchen Bill

   Both can share the same bridge; each print job sends to a different IP.

## Admin Profile setup

1. Open **Admin Profile**.
2. Under **Invoice / POS printer**, enter the bill printer IP and run **Test invoice printer**.
3. Under **Kitchen / KOT printer**, enter the kitchen printer IP and run **Test kitchen printer**.
4. Click **Save Changes**.

Settings are stored per restaurant in browser local storage (tenant cache).

## Kitchen Bill — Auto vs Manual

On the **Kitchen bill** page header:

| Mode | Behavior |
|------|----------|
| **Manual** | New tickets do not print automatically. Tap **Print** on a card → preview modal → **Send to printer**. |
| **Auto print** | When a new KOT arrives (socket) while you are on the Kitchen Bill page, it prints silently to the kitchen printer. **Print** on a card still opens the preview and auto-sends (same as Invoice Center). |

The mode is saved per restaurant.

## No browser print dialog

Kitchen printing does **not** use `window.print()` or Chrome’s print preview. All jobs go through ESC/POS → RestoPrint → network printer.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Cannot reach RestoPrint” | Run `npm run print-bridge` in the `webfront` folder on this PC. |
| “Kitchen printer IP not set” | Admin Profile → Kitchen / KOT printer → save IP. |
| Auto print not firing | Enable **Auto print** on Kitchen Bill; stay on `/admin/kitchen-bill` (or waiter/kitchen route). |
| Wrong printer | Verify kitchen IP in Admin Profile is not the same as invoice IP if you use two devices. |
| Print timeout | Check printer is on the same LAN, port **9100** open, printer powered on. |

## Related files

- `src/admin/kitchenBill/kitchenPrint.js` — direct kitchen print API
- `src/admin/kitchenBill/kitchenPrinterSettings.js` — kitchen printer IP/port
- `src/admin/kitchenBill/kitchenPrintMode.js` — auto / manual toggle
- `src/admin/printing/sendToBridge.js` — shared RestoPrint client
- `src/admin/printing/ThermalReceiptPrintModal.jsx` — shared preview UI

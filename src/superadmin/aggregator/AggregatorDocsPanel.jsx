const CANONICAL_WEBHOOK_EXAMPLE = `{
  "event": "order.created",
  "platform": "swiggy",
  "externalOrderId": "SW123456",
  "customer": {
    "name": "Customer Name",
    "phone": "+919876543210",
    "address": "Delivery address"
  },
  "items": [
    {
      "name": "Margherita Pizza",
      "qty": 1,
      "price": 299,
      "externalItemId": "PRODUCT_MONGO_ID"
    }
  ],
  "totalAmount": 299,
  "paymentMethod": "prepaid",
  "notes": "Extra napkins"
}`;

export default function AggregatorDocsPanel() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-sm font-black uppercase tracking-wider text-white mb-3">
        Integration Reference
      </h2>
      <p className="text-xs text-slate-400 mb-3">
        Third-party middleware should POST to each restaurant&apos;s webhook URL with this canonical
        JSON. Header: <code className="text-pink-400">X-Aggregator-Signature</code> (HMAC-SHA256 of
        raw body when webhook secret is configured).
      </p>
      <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto">
        {CANONICAL_WEBHOOK_EXAMPLE}
      </pre>
      <ul className="mt-4 space-y-2 text-xs text-slate-400 list-disc list-inside">
        <li>
          <code className="text-slate-300">externalItemId</code> should match the restaurant product
          MongoDB ID
        </li>
        <li>
          Cancellation: set <code className="text-slate-300">event</code> to{" "}
          <code className="text-slate-300">order.cancelled</code>
        </li>
        <li>Restaurant admins manage credentials in their admin panel (read-only here)</li>
      </ul>
    </div>
  );
}

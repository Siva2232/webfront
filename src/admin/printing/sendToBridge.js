export function bridgeBaseUrl(settings) {
  const raw =
    settings?.bridgeUrl ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_PRINT_BRIDGE_URL) ||
    "http://127.0.0.1:17881";
  return String(raw).replace(/\/$/, "");
}

/**
 * Send ESC/POS payload to RestoPrint bridge → network thermal printer.
 * @param {string} text
 * @param {{ host?: string, port?: number, bridgeUrl?: string }} settings
 * @param {{ printerLabel?: string }} options — used in error messages (e.g. "Invoice", "Kitchen")
 */
export async function sendToBridge(text, settings, options = {}) {
  const label = options.printerLabel || "thermal";
  const host = String(settings?.host || "").trim();
  if (!host) {
    throw new Error(
      `${label} printer IP not set. Open Admin Profile and enter the ${label.toLowerCase()} printer IP.`
    );
  }

  const bridgeUrl = bridgeBaseUrl(settings);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(`${bridgeUrl}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        host,
        port: Number(settings.port) || 9100,
      }),
      signal: controller.signal,
    });

    let data = {};
    try {
      data = await res.json();
    } catch (_) {}

    if (!res.ok) {
      throw new Error(data.error || data.message || `Print failed (${res.status})`);
    }
    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(
        "Print timed out. Start RestoPrint on this PC: npm run print-bridge (in webfront folder)."
      );
    }
    const msg = err?.message || "";
    if (
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("Load failed")
    ) {
      throw new Error(
        "Cannot reach RestoPrint on this computer. Run: npm run print-bridge — then try again."
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

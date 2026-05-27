export function bridgeBaseUrl(settings) {
  const raw =
    settings?.bridgeUrl ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_PRINT_BRIDGE_URL) ||
    "http://127.0.0.1:17881";
  return String(raw).replace(/\/$/, "");
}

function isProbablyMobile() {
  try {
    const ua = navigator.userAgent || "";
    return /Android|iPhone|iPad|iPod/i.test(ua);
  } catch {
    return false;
  }
}

async function sendViaCloudRelay(text, settings, options = {}) {
  const label = options.printerLabel || "thermal";
  const host = String(settings?.host || "").trim();
  if (!host) {
    throw new Error(
      `${label} printer IP not set. Open Admin Profile and enter the ${label.toLowerCase()} printer IP.`
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`/api/print-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        printerTarget: options.printerTarget || "custom",
        printerHost: host,
        printerPort: Number(settings.port) || 9100,
        text,
      }),
      signal: controller.signal,
    });

    let data = {};
    try {
      data = await res.json();
    } catch (_) {}

    if (!res.ok) {
      throw new Error(data.message || data.error || `Print relay failed (${res.status})`);
    }

    // Backend returns queued/delivered; actual print happens on the connector.
    if (data.queued) {
      throw new Error(
        "Print Connector is offline for this restaurant (job queued). Start the connector on the POS PC and try again."
      );
    }
    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Print relay timed out. Check internet and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Send ESC/POS payload to RestoPrint bridge → network thermal printer.
 * @param {string} text
 * @param {{ host?: string, port?: number, bridgeUrl?: string, bridgeMode?: 'local'|'cloud' }} settings
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

  const mode =
    settings?.bridgeMode ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_PRINT_MODE) ||
    "local";

  // Mobile webapp should default to cloud relay to avoid HTTPS->HTTP mixed content issues.
  if (mode === "cloud" || (mode === "auto" && isProbablyMobile())) {
    return await sendViaCloudRelay(text, settings, options);
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
    // If local bridge is unreachable, fall back to cloud relay (helps mobile/tablet users).
    const msg = err?.message || "";
    const maybeUnreachable =
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("Load failed");

    if (err.name === "AbortError") {
      if (isProbablyMobile()) {
        return await sendViaCloudRelay(text, settings, options);
      }
      throw new Error("Print timed out. Start RestoPrint on this PC: npm run print-bridge (in webfront folder).");
    }
    if (maybeUnreachable) {
      if (isProbablyMobile()) {
        return await sendViaCloudRelay(text, settings, options);
      }
      throw new Error("Cannot reach RestoPrint on this computer. Run: npm run print-bridge — then try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

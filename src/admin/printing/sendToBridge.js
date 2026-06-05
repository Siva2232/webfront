import API from "../../api/axios";

export function bridgeBaseUrl(settings) {
  const raw =
    settings?.bridgeUrl ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_PRINT_BRIDGE_URL) ||
    "http://127.0.0.1:17881";
  return String(raw).replace(/\/$/, "");
}

function getPrintMode(settings) {
  return (
    settings?.bridgeMode ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_PRINT_MODE) ||
    "auto"
  );
}

function isProbablyMobile() {
  try {
    const ua = navigator.userAgent || "";
    return /Android|iPhone|iPad|iPod/i.test(ua);
  } catch {
    return false;
  }
}

function mapCloudError(err) {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message || err?.message || "";
  if (status === 401) {
    return new Error("Please log in again to print.");
  }
  if (msg) return new Error(msg);
  return new Error("Print relay failed. Check internet and try again.");
}

async function sendViaCloudRelay(text, settings, options = {}) {
  const label = options.printerLabel || "thermal";
  const host = String(settings?.host || "").trim();
  if (!host) {
    throw new Error(
      `${label} printer IP not set. Open Admin Profile and enter the ${label.toLowerCase()} printer IP.`
    );
  }

  try {
    const { data } = await API.post("/print-jobs", {
      printerTarget: options.printerTarget || "custom",
      printerHost: host,
      printerPort: Number(settings.port) || 9100,
      text,
    });

    if (data?.queued) {
      throw new Error(
        "Print Connector is offline for this restaurant (job queued). Start the connector on the POS PC and try again."
      );
    }
    return data;
  } catch (err) {
    throw mapCloudError(err);
  }
}

function isLocalBridgeUnreachable(err) {
  const msg = err?.message || "";
  return (
    err?.name === "AbortError" ||
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed")
  );
}

async function sendViaLocalBridge(text, settings) {
  const bridgeUrl = bridgeBaseUrl(settings);
  const host = String(settings?.host || "").trim();
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
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Send ESC/POS payload to RestoPrint bridge → network thermal printer.
 * @param {string} text
 * @param {{ host?: string, port?: number, bridgeUrl?: string, bridgeMode?: 'local'|'cloud'|'auto' }} settings
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

  const mode = getPrintMode(settings);

  if (mode === "cloud" || (mode === "auto" && isProbablyMobile())) {
    return await sendViaCloudRelay(text, settings, options);
  }

  if (mode === "local" || mode === "auto") {
    try {
      return await sendViaLocalBridge(text, settings);
    } catch (err) {
      if (mode === "auto" && isLocalBridgeUnreachable(err)) {
        return await sendViaCloudRelay(text, settings, options);
      }
      if (err?.name === "AbortError") {
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
    }
  }

  return await sendViaCloudRelay(text, settings, options);
}

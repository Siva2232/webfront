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

/** True when bridge URL points to a LAN device (not this device's localhost). */
export function isLanBridgeUrl(url) {
  const raw = String(url || "").trim().toLowerCase();
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname;
    if (host === "127.0.0.1" || host === "localhost" || host === "::1") return false;
    return true;
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

const CONNECTOR_OFFLINE_MSG =
  "Print connector is offline (job queued). Start RestoPrint on any restaurant tablet — see Admin Profile → Printing setup.";

async function sendStructuredViaCloudRelay(payload, options = {}) {
  try {
    const { data } = await API.post("/print-jobs", {
      type: options.type,
      printerType: options.printerType,
      payload,
      printerTarget: options.printerTarget || options.printerType,
    });

    if (data?.queued) {
      throw new Error(CONNECTOR_OFFLINE_MSG);
    }
    return data;
  } catch (err) {
    throw mapCloudError(err);
  }
}

/**
 * Send structured print payload for RestoPrint app ESC/POS generation.
 */
export async function sendStructuredPrintJob(payload, options = {}) {
  return sendStructuredViaCloudRelay(payload, options);
}

async function sendViaCloudRelay(text, settings, options = {}) {
  const label = options.printerLabel || "thermal";
  const host = String(settings?.host || "").trim();
  if (!host && !options.structuredPayload) {
    throw new Error(
      `${label} printer IP not set. Open Admin Profile and enter the ${label.toLowerCase()} printer IP.`
    );
  }

  if (options.structuredPayload) {
    return sendStructuredViaCloudRelay(options.structuredPayload, options);
  }

  try {
    const { data } = await API.post("/print-jobs", {
      printerTarget: options.printerTarget || "custom",
      printerHost: host,
      printerPort: Number(settings.port) || 9100,
      text,
    });

    if (data?.queued) {
      throw new Error(CONNECTOR_OFFLINE_MSG);
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

function localBridgeError(err, isMobile) {
  if (err?.name === "AbortError") {
    return new Error(
      isMobile
        ? "Print timed out. Check the tablet running RestoPrint is on the same Wi‑Fi."
        : "Print timed out. Start RestoPrint on this PC: npm run print-bridge (in print-bridge folder)."
    );
  }
  const msg = err?.message || "";
  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed")
  ) {
    return new Error(
      isMobile
        ? "Cannot reach RestoPrint on your restaurant network. Start the connector on a tablet (Admin Profile → Printing setup)."
        : "Cannot reach RestoPrint on this computer. Run: npm run print-bridge — then try again."
    );
  }
  return err;
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
  const mobile = isProbablyMobile();
  const lanBridge = isLanBridgeUrl(settings?.bridgeUrl || bridgeBaseUrl(settings));

  if (mode === "cloud") {
    return await sendViaCloudRelay(text, settings, options);
  }

  if (mode === "local") {
    try {
      return await sendViaLocalBridge(text, settings);
    } catch (err) {
      throw localBridgeError(err, mobile);
    }
  }

  // auto mode
  const tryLocalFirst = !mobile || lanBridge;

  if (tryLocalFirst) {
    try {
      return await sendViaLocalBridge(text, settings);
    } catch (err) {
      if (isLocalBridgeUnreachable(err)) {
        return await sendViaCloudRelay(text, settings, options);
      }
      throw localBridgeError(err, mobile);
    }
  }

  // Mobile without LAN bridge URL: cloud relay directly
  try {
    return await sendViaCloudRelay(text, settings, options);
  } catch (err) {
    if (lanBridge && isLocalBridgeUnreachable(err)) {
      try {
        return await sendViaLocalBridge(text, settings);
      } catch (localErr) {
        throw localBridgeError(localErr, mobile);
      }
    }
    throw err;
  }
}

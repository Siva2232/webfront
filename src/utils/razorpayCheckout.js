const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let scriptLoadPromise = null;

function loadRazorpayScript() {
  if (typeof window !== "undefined" && window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay));
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

/**
 * Open Razorpay checkout modal.
 * @param {object} options
 * @param {string} options.keyId - Razorpay key_id
 * @param {string} options.orderId - Razorpay order id from backend
 * @param {number} options.amount - Amount in paise (from backend order response)
 * @param {string} [options.currency] - Currency code (default INR)
 * @param {string} [options.name] - Business name shown in checkout
 * @param {string} [options.description] - Payment description
 * @param {object} [options.prefill] - { name, email, contact }
 * @returns {Promise<{ razorpay_order_id, razorpay_payment_id, razorpay_signature }>}
 */
export async function openRazorpayCheckout({
  keyId,
  orderId,
  amount,
  currency = "INR",
  name = "Payment",
  description = "",
  prefill = {},
}) {
  const Razorpay = await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: keyId,
      amount,
      currency,
      name,
      description,
      order_id: orderId,
      prefill,
      theme: { color: "#18181b" },
      handler(response) {
        resolve({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss() {
          reject(new Error("Payment cancelled"));
        },
      },
    });

    rzp.on("payment.failed", (response) => {
      const msg =
        response?.error?.description ||
        response?.error?.reason ||
        "Payment failed";
      reject(new Error(msg));
    });

    rzp.open();
  });
}

/**
 * Customer online payment (Razorpay) is allowed only when Module Access
 * and the subscription plan both include `customerOnlinePayment`.
 */
export function isCustomerOnlinePaymentEnabled(
  features,
  subscriptionPlan,
  { featuresReady = true } = {}
) {
  if (!featuresReady) return false;
  if (features?.customerOnlinePayment === false) return false;

  const planFeatures = subscriptionPlan?.features;
  if (planFeatures && planFeatures.customerOnlinePayment === false) return false;

  return true;
}

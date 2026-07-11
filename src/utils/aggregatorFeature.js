/**
 * Swiggy / Zomato aggregator orders require Module Access + plan `aggregatorOrders`.
 */
export function isAggregatorOrdersEnabled(
  features,
  subscriptionPlan,
  { featuresReady = true } = {}
) {
  if (!featuresReady) return false;
  if (features?.aggregatorOrders === false) return false;

  const planFeatures = subscriptionPlan?.features;
  if (planFeatures && planFeatures.aggregatorOrders === false) return false;

  return true;
}

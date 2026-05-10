/** Align with backend `subscriptionLimits.js` defaults when the plan omits caps. */
export function getPlanLimitsFromBranding(branding) {
  const plan = branding?.subscriptionPlan;
  const mt = Number(plan?.maxTables);
  const mp = Number(plan?.maxProducts);
  return {
    maxTables: Number.isFinite(mt) && mt > 0 ? Math.floor(mt) : 20,
    maxProducts: Number.isFinite(mp) && mp > 0 ? Math.floor(mp) : 100,
  };
}

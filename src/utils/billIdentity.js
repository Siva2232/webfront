/**
 * Stable identity for Bill documents — used for deduping and merging.
 * Prefer orderRef (points at Order); Mongo/API may return ObjectId, string, or populated shape.
 */
export function billIdentityKey(b) {
  if (!b) return "";
  let ref = b.orderRef;
  if (ref && typeof ref === "object") {
    ref = ref._id ?? ref.$oid ?? ref;
  }
  const refStr = ref != null && ref !== "" ? String(ref) : "";
  const id = b._id ?? b.id;
  const idStr = id != null && id !== "" ? String(id) : "";
  return refStr || idStr;
}

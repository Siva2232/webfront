/** Normalize product.category (string or { name }) for filters and menu sections. */
export function getProductCategoryName(category) {
  if (category == null || category === "") return "";
  if (typeof category === "string") return category.trim();
  if (typeof category === "object" && category.name != null) {
    return String(category.name).trim();
  }
  return String(category).trim();
}

export function getProductCategoryNameFromProduct(product) {
  return getProductCategoryName(product?.category) || "Others";
}

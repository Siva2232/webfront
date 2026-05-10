/**
 * True while logged into the platform Super Admin console (/superadmin/*).
 * No tenant restaurant — skip restaurant admin APIs (notifications, branding, POS data).
 */
export function isSuperAdminSession() {
  try {
    return localStorage.getItem("isSuperAdmin") === "true";
  } catch {
    return false;
  }
}

/** Role claim from the POS/support JWT in localStorage (must match backend authorize checks). */
export function getTokenRole() {
  try {
    const tok = localStorage.getItem("token");
    if (!tok) return null;
    const payload = JSON.parse(atob(tok.split(".")[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

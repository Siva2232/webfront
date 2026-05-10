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

const SCANNER_ROLES = new Set(["exhibitor", "food", "checkin"]);

export function getStaffHome(user) {
  const roles = Array.isArray(user?.roles) && user.roles.length
    ? user.roles
    : user?.role
      ? [user.role]
      : [];

  if (roles.includes("admin")) return "/admin/dashboard";
  if (roles.some((role) => SCANNER_ROLES.has(role))) return "/exhibitor/scan";
  return "/profile";
}

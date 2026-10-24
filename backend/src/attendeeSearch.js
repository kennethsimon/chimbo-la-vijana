export function normalizeAttendeePhoneSearch(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^255[67]\d{8}$/.test(digits)) return digits;
  if (/^0[67]\d{8}$/.test(digits)) return `255${digits.slice(1)}`;
  return null;
}

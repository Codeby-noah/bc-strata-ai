export type StrataRole =
  | "admin"
  | "council"
  | "treasurer"
  | "member"
  | "auditor";

export function canManageFinance(role: string) {
  return ["admin", "council", "treasurer"].includes(role);
}

export function canReadInvoices(role: string) {
  return canManageFinance(role) || role === "auditor";
}

export function canManageMembers(role: string) {
  return role === "admin";
}

export function canManageExemptions(role: string) {
  return role === "admin" || role === "council";
}

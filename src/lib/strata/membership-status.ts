export type MembershipAccessStatus =
  | "ready"
  | "schema_not_ready"
  | "temporarily_unavailable";

export type MembershipQueryError = {
  code?: string;
};

export function getMembershipAccessStatus(
  error: MembershipQueryError | null,
): MembershipAccessStatus {
  if (!error) {
    return "ready";
  }

  if (error.code === "PGRST205" || error.code === "42P01") {
    return "schema_not_ready";
  }

  return "temporarily_unavailable";
}

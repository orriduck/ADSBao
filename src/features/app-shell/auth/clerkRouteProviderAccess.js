// Emails allowed to use the FlightAware route provider. All other
// signed-in (or anonymous) users fall back to adsbdb.
export const FLIGHTAWARE_OWNER_EMAILS = [
  "ruyyi0323@gmail.com",
];

// Legacy single-owner export — kept so any caller still importing the
// scalar form continues to resolve. Always points at the first entry
// of the list.
export const FLIGHTAWARE_OWNER_EMAIL = FLIGHTAWARE_OWNER_EMAILS[0];

const OWNER_EMAIL_SET = new Set(
  FLIGHTAWARE_OWNER_EMAILS.map((email) => normalizeEmail(email)),
);

export function buildClerkUserAccessEntity(user) {
  if (!user?.id) return undefined;
  const email =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses?.find((item) => item?.emailAddress)?.emailAddress ||
    "";

  return {
    id: String(user.id),
    email: normalizeEmail(email),
    name: String(user.fullName || "").trim(),
  };
}

export function isFlightAwareOwnerEntity(userEntity) {
  return OWNER_EMAIL_SET.has(normalizeEmail(userEntity?.email));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

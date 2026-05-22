export const FLIGHTAWARE_OWNER_EMAIL = "ruyyi0323@gmail.com";

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
  return normalizeEmail(userEntity?.email) === FLIGHTAWARE_OWNER_EMAIL;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

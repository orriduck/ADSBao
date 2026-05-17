export function isGoogleTranslateDomNotFoundError(error) {
  return (
    error instanceof DOMException &&
    error.name === "NotFoundError" &&
    /not a child of this node/i.test(error.message || "")
  );
}

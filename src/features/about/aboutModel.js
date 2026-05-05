export const getDataSourceCountLabel = (sources = []) =>
  `${sources.length} feed${sources.length === 1 ? "" : "s"}`;

export const getExternalLinkOpenTarget = (href) => ({
  href,
  target: "_blank",
  rel: "noreferrer",
});

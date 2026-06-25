export const getDataSourceCountLabel = (sources = [], locale = "en") => {
  const count = sources.length;
  if (locale === "zh-CN") return `${count} 个来源`;
  return `${count} source${count === 1 ? "" : "s"}`;
};

export const getExternalLinkOpenTarget = (href) => ({
  href,
  target: "_blank",
  rel: "noreferrer",
});

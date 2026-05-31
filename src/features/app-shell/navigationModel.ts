const HOME_CARRYOVER_PARAMS = Object.freeze(["locate"]);

export function setHomeSearchParamCarryover(search: any = "") {
  const source =
    search instanceof URLSearchParams
      ? new URLSearchParams(search)
      : new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const params = new URLSearchParams();

  HOME_CARRYOVER_PARAMS.forEach((key) => {
    source.getAll(key).forEach((value) => {
      params.append(key, value);
    });
  });

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

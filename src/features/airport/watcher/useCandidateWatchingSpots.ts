import { useEffect, useMemo, useState } from "react";

const normalizeAirportIcao = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export function useCandidateWatchingSpots({
  airportIcao = "",
  enabled = false,
}: {
  airportIcao?: string;
  enabled?: boolean;
}) {
  const normalizedIcao = useMemo(
    () => normalizeAirportIcao(airportIcao),
    [airportIcao],
  );
  const [state, setState] = useState({
    loading: false,
    error: "",
    file: null as Record<string, any> | null,
  });

  useEffect(() => {
    if (!enabled || !normalizedIcao) {
      setState({ loading: false, error: "", file: null });
      return undefined;
    }

    const controller = new AbortController();
    setState((current) => ({
      loading: true,
      error: "",
      file:
        current.file?.airportIcao === normalizedIcao ? current.file : null,
    }));

    fetch(`/data/spotting-spots/${normalizedIcao}.json`, {
      signal: controller.signal,
      cache: "force-cache",
    })
      .then(async (response) => {
        if (response.status === 404 && normalizedIcao.startsWith("K")) {
          const aliasResponse = await fetch(
            `/data/spotting-spots/${normalizedIcao.slice(1)}.json`,
            {
              signal: controller.signal,
              cache: "force-cache",
            },
          );
          if (aliasResponse.status === 404) return null;
          if (!aliasResponse.ok) throw new Error(`HTTP ${aliasResponse.status}`);
          return aliasResponse.json();
        }
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((file) => {
        setState({
          loading: false,
          error: "",
          file: file && Array.isArray(file.spots) ? file : null,
        });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setState({ loading: false, error: "load-failed", file: null });
      });

    return () => controller.abort();
  }, [enabled, normalizedIcao]);

  return {
    ...state,
    airportIcao: normalizedIcao,
    spots: state.file?.spots || [],
    sourceAttribution: state.file?.sourceAttribution || "",
  };
}

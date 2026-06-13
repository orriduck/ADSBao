type ProviderResult<TProvider, TPayload> = {
  provider: TProvider;
  payload: TPayload;
  attempts: string[];
};

export async function fetchWithProviderFallback<TProvider extends { id: string }, TPayload>({
  providers,
  fetchProvider,
}: {
  providers: readonly TProvider[];
  fetchProvider: (provider: TProvider) => Promise<TPayload>;
}): Promise<ProviderResult<TProvider, TPayload>> {
  const attempts: string[] = [];
  const errors: unknown[] = [];

  for (const provider of providers) {
    try {
      const payload = await fetchProvider(provider);
      attempts.push(`${provider.id}:200`);
      return { provider, payload, attempts };
    } catch (error) {
      errors.push(error);
      const status =
        error && typeof error === "object" && "status" in error
          ? (error as { status?: unknown }).status
          : "ERR";
      attempts.push(`${provider.id}:${status || "ERR"}`);
    }
  }

  const aggregate = new Error("All ADS-B providers failed");
  (aggregate as Error & { attempts?: string[]; errors?: unknown[] }).attempts =
    attempts;
  (aggregate as Error & { attempts?: string[]; errors?: unknown[] }).errors =
    errors;
  throw aggregate;
}

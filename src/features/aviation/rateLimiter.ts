export const createRateLimiter = ({ maxTokens = 3, refillMs = 1000 } = {}) => {
  let available = maxTokens;
  let lastRefill = Date.now();
  let cooldownUntil = 0;

  const refill = (nowMs) => {
    const elapsed = nowMs - lastRefill;
    if (elapsed <= 0) return;
    const newTokens = (elapsed / refillMs) * maxTokens;
    available = Math.min(available + newTokens, maxTokens);
    lastRefill = nowMs;
  };

  const acquire = async () => {
    while (true) {
      const nowMs = Date.now();

      if (cooldownUntil > 0) {
        const remaining = cooldownUntil - nowMs;
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        cooldownUntil = 0;
        lastRefill = Date.now();
        continue;
      }

      refill(nowMs);

      if (available >= 1) {
        available -= 1;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, refillMs));
    }
  };

  const onRateLimited = (backoffMs = 2000) => {
    available = 0;
    cooldownUntil = Date.now() + backoffMs;
  };

  const release = () => {
    available = Math.min(available + 1, maxTokens);
  };

  return { acquire, onRateLimited, release };
};

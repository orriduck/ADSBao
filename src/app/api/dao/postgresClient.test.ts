import assert from "node:assert/strict";

import { createPostgresQueryClientFromEnv } from "./postgresClient";

{
  const calls: Array<Record<string, any>> = [];
  const client = createPostgresQueryClientFromEnv({
    env: {
      ADSBAO_DATABASE_URL: "postgres://adsbao:secret@db.railway.internal:5432/railway",
      PGPOOL_MAX: "3",
    },
    createPoolImpl: (options: Record<string, any>) => {
      calls.push({ type: "pool", options });
      return {
        async query<T = Record<string, any>>(text: string, values: unknown[]) {
          calls.push({ type: "query", text, values });
          return { rows: [{ ok: true } as T], rowCount: 1 };
        },
        async end() {
          calls.push({ type: "end" });
        },
      };
    },
  });

  assert.ok(client);
  const result = await client.query("select $1::text as value", ["KBOS"]);
  await client.dispose?.();

  assert.deepEqual(result.rows, [{ ok: true }]);
  assert.equal(
    calls[0].options.connectionString,
    "postgres://adsbao:secret@db.railway.internal:5432/railway",
  );
  assert.equal(calls[0].options.max, 3);
  assert.deepEqual(calls.slice(1), [
    { type: "query", text: "select $1::text as value", values: ["KBOS"] },
    { type: "end" },
  ]);
}

{
  const client = createPostgresQueryClientFromEnv({
    env: {
      ADSBAO_DATABASE_URL: "postgres://adsbao:secret@localhost:5432/adsbao",
      PGSSLMODE: "disable",
    },
    createPoolImpl: (options: Record<string, any>) => ({
      options,
      async query<T = Record<string, any>>() {
        return { rows: [] as T[], rowCount: 0 };
      },
    }),
  });

  assert.ok(client);
  assert.equal(client.options.ssl, false);
}

assert.equal(createPostgresQueryClientFromEnv({ env: {} }), null);

assert.equal(
  createPostgresQueryClientFromEnv({
    env: {
      DATABASE_URL: "postgres://legacy-generic-url",
    },
  }),
  null,
);

assert.equal(
  createPostgresQueryClientFromEnv({
    env: {
      POSTGRES_URL: "postgres://legacy-marketplace-url",
      POSTGRES_PRISMA_URL: "postgres://legacy-prisma-url",
    },
  }),
  null,
);

console.log("postgresClient.test.ts ok");

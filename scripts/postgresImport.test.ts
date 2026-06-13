import assert from "node:assert/strict";

import { buildBulkUpsertQuery } from "./postgresImport";

{
  const query = buildBulkUpsertQuery({
    table: "airports",
    columns: ["ident", "name", "latitude_deg"],
    conflictColumns: ["ident"],
    rows: [
      { ident: "KBOS", name: "Boston Logan", latitude_deg: 42.3656 },
      { ident: "KJFK", name: "John F Kennedy", latitude_deg: 40.6413 },
    ],
  });

  assert.ok(query);
  assert.equal(
    query.text.replace(/\s+/g, " ").trim(),
    'insert into "airports" ("ident", "name", "latitude_deg") values ($1, $2, $3), ($4, $5, $6) on conflict ("ident") do update set "name" = excluded."name", "latitude_deg" = excluded."latitude_deg"',
  );
  assert.deepEqual(query.values, [
    "KBOS",
    "Boston Logan",
    42.3656,
    "KJFK",
    "John F Kennedy",
    40.6413,
  ]);
}

assert.equal(
  buildBulkUpsertQuery({
    table: "airports",
    columns: ["ident"],
    conflictColumns: ["ident"],
    rows: [],
  }),
  null,
);

assert.throws(
  () =>
    buildBulkUpsertQuery({
      table: "airports;drop",
      columns: ["ident"],
      conflictColumns: ["ident"],
      rows: [{ ident: "KBOS" }],
    }),
  /Invalid SQL identifier/,
);

console.log("postgresImport.test.ts ok");

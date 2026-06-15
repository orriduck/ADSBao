import {
  createPostgresQueryClientFromEnv,
  type PostgresQueryClient,
} from "../src/server/dao/postgresClient";

type BulkUpsertOptions = {
  table: string;
  columns: string[];
  conflictColumns: string[];
  rows: Record<string, any>[];
};

const IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/;

const quoteIdentifier = (identifier: string) => {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
};

export function buildBulkUpsertQuery({
  table,
  columns,
  conflictColumns,
  rows,
}: BulkUpsertOptions) {
  if (rows.length === 0) return null;
  const quotedTable = quoteIdentifier(table);
  const quotedColumns = columns.map(quoteIdentifier);
  const quotedConflictColumns = conflictColumns.map(quoteIdentifier);
  const values: unknown[] = [];
  const placeholders = rows
    .map((row) => {
      const rowPlaceholders = columns.map((column) => {
        values.push(row[column] ?? null);
        return `$${values.length}`;
      });
      return `(${rowPlaceholders.join(", ")})`;
    })
    .join(", ");
  const conflictSet = new Set(conflictColumns);
  const assignments = columns
    .filter((column) => !conflictSet.has(column))
    .map((column) => {
      const quoted = quoteIdentifier(column);
      return `${quoted} = excluded.${quoted}`;
    });
  if (assignments.length === 0) {
    throw new Error("Bulk upsert requires at least one non-conflict column");
  }

  return {
    text: `
      insert into ${quotedTable} (${quotedColumns.join(", ")})
      values ${placeholders}
      on conflict (${quotedConflictColumns.join(", ")})
      do update set ${assignments.join(", ")}
    `,
    values,
  };
}

export async function bulkUpsertRows({
  queryClient,
  table,
  columns,
  conflictColumns,
  rows,
}: BulkUpsertOptions & { queryClient: PostgresQueryClient }) {
  const query = buildBulkUpsertQuery({ table, columns, conflictColumns, rows });
  if (!query) return;
  await queryClient.query(query.text, query.values);
}

export function createImportDatabaseFromEnv() {
  const queryClient = createPostgresQueryClientFromEnv();
  if (!queryClient) {
    throw new Error("ADSBAO_DATABASE_URL is required for database imports");
  }
  return queryClient;
}

# Query Generation

`src/lib/sql-generator.ts` converts a `VisualQuery` and schema metadata into the SQL shown in the app and executed by sql.js.

## `VisualQuery` Model

The `VisualQuery` type is defined in `src/types/query.ts`.

- `baseTableId`: optional table id used for the `FROM` clause. Without it, SQL generation returns a comment telling the learner to choose a table.
- `joins`: ordered list of relationship ids and join types. Supported join types are `INNER JOIN` and `LEFT JOIN`.
- `selectedColumns`: ordered list of table and column references for the `SELECT` clause.
- `filters`: list of table and column filters for the `WHERE` clause.
- `sort`: optional table and column reference plus `ASC` or `DESC` direction for `ORDER BY`.
- `limit`: optional positive numeric row limit for `LIMIT`.

The UI and `query-model` helpers keep normal user-created queries reachable from the selected base table. The SQL generator also performs reachability checks for joins, filters, and sort before emitting those clauses.

## Base Table

Generation starts with `baseTableId`.

If `baseTableId` is missing, the generated text is:

```sql
-- Choose a table to start a query.
```

If `baseTableId` is set but does not match a schema table, the generated text is:

```sql
-- Selected base table does not exist.
```

Otherwise, the generator emits `FROM <table_name>` using the schema table's `name`.

## Column Selection

When `selectedColumns` has entries, the generator formats them in the same order as `table_name.column_name` and joins them with commas:

```sql
SELECT customers.name, orders.total
```

When `selectedColumns` is empty, the generator emits:

```sql
SELECT *
```

Column references are resolved through schema metadata. If a malformed column reference cannot be found, `formatColumnRef` falls back to `<tableId>.<columnId>`.

## Join Generation

Joins are emitted only when reachable from the current joined table set.

The generator starts with a joined table set containing the base table. It copies the query's `joins` into a pending list, then repeatedly finds the next pending join whose relationship touches any table already in the joined set. When it finds one, it emits that join, adds the newly joined table to the set, and continues.

This means joins can be stored in a different order than they need to appear in SQL. For example, a query can contain a products-to-order-items relationship before an orders-to-order-items relationship; generation will emit the reachable orders-to-order-items join first when the base table is `orders`.

Each emitted join uses the join type from the visual query:

```sql
INNER JOIN order_items
  ON orders.id = order_items.order_id
```

or:

```sql
LEFT JOIN orders
  ON customers.id = orders.customer_id
```

If no pending join is reachable, join generation stops. Relationships, tables, or columns that cannot be found in schema metadata are skipped.

## Filters

Supported filter operators are:

- `=`
- `!=`
- `>`
- `<`
- `>=`
- `<=`
- `contains`

Filters are emitted only for tables that are reachable from the base table through the query's joins. Multiple filters are joined with `AND` in a single `WHERE` clause.

For comparison operators, the generator emits:

```sql
WHERE orders.status = 'paid'
```

For `contains`, the generator uses `LIKE` and wraps the value in `%` wildcards:

```sql
WHERE products.name LIKE '%SQL%'
```

## Value Formatting

Filter value formatting uses the column type from schema metadata.

For `integer` and `real` columns, non-empty values that JavaScript can parse as numbers are emitted unquoted:

```sql
WHERE orders.total >= 100
```

For text columns, empty values, and non-numeric values, the generator SQL-quotes the value:

```sql
WHERE customers.city = 'Bogota'
```

Single quotes inside values are escaped by doubling them:

```sql
WHERE customers.name = 'Ava''s Shop'
```

`contains` values are always SQL-quoted after the `%` wildcards are added.

## Sorting

When `sort` is set and the sorted table is reachable, the generator emits `ORDER BY` after filters:

```sql
ORDER BY orders.total DESC
```

Sorting uses the formatted schema column reference and the direction stored in the visual query.

## Limits

When `limit` is set, the generator emits `LIMIT` as the final clause:

```sql
LIMIT 3
```

The query-model helper only stores positive numeric limits. SQL generation emits the stored `limit.value` directly.

Generated SQL ends with a semicolon after all emitted clauses.

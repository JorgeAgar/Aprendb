# Extending Lessons And Schema

This guide explains how to add lessons and schema data without changing runtime behavior.

## Add A Lesson

Lessons live in `src/data/lessons.ts` as entries in the exported `lessons` array. Add a new object that matches the `Lesson` type from `src/types/query.ts`.

Required fields:

- `id`: stable unique string used by the app to track the active and passed lesson.
- `title`: short learner-facing title shown in the lesson list.
- `goal`: learner-facing description of the result the query should produce.
- `tips`: array of hint objects with `title` and `body`.
- `expectedResult`: exact result used by validation.

Example shape:

```ts
{
  id: "paid-card-payments",
  title: "Find Paid Card Payments",
  goal: "Show order ids and payment amounts for card payments.",
  tips: [
    { title: "Start table", body: "Start from payments." },
    { title: "Filter", body: "Filter payments.method to card." },
  ],
  expectedResult: {
    columns: ["order_id", "amount"],
    rows: [
      [101, 129.99],
      [104, 74.25],
      [105, 215.75],
    ],
  },
}
```

The expected result must match the SQL result exactly. Validation checks:

- column order;
- row order;
- row count;
- cell values.

Column names are the names returned by SQLite for the selected columns. For normal selected schema columns, that is usually the bare column name such as `name`, `id`, or `total`. If a lesson can be solved with duplicate column names, make sure the expected `columns` array matches what sql.js returns.

Rows should be ordered only when the lesson guides the learner to use sorting or when the underlying query naturally returns the seeded data in the required order. Because validation is exact, a lesson that can be solved with multiple row orders should include a clear sorting tip and expected order.

## Add Or Change Schema Data

Schema metadata and seed SQL both live in `src/data/schema.ts`.

Update `commerceSchema.tables` when adding or changing a table:

- `id`: internal table id used by query state and relationships.
- `name`: SQL table name used by generated SQL.
- `label`: display name shown in the graph.
- `description`: table description shown in table actions.
- `columns`: metadata for each column, including `id`, `name`, `label`, `type`, and optional `role`.
- `position`: graph position for the table node.

Update `commerceSchema.relationships` when adding or changing joins:

- `id`: stable relationship id stored in `VisualQuery.joins`.
- `fromTableId` and `toTableId`: table ids from `commerceSchema.tables`.
- `fromColumnId` and `toColumnId`: column ids from the related tables.
- `label`: display text for the graph edge and join summary.

Update `commerceSeedSql` when the actual SQLite tables or rows change. The `CREATE TABLE` statements and `INSERT` data must stay aligned with `commerceSchema.tables`, columns, and relationships.

The metadata and seed SQL are separate sources used for different work:

- metadata drives graph nodes, graph edges, menus, available joins, generated table names, generated column names, and type-aware filter formatting;
- seed SQL creates the database that actually executes the generated query.

They must describe the same schema. If metadata mentions a table, column, or relationship that does not exist in the seed SQL, the UI may allow a query that SQLite cannot execute. If seed SQL includes data or columns missing from metadata, learners cannot reach them through the visual builder.

## Relationships And Joins

Relationships drive both the visual graph edges and the joins learners are allowed to add.

The app starts from `VisualQuery.baseTableId`, then treats relationships touching the joined table set as reachable. The UI uses this to show which tables can be joined next, and SQL generation emits joins only when a relationship can be reached from the current joined table set.

When adding a relationship, confirm that:

- both table ids exist in `commerceSchema.tables`;
- both column ids exist on their tables;
- the columns exist in `commerceSeedSql`;
- the relationship label matches the join condition;
- the seed data supports any lessons that depend on the relationship.

## Contributor Checklist

Before opening a PR that changes lessons or schema:

- Add or update lesson entries in `src/data/lessons.ts`.
- Confirm every lesson has `id`, `title`, `goal`, `tips`, and `expectedResult`.
- Confirm each `expectedResult` has exact columns, row order, row count, and cell values.
- Update `commerceSchema.tables` in `src/data/schema.ts` for table or column metadata changes.
- Update `commerceSchema.relationships` for join path changes.
- Update `commerceSeedSql` so SQLite tables, columns, rows, and relationship keys match the metadata.
- Run `pnpm test`.
- Update `src/lib/query-model.test.ts` when relationship reachability or query-state behavior changes.
- Update `src/lib/sql-generator.test.ts` when generated SQL output or schema-driven SQL expectations change.
- Update `src/lib/validation.test.ts` only when result matching behavior changes.
- Run `pnpm typecheck`.
- Run `pnpm build` when feasible.

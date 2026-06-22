# AprenDB

AprenDB is a browser-based visual SQL lesson sandbox built with React, Vite, TypeScript, React Flow, Tailwind CSS, and sql.js. It helps learners build SQL queries by selecting tables and columns from a visual schema, then previews the generated SQL and validates the query result against lesson goals.

## Features

- Visual schema graph for exploring tables, columns, and relationships.
- Lesson list with guided goals and tips.
- Query builder actions for choosing a base table, joining related tables, selecting columns, filtering, sorting, and limiting results.
- Generated SQL preview that updates from the visual query state.
- SQLite execution in the browser through sql.js.
- Result validation that compares query output with the active lesson's expected result.

## Prerequisites

- Node.js
- pnpm

The project declares `pnpm@11.5.2` in `package.json`.

## Quick Start

Install dependencies:

```sh
pnpm install
```

Start the Vite development server:

```sh
pnpm dev
```

After the dev server starts, open the local URL printed in the terminal.

## Available Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server. |
| `pnpm build` | Type-check the project and create a production build. |
| `pnpm preview` | Preview the production build locally. |
| `pnpm test` | Run the Vitest test suite once. |
| `pnpm typecheck` | Run TypeScript project checks. |

There is currently no lint script in `package.json`.

## Repo Layout

- `src/App.tsx` - Main application shell, lesson workflow, visual graph, query controls, SQL preview, and result panel.
- `src/data/schema.ts` - Commerce schema metadata, relationships, node positions, and SQLite seed SQL.
- `src/data/lessons.ts` - Lesson definitions, learner goals, tips, and expected results.
- `src/lib/query-model.ts` - Visual query state helpers for base tables, joins, selected columns, filters, sorting, and limits.
- `src/lib/sql-generator.ts` - Converts visual query state into SQL.
- `src/lib/sqlite.ts` - Initializes sql.js, loads the seeded SQLite database, and executes generated SQL.
- `src/lib/validation.ts` - Compares executed query results with expected lesson results.
- `src/types/query.ts` - Shared schema, lesson, query, and result types.
- `src/components/ui` - Reusable UI primitives.

## Testing

Run the test suite when changing query state behavior, generated SQL, lesson data, or validation behavior:

```sh
pnpm test
```

Vitest currently covers query modeling, SQL generation, and lesson validation. Add or update tests when changing how visual query state is represented, how SQL is generated, or how results are validated.

Run the TypeScript project checks before opening a pull request, especially after changing shared types, data shapes, or component props:

```sh
pnpm typecheck
```

## Documentation

- [Architecture](docs/architecture.md)
- [Extending lessons and schema](docs/extending-lessons-and-schema.md)
- [Query generation](docs/query-generation.md)

## Troubleshooting

### Dependency install issues

If `pnpm install` fails, confirm that Node.js and pnpm are installed and that your pnpm version is compatible with the `packageManager` field in `package.json` (`pnpm@11.5.2`). Removing `node_modules` and reinstalling can also clear stale dependency state.

### Vite dev server issues

If `pnpm dev` does not start or the browser cannot reach the app, check the terminal output for the actual host and port. If the default port is already in use, Vite may choose another port or ask for confirmation.

### sql.js WASM loading problems

AprenDB loads the sql.js WASM file through Vite using `sql.js/dist/sql-wasm.wasm?url`. If SQLite execution fails in the browser, check the browser console and network panel for a missing or blocked WASM asset, then restart the dev server after reinstalling dependencies.

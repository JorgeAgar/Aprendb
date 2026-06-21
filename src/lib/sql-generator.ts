import {
  findColumn,
  findRelationship,
  findTable,
  formatColumnRef,
  getJoinedTableIds,
} from "@/lib/query-model";
import type { FilterSpec, Schema, VisualQuery } from "@/types/query";

export function generateSql(query: VisualQuery, schema: Schema): string {
  if (!query.baseTableId) {
    return "-- Choose a table to start a query.";
  }

  const baseTable = findTable(schema, query.baseTableId);
  if (!baseTable) {
    return "-- Selected base table does not exist.";
  }

  const selectedColumns =
    query.selectedColumns.length > 0
      ? query.selectedColumns.map((column) => formatColumnRef(schema, column)).join(", ")
      : "*";

  const lines = [`SELECT ${selectedColumns}`, `FROM ${baseTable.name}`];

  const joinedTableIds = new Set([query.baseTableId]);
  for (const join of query.joins) {
    const relationship = findRelationship(schema, join.relationshipId);
    if (!relationship) {
      continue;
    }

    const fromTable = findTable(schema, relationship.fromTableId);
    const toTable = findTable(schema, relationship.toTableId);
    const fromColumn = findColumn(schema, {
      tableId: relationship.fromTableId,
      columnId: relationship.fromColumnId,
    });
    const toColumn = findColumn(schema, {
      tableId: relationship.toTableId,
      columnId: relationship.toColumnId,
    });

    if (!fromTable || !toTable || !fromColumn || !toColumn) {
      continue;
    }

    const nextTable = joinedTableIds.has(relationship.fromTableId) ? toTable : fromTable;
    lines.push(`${join.type} ${nextTable.name}`);
    lines.push(`  ON ${fromTable.name}.${fromColumn.name} = ${toTable.name}.${toColumn.name}`);
    joinedTableIds.add(nextTable.id);
  }

  const reachableTableIds = getJoinedTableIds(query, schema);
  const filters = query.filters.filter((filter) => reachableTableIds.includes(filter.tableId));
  if (filters.length > 0) {
    lines.push(`WHERE ${filters.map((filter) => formatFilter(schema, filter)).join(" AND ")}`);
  }

  if (query.sort && reachableTableIds.includes(query.sort.tableId)) {
    lines.push(`ORDER BY ${formatColumnRef(schema, query.sort)} ${query.sort.direction}`);
  }

  if (query.limit) {
    lines.push(`LIMIT ${query.limit.value}`);
  }

  return `${lines.join("\n")};`;
}

function formatFilter(schema: Schema, filter: FilterSpec) {
  const column = findColumn(schema, filter);
  const columnRef = formatColumnRef(schema, filter);

  if (filter.operator === "contains") {
    return `${columnRef} LIKE ${quoteSqlValue(`%${filter.value}%`)}`;
  }

  return `${columnRef} ${filter.operator} ${formatFilterValue(filter.value, column?.type)}`;
}

function formatFilterValue(value: string, type?: string) {
  if ((type === "integer" || type === "real") && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return value.trim();
  }

  return quoteSqlValue(value);
}

function quoteSqlValue(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

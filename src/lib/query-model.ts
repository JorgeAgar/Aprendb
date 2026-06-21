import type {
  ColumnRef,
  FilterSpec,
  JoinSpec,
  JoinType,
  Relationship,
  Schema,
  SelectedColumn,
  SortSpec,
  VisualQuery,
} from "@/types/query";

export function createEmptyQuery(): VisualQuery {
  return {
    joins: [],
    selectedColumns: [],
    filters: [],
  };
}

export function addBaseTable(query: VisualQuery, tableId: string): VisualQuery {
  return {
    ...createEmptyQuery(),
    baseTableId: tableId,
    selectedColumns: query.baseTableId === tableId ? query.selectedColumns : [],
  };
}

export function addJoin(
  query: VisualQuery,
  relationshipId: string,
  type: JoinType = "INNER JOIN",
): VisualQuery {
  if (query.joins.some((join) => join.relationshipId === relationshipId)) {
    return {
      ...query,
      joins: query.joins.map((join) =>
        join.relationshipId === relationshipId ? { ...join, type } : join,
      ),
    };
  }

  return {
    ...query,
    joins: [...query.joins, { relationshipId, type }],
  };
}

export function removeJoin(query: VisualQuery, relationshipId: string, schema?: Schema): VisualQuery {
  const nextQuery = {
    ...query,
    joins: query.joins.filter((join) => join.relationshipId !== relationshipId),
  };

  if (!schema) {
    return nextQuery;
  }

  const joinedTableIds = getJoinedTableIds(nextQuery, schema);

  return {
    ...nextQuery,
    selectedColumns: nextQuery.selectedColumns.filter((column) => joinedTableIds.includes(column.tableId)),
    filters: nextQuery.filters.filter((filter) => joinedTableIds.includes(filter.tableId)),
    sort: nextQuery.sort && joinedTableIds.includes(nextQuery.sort.tableId) ? nextQuery.sort : undefined,
  };
}

export function toggleSelectedColumn(query: VisualQuery, column: SelectedColumn): VisualQuery {
  const exists = query.selectedColumns.some((selected) => sameColumn(selected, column));

  return {
    ...query,
    selectedColumns: exists
      ? query.selectedColumns.filter((selected) => !sameColumn(selected, column))
      : [...query.selectedColumns, column],
  };
}

export function upsertFilter(query: VisualQuery, filter: FilterSpec): VisualQuery {
  const filters = query.filters.filter((item) => !sameColumn(item, filter));

  return {
    ...query,
    filters: filter.value.trim() ? [...filters, filter] : filters,
  };
}

export function removeFilter(query: VisualQuery, column: ColumnRef): VisualQuery {
  return {
    ...query,
    filters: query.filters.filter((filter) => !sameColumn(filter, column)),
  };
}

export function setSort(query: VisualQuery, sort?: SortSpec): VisualQuery {
  return {
    ...query,
    sort,
  };
}

export function setLimit(query: VisualQuery, value?: number): VisualQuery {
  return {
    ...query,
    limit: value && value > 0 ? { value } : undefined,
  };
}

export function getJoinedTableIds(query: VisualQuery, schema: Schema): string[] {
  if (!query.baseTableId) {
    return [];
  }

  const tableIds = new Set([query.baseTableId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const join of query.joins) {
      const relationship = findRelationship(schema, join.relationshipId);
      if (!relationship) {
        continue;
      }

      if (tableIds.has(relationship.fromTableId) && !tableIds.has(relationship.toTableId)) {
        tableIds.add(relationship.toTableId);
        changed = true;
      }

      if (tableIds.has(relationship.toTableId) && !tableIds.has(relationship.fromTableId)) {
        tableIds.add(relationship.fromTableId);
        changed = true;
      }
    }
  }

  return [...tableIds];
}

export function getAvailableRelationships(query: VisualQuery, schema: Schema): Relationship[] {
  const joinedTableIds = getJoinedTableIds(query, schema);

  if (joinedTableIds.length === 0) {
    return [];
  }

  return schema.relationships.filter((relationship) => {
    const alreadyJoined = query.joins.some((join) => join.relationshipId === relationship.id);
    const touchesJoinedTable =
      joinedTableIds.includes(relationship.fromTableId) || joinedTableIds.includes(relationship.toTableId);

    return !alreadyJoined && touchesJoinedTable;
  });
}

export function isTableReachable(query: VisualQuery, schema: Schema, tableId: string): boolean {
  if (!query.baseTableId) {
    return true;
  }

  return getAvailableRelationships(query, schema).some(
    (relationship) => relationship.fromTableId === tableId || relationship.toTableId === tableId,
  );
}

export function findRelationship(schema: Schema, relationshipId: string) {
  return schema.relationships.find((relationship) => relationship.id === relationshipId);
}

export function findTable(schema: Schema, tableId: string) {
  return schema.tables.find((table) => table.id === tableId);
}

export function findColumn(schema: Schema, column: ColumnRef) {
  return findTable(schema, column.tableId)?.columns.find((item) => item.id === column.columnId);
}

export function getRelationshipForTables(
  schema: Schema,
  joinedTableIds: string[],
  targetTableId: string,
): Relationship | undefined {
  return schema.relationships.find((relationship) => {
    const touchesTarget =
      relationship.fromTableId === targetTableId || relationship.toTableId === targetTableId;
    const touchesJoined =
      joinedTableIds.includes(relationship.fromTableId) || joinedTableIds.includes(relationship.toTableId);

    return touchesTarget && touchesJoined;
  });
}

export function sameColumn(left: ColumnRef, right: ColumnRef) {
  return left.tableId === right.tableId && left.columnId === right.columnId;
}

export function formatColumnRef(schema: Schema, column: ColumnRef) {
  const table = findTable(schema, column.tableId);
  const schemaColumn = findColumn(schema, column);

  return table && schemaColumn ? `${table.name}.${schemaColumn.name}` : `${column.tableId}.${column.columnId}`;
}

export function describeJoin(schema: Schema, join: JoinSpec) {
  const relationship = findRelationship(schema, join.relationshipId);
  return relationship ? `${join.type} ${relationship.label}` : join.relationshipId;
}

import { describe, expect, it } from "vitest";
import { commerceSchema } from "@/data/schema";
import {
  addBaseTable,
  addJoin,
  createEmptyQuery,
  getJoinedTableIds,
  toggleSelectedColumn,
  upsertFilter,
} from "@/lib/query-model";

describe("query model", () => {
  it("creates an empty visual query", () => {
    expect(createEmptyQuery()).toEqual({
      joins: [],
      selectedColumns: [],
      filters: [],
    });
  });

  it("sets the base table and resets query-specific choices", () => {
    const query = addBaseTable(
      {
        baseTableId: "orders",
        joins: [{ relationshipId: "customers_orders", type: "INNER JOIN" }],
        selectedColumns: [{ tableId: "orders", columnId: "id" }],
        filters: [{ tableId: "orders", columnId: "status", operator: "=", value: "paid" }],
      },
      "customers",
    );

    expect(query).toEqual({
      baseTableId: "customers",
      joins: [],
      selectedColumns: [],
      filters: [],
    });
  });

  it("toggles selected columns", () => {
    const selected = toggleSelectedColumn(addBaseTable(createEmptyQuery(), "customers"), {
      tableId: "customers",
      columnId: "name",
    });
    const removed = toggleSelectedColumn(selected, { tableId: "customers", columnId: "name" });

    expect(selected.selectedColumns).toEqual([{ tableId: "customers", columnId: "name" }]);
    expect(removed.selectedColumns).toEqual([]);
  });

  it("adds joins and resolves joined table ids", () => {
    const query = addJoin(addBaseTable(createEmptyQuery(), "customers"), "customers_orders", "LEFT JOIN");

    expect(query.joins).toEqual([{ relationshipId: "customers_orders", type: "LEFT JOIN" }]);
    expect(getJoinedTableIds(query, commerceSchema)).toEqual(["customers", "orders"]);
  });

  it("upserts filters by column", () => {
    const query = upsertFilter(addBaseTable(createEmptyQuery(), "orders"), {
      tableId: "orders",
      columnId: "status",
      operator: "=",
      value: "paid",
    });
    const updated = upsertFilter(query, {
      tableId: "orders",
      columnId: "status",
      operator: "!=",
      value: "refunded",
    });

    expect(updated.filters).toEqual([
      { tableId: "orders", columnId: "status", operator: "!=", value: "refunded" },
    ]);
  });
});

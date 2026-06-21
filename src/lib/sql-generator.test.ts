import { describe, expect, it } from "vitest";
import { commerceSchema } from "@/data/schema";
import {
  addBaseTable,
  addJoin,
  createEmptyQuery,
  setLimit,
  setSort,
  toggleSelectedColumn,
  upsertFilter,
} from "@/lib/query-model";
import { generateSql } from "@/lib/sql-generator";

describe("generateSql", () => {
  it("generates a base select", () => {
    const query = toggleSelectedColumn(addBaseTable(createEmptyQuery(), "customers"), {
      tableId: "customers",
      columnId: "name",
    });

    expect(generateSql(query, commerceSchema)).toBe("SELECT customers.name\nFROM customers;");
  });

  it("generates joins", () => {
    const query = toggleSelectedColumn(
      toggleSelectedColumn(
        addJoin(addBaseTable(createEmptyQuery(), "customers"), "customers_orders", "INNER JOIN"),
        { tableId: "customers", columnId: "name" },
      ),
      { tableId: "orders", columnId: "total" },
    );

    expect(generateSql(query, commerceSchema)).toBe(
      [
        "SELECT customers.name, orders.total",
        "FROM customers",
        "INNER JOIN orders",
        "  ON customers.id = orders.customer_id;",
      ].join("\n"),
    );
  });

  it("generates filters, sort, and limit", () => {
    let query = addBaseTable(createEmptyQuery(), "orders");
    query = toggleSelectedColumn(query, { tableId: "orders", columnId: "id" });
    query = toggleSelectedColumn(query, { tableId: "orders", columnId: "total" });
    query = upsertFilter(query, {
      tableId: "orders",
      columnId: "status",
      operator: "=",
      value: "paid",
    });
    query = setSort(query, { tableId: "orders", columnId: "total", direction: "DESC" });
    query = setLimit(query, 3);

    expect(generateSql(query, commerceSchema)).toBe(
      [
        "SELECT orders.id, orders.total",
        "FROM orders",
        "WHERE orders.status = 'paid'",
        "ORDER BY orders.total DESC",
        "LIMIT 3;",
      ].join("\n"),
    );
  });

  it("orders joins by reachability before generating SQL", () => {
    let query = addBaseTable(createEmptyQuery(), "orders");
    query = addJoin(query, "products_order_items", "INNER JOIN");
    query = addJoin(query, "orders_order_items", "INNER JOIN");
    query = toggleSelectedColumn(query, { tableId: "orders", columnId: "id" });
    query = toggleSelectedColumn(query, { tableId: "products", columnId: "name" });

    expect(generateSql(query, commerceSchema)).toBe(
      [
        "SELECT orders.id, products.name",
        "FROM orders",
        "INNER JOIN order_items",
        "  ON orders.id = order_items.order_id",
        "INNER JOIN products",
        "  ON products.id = order_items.product_id;",
      ].join("\n"),
    );
  });
});

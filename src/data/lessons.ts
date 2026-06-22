import type { Lesson } from "@/types/query";

export const lessons: Lesson[] = [
  {
    id: "select-customers",
    title: "Select Customer Names",
    goal: "Show the names of all customers.",
    tips: [
      { title: "Start table", body: "Use customers as the FROM table." },
      { title: "Result column", body: "Add customers.name to the result." },
    ],
    requirements: [
      {
        id: "select-customers-base",
        type: "base-table",
        label: "Start from customers",
        tip: "Choose the Customers table as the FROM table.",
        tableId: "customers",
      },
      {
        id: "select-customers-columns",
        type: "selected-columns",
        label: "Return customer names",
        tip: "Add only customers.name to the result columns.",
        columns: [{ tableId: "customers", columnId: "name" }],
      },
      {
        id: "select-customers-result",
        type: "expected-result",
        label: "Preview matches the expected rows",
        tip: "Run the preview after the visual query looks right.",
      },
    ],
    expectedResult: {
      columns: ["name"],
      rows: [["Ava Chen"], ["Mateo Ruiz"], ["Nina Patel"], ["Owen Brooks"]],
    },
  },
  {
    id: "paid-orders",
    title: "Filter Paid Orders",
    goal: "Show paid order ids and totals.",
    tips: [
      { title: "Filter", body: "Filter orders.status to paid." },
      { title: "Columns", body: "Add orders.id and orders.total to the result." },
    ],
    requirements: [
      {
        id: "paid-orders-base",
        type: "base-table",
        label: "Start from orders",
        tip: "Choose Orders as the FROM table.",
        tableId: "orders",
      },
      {
        id: "paid-orders-columns",
        type: "selected-columns",
        label: "Return id and total",
        tip: "Add orders.id followed by orders.total.",
        columns: [
          { tableId: "orders", columnId: "id" },
          { tableId: "orders", columnId: "total" },
        ],
      },
      {
        id: "paid-orders-filter",
        type: "filters",
        label: "Keep only paid orders",
        tip: "Filter orders.status = paid.",
        filters: [{ tableId: "orders", columnId: "status", operator: "=", value: "paid" }],
      },
      {
        id: "paid-orders-result",
        type: "expected-result",
        label: "Preview matches the expected rows",
        tip: "Preview the filtered result and check the row count.",
      },
    ],
    expectedResult: {
      columns: ["id", "total"],
      rows: [
        [101, 129.99],
        [103, 310],
        [105, 215.75],
      ],
    },
  },
  {
    id: "customers-orders",
    title: "Join Customers To Orders",
    goal: "Show each order with the customer name and order total.",
    tips: [
      { title: "Join", body: "Start from customers, then join orders." },
      { title: "Columns", body: "Add customers.name and orders.total." },
    ],
    requirements: [
      {
        id: "customers-orders-base",
        type: "base-table",
        label: "Start from customers",
        tip: "Choose Customers before joining Orders.",
        tableId: "customers",
      },
      {
        id: "customers-orders-join",
        type: "joined-tables",
        label: "Join orders",
        tip: "Add Orders through the customers.id = orders.customer_id relationship.",
        tableIds: ["orders"],
      },
      {
        id: "customers-orders-columns",
        type: "selected-columns",
        label: "Return name and total",
        tip: "Add customers.name followed by orders.total.",
        columns: [
          { tableId: "customers", columnId: "name" },
          { tableId: "orders", columnId: "total" },
        ],
      },
      {
        id: "customers-orders-result",
        type: "expected-result",
        label: "Preview matches the expected rows",
        tip: "Preview once the join and result columns are set.",
      },
    ],
    expectedResult: {
      columns: ["name", "total"],
      rows: [
        ["Ava Chen", 129.99],
        ["Mateo Ruiz", 48.5],
        ["Ava Chen", 310],
        ["Nina Patel", 74.25],
        ["Owen Brooks", 215.75],
      ],
    },
  },
  {
    id: "orders-products",
    title: "Trace Orders To Products",
    goal: "Show order ids, product names, and item quantities.",
    tips: [
      { title: "Bridge table", body: "Join orders to order_items, then products." },
      { title: "Columns", body: "Add orders.id, products.name, and order_items.quantity." },
    ],
    requirements: [
      {
        id: "orders-products-base",
        type: "base-table",
        label: "Start from orders",
        tip: "Choose Orders as the starting table.",
        tableId: "orders",
      },
      {
        id: "orders-products-joins",
        type: "joined-tables",
        label: "Join order_items and products",
        tip: "Reach Products through Order Items.",
        tableIds: ["order_items", "products"],
      },
      {
        id: "orders-products-columns",
        type: "selected-columns",
        label: "Return id, product, quantity",
        tip: "Add orders.id, products.name, then order_items.quantity.",
        columns: [
          { tableId: "orders", columnId: "id" },
          { tableId: "products", columnId: "name" },
          { tableId: "order_items", columnId: "quantity" },
        ],
      },
      {
        id: "orders-products-result",
        type: "expected-result",
        label: "Preview matches the expected rows",
        tip: "Preview after both joins are connected.",
      },
    ],
    expectedResult: {
      columns: ["id", "name", "quantity"],
      rows: [
        [101, "SQL Workbook", 1],
        [101, "Data Desk Mat", 1],
        [102, "Query Hoodie", 1],
        [103, "Data Desk Mat", 4],
        [103, "Index Mug", 2],
        [104, "SQL Workbook", 1],
        [104, "Index Mug", 1],
        [105, "Query Hoodie", 2],
        [105, "Data Desk Mat", 1],
      ],
    },
  },
  {
    id: "top-orders",
    title: "Find Top Orders",
    goal: "Show the three highest-value order ids and totals.",
    tips: [
      { title: "Sort", body: "Sort orders.total descending." },
      { title: "Limit", body: "Limit the result to 3 rows." },
    ],
    requirements: [
      {
        id: "top-orders-base",
        type: "base-table",
        label: "Start from orders",
        tip: "Choose Orders as the FROM table.",
        tableId: "orders",
      },
      {
        id: "top-orders-columns",
        type: "selected-columns",
        label: "Return id and total",
        tip: "Add orders.id followed by orders.total.",
        columns: [
          { tableId: "orders", columnId: "id" },
          { tableId: "orders", columnId: "total" },
        ],
      },
      {
        id: "top-orders-sort",
        type: "sort",
        label: "Sort by total descending",
        tip: "Set orders.total to DESC so the largest orders appear first.",
        sort: { tableId: "orders", columnId: "total", direction: "DESC" },
      },
      {
        id: "top-orders-limit",
        type: "limit",
        label: "Limit to three rows",
        tip: "Set LIMIT to 3.",
        value: 3,
      },
      {
        id: "top-orders-result",
        type: "expected-result",
        label: "Preview matches the expected rows",
        tip: "Preview to verify the top three are in order.",
      },
    ],
    expectedResult: {
      columns: ["id", "total"],
      rows: [
        [103, 310],
        [105, 215.75],
        [101, 129.99],
      ],
    },
  },
];

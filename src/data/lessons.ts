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

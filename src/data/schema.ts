import type { Schema } from "@/types/query";

export const commerceSchema: Schema = {
  tables: [
    {
      id: "customers",
      name: "customers",
      label: "Customers",
      description: "People who place orders.",
      position: { x: 60, y: 70 },
      columns: [
        { id: "id", name: "id", label: "id", type: "integer", role: "pk" },
        { id: "name", name: "name", label: "name", type: "text" },
        { id: "email", name: "email", label: "email", type: "text" },
        { id: "city", name: "city", label: "city", type: "text" },
      ],
    },
    {
      id: "orders",
      name: "orders",
      label: "Orders",
      description: "Purchases made by customers.",
      position: { x: 390, y: 180 },
      columns: [
        { id: "id", name: "id", label: "id", type: "integer", role: "pk" },
        { id: "customer_id", name: "customer_id", label: "customer_id", type: "integer", role: "fk" },
        { id: "order_date", name: "order_date", label: "order_date", type: "text" },
        { id: "status", name: "status", label: "status", type: "text" },
        { id: "total", name: "total", label: "total", type: "real" },
      ],
    },
    {
      id: "order_items",
      name: "order_items",
      label: "Order Items",
      description: "Products inside each order.",
      position: { x: 720, y: 82 },
      columns: [
        { id: "id", name: "id", label: "id", type: "integer", role: "pk" },
        { id: "order_id", name: "order_id", label: "order_id", type: "integer", role: "fk" },
        { id: "product_id", name: "product_id", label: "product_id", type: "integer", role: "fk" },
        { id: "quantity", name: "quantity", label: "quantity", type: "integer" },
      ],
    },
    {
      id: "products",
      name: "products",
      label: "Products",
      description: "Items available for sale.",
      position: { x: 1050, y: 205 },
      columns: [
        { id: "id", name: "id", label: "id", type: "integer", role: "pk" },
        { id: "name", name: "name", label: "name", type: "text" },
        { id: "category", name: "category", label: "category", type: "text" },
        { id: "price", name: "price", label: "price", type: "real" },
      ],
    },
    {
      id: "payments",
      name: "payments",
      label: "Payments",
      description: "Payment records for orders.",
      position: { x: 390, y: 455 },
      columns: [
        { id: "id", name: "id", label: "id", type: "integer", role: "pk" },
        { id: "order_id", name: "order_id", label: "order_id", type: "integer", role: "fk" },
        { id: "method", name: "method", label: "method", type: "text" },
        { id: "amount", name: "amount", label: "amount", type: "real" },
      ],
    },
  ],
  relationships: [
    {
      id: "customers_orders",
      fromTableId: "customers",
      fromColumnId: "id",
      toTableId: "orders",
      toColumnId: "customer_id",
      label: "customers.id = orders.customer_id",
    },
    {
      id: "orders_order_items",
      fromTableId: "orders",
      fromColumnId: "id",
      toTableId: "order_items",
      toColumnId: "order_id",
      label: "orders.id = order_items.order_id",
    },
    {
      id: "products_order_items",
      fromTableId: "products",
      fromColumnId: "id",
      toTableId: "order_items",
      toColumnId: "product_id",
      label: "products.id = order_items.product_id",
    },
    {
      id: "orders_payments",
      fromTableId: "orders",
      fromColumnId: "id",
      toTableId: "payments",
      toColumnId: "order_id",
      label: "orders.id = payments.order_id",
    },
  ],
};

export const commerceSeedSql = `
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  status TEXT NOT NULL,
  total REAL NOT NULL
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  method TEXT NOT NULL,
  amount REAL NOT NULL
);

INSERT INTO customers VALUES
  (1, 'Ava Chen', 'ava@example.com', 'Bogota'),
  (2, 'Mateo Ruiz', 'mateo@example.com', 'Medellin'),
  (3, 'Nina Patel', 'nina@example.com', 'Cali'),
  (4, 'Owen Brooks', 'owen@example.com', 'Cartagena');

INSERT INTO orders VALUES
  (101, 1, '2026-01-12', 'paid', 129.99),
  (102, 2, '2026-01-15', 'pending', 48.50),
  (103, 1, '2026-01-18', 'paid', 310.00),
  (104, 3, '2026-01-20', 'refunded', 74.25),
  (105, 4, '2026-01-22', 'paid', 215.75);

INSERT INTO products VALUES
  (201, 'SQL Workbook', 'Books', 29.99),
  (202, 'Query Hoodie', 'Apparel', 48.50),
  (203, 'Data Desk Mat', 'Office', 65.00),
  (204, 'Index Mug', 'Kitchen', 18.75);

INSERT INTO order_items VALUES
  (301, 101, 201, 1),
  (302, 101, 203, 1),
  (303, 102, 202, 1),
  (304, 103, 203, 4),
  (305, 103, 204, 2),
  (306, 104, 201, 1),
  (307, 104, 204, 1),
  (308, 105, 202, 2),
  (309, 105, 203, 1);

INSERT INTO payments VALUES
  (401, 101, 'card', 129.99),
  (402, 103, 'bank_transfer', 310.00),
  (403, 104, 'card', 74.25),
  (404, 105, 'card', 215.75);
`;

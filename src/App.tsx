import {
  ArrowPathIcon,
  CircleStackIcon,
  CursorArrowRaysIcon,
  PlayIcon,
  PlusIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SchemaTable = {
  name: string;
  label: string;
  columns: Array<{
    name: string;
    type: string;
    role?: "pk" | "fk";
    selected?: boolean;
  }>;
  x: number;
  y: number;
};

const tables: SchemaTable[] = [
  {
    name: "customers",
    label: "Customers",
    x: 88,
    y: 76,
    columns: [
      { name: "id", type: "uuid", role: "pk" },
      { name: "name", type: "text", selected: true },
      { name: "email", type: "text" },
      { name: "created_at", type: "date" },
    ],
  },
  {
    name: "orders",
    label: "Orders",
    x: 430,
    y: 182,
    columns: [
      { name: "id", type: "uuid", role: "pk" },
      { name: "customer_id", type: "uuid", role: "fk" },
      { name: "total", type: "money", selected: true },
      { name: "status", type: "text" },
    ],
  },
  {
    name: "order_items",
    label: "Order Items",
    x: 774,
    y: 92,
    columns: [
      { name: "id", type: "uuid", role: "pk" },
      { name: "order_id", type: "uuid", role: "fk" },
      { name: "product_id", type: "uuid", role: "fk" },
      { name: "quantity", type: "int" },
    ],
  },
];

const queryLines = [
  "SELECT customers.name, orders.total",
  "FROM customers",
  "INNER JOIN orders",
  "  ON orders.customer_id = customers.id",
  "WHERE orders.status = 'paid';",
];

export function App() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="grid min-h-screen grid-rows-[auto_1fr]">
        <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <CircleStackIcon className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">AprenDB</h1>
              <p className="text-xs text-muted-foreground">Visual SQL query builder</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <ArrowPathIcon aria-hidden="true" />
              Reset
            </Button>
            <Button size="sm">
              <PlusIcon aria-hidden="true" />
              New Query
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="border-r border-border bg-sidebar p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium">
              <CursorArrowRaysIcon className="size-4 text-primary" aria-hidden="true" />
              Build Step
            </div>
            <div className="space-y-3">
              {["Choose start table", "Join related tables", "Select columns", "Add conditions"].map(
                (step, index) => (
                  <div
                    key={step}
                    className={cn(
                      "rounded-md border p-3 text-sm",
                      index === 2
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    <div className="font-medium text-foreground">{step}</div>
                    <div className="mt-1 text-xs">Click schema elements to see valid actions.</div>
                  </div>
                ),
              )}
            </div>
          </aside>

          <section className="relative overflow-hidden bg-canvas">
            <div className="absolute inset-0 schema-grid" />
            <svg className="pointer-events-none absolute inset-0 size-full" role="img" aria-label="Table joins">
              <path
                d="M 298 177 C 360 177 363 262 430 262"
                className="fill-none stroke-join stroke-2"
                strokeDasharray="8 8"
              />
              <path
                d="M 640 265 C 705 265 708 172 774 172"
                className="fill-none stroke-muted-foreground/40 stroke-2"
              />
            </svg>
            {tables.map((table) => (
              <article
                key={table.name}
                className="absolute w-[210px] rounded-md border border-border bg-card shadow-sm"
                style={{ left: table.x, top: table.y }}
              >
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <TableCellsIcon className="size-4 text-primary" aria-hidden="true" />
                  <div>
                    <h2 className="text-sm font-semibold">{table.label}</h2>
                    <p className="text-[11px] text-muted-foreground">{table.name}</p>
                  </div>
                </div>
                <div className="p-2">
                  {table.columns.map((column) => (
                    <button
                      key={column.name}
                      className={cn(
                        "grid w-full grid-cols-[1fr_auto] items-center rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                        column.selected && "bg-select text-select-foreground hover:bg-select",
                      )}
                    >
                      <span className="font-medium">{column.name}</span>
                      <span className="text-muted-foreground">
                        {column.role ? column.role.toUpperCase() : column.type}
                      </span>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <aside className="grid min-h-0 grid-rows-[auto_1fr_auto] border-l border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold">Generated SQL</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Every visual action translates into a highlighted query clause.
              </p>
            </div>
            <pre className="overflow-auto p-4 text-sm leading-7">
              {queryLines.map((line, index) => (
                <code
                  key={line}
                  className={cn(
                    "block rounded px-2 font-mono",
                    index === 0 || index === 2 ? "bg-select text-select-foreground" : "text-foreground",
                  )}
                >
                  {line}
                </code>
              ))}
            </pre>
            <div className="border-t border-border p-4">
              <Button className="w-full">
                <PlayIcon aria-hidden="true" />
                Preview Result
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

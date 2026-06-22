import {
  ArrowPathIcon,
  BarsArrowDownIcon,
  CheckCircleIcon,
  CircleStackIcon,
  CursorArrowRaysIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  PlayIcon,
  PlusIcon,
  TableCellsIcon,
  XMarkIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { commerceSchema } from "@/data/schema";
import { lessons } from "@/data/lessons";
import {
  addBaseTable,
  addJoin,
  createEmptyQuery,
  findColumn,
  findTable,
  formatColumnRef,
  getJoinedTableIds,
  getRelationshipForTables,
  isTableReachable,
  removeFilter,
  removeJoin,
  sameColumn,
  setLimit,
  setSort,
  toggleSelectedColumn,
  upsertFilter,
} from "@/lib/query-model";
import { generateSql } from "@/lib/sql-generator";
import { executeSql } from "@/lib/sqlite";
import { cn } from "@/lib/utils";
import { getLessonValidationReport, validateLessonResult, type LessonValidationReport } from "@/lib/validation";
import type {
  ColumnRef,
  FilterOperator,
  JoinType,
  Lesson,
  LessonRequirement,
  QueryResult,
  SchemaTable,
  RequirementState,
  VisualQuery,
} from "@/types/query";

type ActionMenu =
  | { kind: "table"; tableId: string; x: number; y: number }
  | { kind: "column"; tableId: string; columnId: string; x: number; y: number };

type QueryStatus =
  | { kind: "idle"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type ColumnQuickAction = "select" | "filter" | "sort";
type MobileTab = "lessons" | "graph" | "sql" | "results" | "query";

type SchemaNodeData = {
  table: SchemaTable;
  query: VisualQuery;
  joinedTableIds: string[];
  onTableAction: (event: MouseEvent, tableId: string) => void;
  onColumnAction: (event: MouseEvent, column: ColumnRef) => void;
  onColumnQuickAction: (event: MouseEvent, column: ColumnRef, action: ColumnQuickAction) => void;
};

type SchemaNode = Node<SchemaNodeData, "schemaTable">;

const nodeTypes = {
  schemaTable: SchemaTableNode,
};

const filterOperators: FilterOperator[] = ["=", "!=", ">", "<", ">=", "<=", "contains"];
const joinTypes: JoinType[] = ["INNER JOIN", "LEFT JOIN"];
const minLeftPanelWidth = 220;
const maxLeftPanelWidth = 520;
const minRightPanelWidth = 300;
const maxRightPanelWidth = 680;
const mobileTabs: Array<{ id: MobileTab; label: string }> = [
  { id: "lessons", label: "Lessons" },
  { id: "graph", label: "Graph" },
  { id: "sql", label: "SQL" },
  { id: "results", label: "Results" },
  { id: "query", label: "Query" },
];

export function App() {
  const [query, setQuery] = useState<VisualQuery>(() => createEmptyQuery());
  const [activeLessonId, setActiveLessonId] = useState(lessons[0]?.id ?? "");
  const [passedLessonIds, setPassedLessonIds] = useState<string[]>([]);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [status, setStatus] = useState<QueryStatus>({
    kind: "idle",
    message: "Build a query visually, then preview the result.",
  });
  const [actionMenu, setActionMenu] = useState<ActionMenu | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(300);
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [isLessonPanelOpen, setIsLessonPanelOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("graph");

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];
  const joinedTableIds = useMemo(() => getJoinedTableIds(query, commerceSchema), [query]);
  const sql = useMemo(() => generateSql(query, commerceSchema), [query]);
  const validationReport = useMemo(
    () => (activeLesson ? getLessonValidationReport(result, activeLesson.expectedResult) : null),
    [activeLesson, result],
  );
  const requirementStates = useMemo(
    () => (activeLesson ? getLessonRequirementStates(activeLesson, query, result) : []),
    [activeLesson, query, result],
  );
  const suggestedStartTableId = useMemo(
    () => activeLesson?.requirements.find((requirement) => requirement.type === "base-table")?.tableId,
    [activeLesson],
  );

  const nodes = useMemo<SchemaNode[]>(
    () =>
      commerceSchema.tables.map((table) => ({
        id: table.id,
        type: "schemaTable",
        position: table.position,
        data: {
          table,
          query,
          joinedTableIds,
          onTableAction: openTableMenu,
          onColumnAction: openColumnMenu,
          onColumnQuickAction: handleColumnQuickAction,
        },
      })),
    [joinedTableIds, query],
  );

  const edges = useMemo<Edge[]>(
    () =>
      commerceSchema.relationships.map((relationship) => {
        const isActive = query.joins.some((join) => join.relationshipId === relationship.id);
        const isAvailable =
          !isActive &&
          query.baseTableId &&
          (joinedTableIds.includes(relationship.fromTableId) ||
            joinedTableIds.includes(relationship.toTableId));

        return {
          id: relationship.id,
          source: relationship.fromTableId,
          target: relationship.toTableId,
          label: relationship.label,
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: isActive,
          style: {
            stroke: isActive ? "var(--color-join)" : isAvailable ? "var(--color-primary)" : "var(--color-border)",
            strokeDasharray: isActive ? undefined : "7 7",
            strokeWidth: isActive ? 2.5 : 1.5,
          },
          labelStyle: {
            fill: isActive ? "var(--color-foreground)" : "var(--color-muted-foreground)",
            fontSize: 11,
            fontWeight: isActive ? 700 : 500,
          },
        };
      }),
    [joinedTableIds, query.baseTableId, query.joins],
  );

  function openTableMenu(event: MouseEvent, tableId: string) {
    event.preventDefault();
    event.stopPropagation();
    setActionMenu({ kind: "table", tableId, x: event.clientX, y: event.clientY });
  }

  function openColumnMenu(event: MouseEvent, column: ColumnRef) {
    event.preventDefault();
    event.stopPropagation();
    setActionMenu({ kind: "column", ...column, x: event.clientX, y: event.clientY });
  }

  function updateQuery(nextQuery: VisualQuery, message = "Query changed. Preview the result when ready.") {
    setQuery(nextQuery);
    setResult(null);
    setActionMenu(null);
    setStatus({ kind: "idle", message });
  }

  function startFromTable(tableId: string) {
    const table = findTable(commerceSchema, tableId);
    updateQuery(addBaseTable(query, tableId), `Started from ${table?.label ?? "the selected table"}.`);
  }

  function handleColumnQuickAction(event: MouseEvent, column: ColumnRef, action: ColumnQuickAction) {
    event.preventDefault();
    event.stopPropagation();

    if (!joinedTableIds.includes(column.tableId)) {
      setActionMenu({ kind: "column", ...column, x: event.clientX, y: event.clientY });
      return;
    }

    if (action === "select") {
      updateQuery(toggleSelectedColumn(query, column));
      return;
    }

    if (action === "filter") {
      const rect = event.currentTarget.getBoundingClientRect();
      setActionMenu({ kind: "column", ...column, x: rect.right + 8, y: rect.top });
      return;
    }

    const currentDirection =
      query.sort && sameColumn(query.sort, column) ? query.sort.direction : undefined;
    updateQuery(
      setSort(query, { ...column, direction: currentDirection === "ASC" ? "DESC" : "ASC" }),
      "Sort changed. Preview the result when ready.",
    );
  }

  function resetCurrentQuery() {
    setQuery(createEmptyQuery());
    setResult(null);
    setActionMenu(null);
    setStatus({ kind: "idle", message: "Query reset. Choose a starting table." });
  }

  async function previewResult() {
    setActionMenu(null);
    try {
      const nextResult = await executeSql(sql);
      const passed = activeLesson ? validateLessonResult(nextResult, activeLesson.expectedResult) : false;
      setResult(nextResult);

      if (passed && activeLesson && !passedLessonIds.includes(activeLesson.id)) {
        setPassedLessonIds([...passedLessonIds, activeLesson.id]);
      }

      setStatus({
        kind: passed ? "success" : "idle",
        message: passed
          ? "Lesson passed. Result rows match the expected output."
          : "Query ran. Compare the result with the lesson goal and adjust the visual query.",
      });
    } catch (error) {
      setResult(null);
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "The SQL query could not be executed.",
      });
    }
  }

  function chooseLesson(lessonId: string) {
    setActiveLessonId(lessonId);
    setQuery(createEmptyQuery());
    setResult(null);
    setActionMenu(null);
    setStatus({ kind: "idle", message: "New lesson loaded. Choose a starting table." });
  }

  const resizeLeftPanel = useCallback((clientX: number) => {
    setLeftPanelWidth(clamp(clientX, minLeftPanelWidth, maxLeftPanelWidth));
  }, []);

  const resizeRightPanel = useCallback((clientX: number) => {
    setRightPanelWidth(clamp(window.innerWidth - clientX, minRightPanelWidth, maxRightPanelWidth));
  }, []);

  function startLeftPanelResize(event: PointerEvent<HTMLDivElement>) {
    startPanelResize(event, resizeLeftPanel);
  }

  function startRightPanelResize(event: PointerEvent<HTMLDivElement>) {
    startPanelResize(event, resizeRightPanel);
  }

  function resizeLeftPanelWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    resizePanelWithKeyboard(event, setLeftPanelWidth, minLeftPanelWidth, maxLeftPanelWidth);
  }

  function resizeRightPanelWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    resizePanelWithKeyboard(event, setRightPanelWidth, minRightPanelWidth, maxRightPanelWidth, true);
  }

  const workspaceStyle = {
    "--left-panel-width": `${leftPanelWidth}px`,
    "--right-panel-width": `${rightPanelWidth}px`,
    "--lesson-panel-width": isLessonPanelOpen ? "min(320px, 38vw)" : "56px",
  } as CSSProperties;

  const lessonPanel = (
    <aside className="lesson-panel min-h-0 overflow-auto border-r border-border bg-sidebar p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <CursorArrowRaysIcon className="size-4 text-primary" aria-hidden="true" />
        <span className="lesson-panel-label">Lessons</span>
      </div>
      <div className="space-y-2">
        {lessons.map((lesson, index) => {
          const isActive = lesson.id === activeLesson?.id;
          const isPassed = passedLessonIds.includes(lesson.id);

          return (
            <button
              key={lesson.id}
              className={cn(
                "lesson-card w-full rounded-md border p-3 text-left text-sm transition-colors",
                isActive ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-accent",
              )}
              onClick={() => chooseLesson(lesson.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="lesson-title font-medium text-foreground">
                  {index + 1}. {lesson.title}
                </span>
                {isPassed ? <CheckCircleIcon className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{lesson.goal}</p>
            </button>
          );
        })}
      </div>

      {activeLesson ? (
        <div className="lesson-details mt-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Current Goal</h2>
            <p className="mt-1 text-sm text-muted-foreground">{activeLesson.goal}</p>
          </div>
          <LessonChecklist requirements={requirementStates} highlightFirstAction={!query.baseTableId} />
          <div className="space-y-2 border-t border-border pt-3">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">Tips</h2>
            {activeLesson.tips.map((tip) => (
              <div key={tip.title} className="rounded-md border border-border bg-background p-3">
                <div className="text-xs font-semibold uppercase text-primary">{tip.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );

  const graphPanel = (showResizers: boolean) => (
    <section className="graph-panel relative min-h-0 bg-canvas">
      {showResizers ? (
        <>
          <PanelResizeHandle
            ariaLabel="Resize lessons panel"
            className="left-0"
            maxValue={maxLeftPanelWidth}
            minValue={minLeftPanelWidth}
            onPointerDown={startLeftPanelResize}
            onKeyDown={resizeLeftPanelWithKeyboard}
            value={leftPanelWidth}
          />
          <PanelResizeHandle
            ariaLabel="Resize query output panel"
            className="right-0 translate-x-1/2"
            maxValue={maxRightPanelWidth}
            minValue={minRightPanelWidth}
            onPointerDown={startRightPanelResize}
            onKeyDown={resizeRightPanelWithKeyboard}
            value={rightPanelWidth}
          />
        </>
      ) : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.45}
        maxZoom={1.4}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        onPaneClick={() => setActionMenu(null)}
      >
        <Background gap={28} color="oklch(0.8 0.01 248 / 0.45)" />
        <MiniMap pannable zoomable nodeStrokeWidth={3} />
        <Controls position="bottom-left" />
      </ReactFlow>
      {!query.baseTableId ? (
        <CanvasEmptyState
          activeLesson={activeLesson}
          suggestedTableId={suggestedStartTableId}
          onStartTable={startFromTable}
        />
      ) : null}
      <RelationshipLegend hasBaseTable={Boolean(query.baseTableId)} />
      {actionMenu ? (
        <ActionMenuPanel
          actionMenu={actionMenu}
          query={query}
          joinedTableIds={joinedTableIds}
          onClose={() => setActionMenu(null)}
          onQueryChange={updateQuery}
        />
      ) : null}
    </section>
  );

  const queryControls = (
    <div className="query-actions grid gap-3 border-t border-border bg-card p-3">
      <LimitControl query={query} onQueryChange={updateQuery} />
      <Button className="w-full" onClick={previewResult} disabled={!query.baseTableId}>
        <PlayIcon aria-hidden="true" />
        Preview Result
      </Button>
    </div>
  );

  const outputPanel = (
    <aside className="output-panel grid h-full min-h-0 overflow-hidden border-l border-border bg-card">
      <StatusPanel status={status} />
      <SqlPanel sql={sql} />
      <ResultPanel result={result} expected={activeLesson?.expectedResult ?? null} report={validationReport} />
      {queryControls}
    </aside>
  );

  return (
    <main className="h-dvh overflow-hidden bg-background text-foreground">
      <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
        <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <CircleStackIcon className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">AprenDB</h1>
              <p className="text-xs text-muted-foreground">Visual SQL lesson sandbox</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetCurrentQuery}>
              <ArrowPathIcon aria-hidden="true" />
              Reset
            </Button>
            <Button size="sm" onClick={resetCurrentQuery}>
              <PlusIcon aria-hidden="true" />
              New Query
            </Button>
          </div>
        </header>

        <div className="app-workspace hidden min-h-0 md:grid" style={workspaceStyle}>
          <div className="relative min-h-0" data-lesson-open={isLessonPanelOpen}>
            <button
              className="lesson-toggle absolute right-2 top-2 z-30 hidden size-9 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="button"
              aria-label={isLessonPanelOpen ? "Collapse lessons panel" : "Expand lessons panel"}
              aria-expanded={isLessonPanelOpen}
              onClick={() => setIsLessonPanelOpen((current) => !current)}
            >
              <CursorArrowRaysIcon className="size-4" aria-hidden="true" />
            </button>
            {lessonPanel}
          </div>
          {graphPanel(true)}
          {outputPanel}
        </div>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] md:hidden">
          <nav className="overflow-x-auto border-b border-border bg-card px-2 py-2" aria-label="Workspace views">
            <div className="grid min-w-max grid-cols-5 gap-1">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={cn(
                    "rounded-md px-3 py-2 text-xs font-semibold transition-colors",
                    activeMobileTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  type="button"
                  onClick={() => setActiveMobileTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="min-h-0 overflow-hidden">
            {activeMobileTab === "lessons" ? lessonPanel : null}
            {activeMobileTab === "graph" ? graphPanel(false) : null}
            {activeMobileTab === "sql" ? <SqlPanel sql={sql} /> : null}
            {activeMobileTab === "results" ? (
              <ResultPanel result={result} expected={activeLesson?.expectedResult ?? null} report={validationReport} />
            ) : null}
            {activeMobileTab === "query" ? (
              <aside className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-auto bg-card">
                <StatusPanel status={status} />
                <div className="min-h-0" />
                {queryControls}
              </aside>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );

  function ActionMenuPanel({
    actionMenu: menu,
    query: currentQuery,
    joinedTableIds: currentJoinedTableIds,
    onClose,
    onQueryChange,
  }: {
    actionMenu: ActionMenu;
    query: VisualQuery;
    joinedTableIds: string[];
    onClose: () => void;
    onQueryChange: (nextQuery: VisualQuery) => void;
  }) {
    const table = findTable(commerceSchema, menu.tableId);
    const column = menu.kind === "column" ? findColumn(commerceSchema, menu) : undefined;
    const isJoined = currentJoinedTableIds.includes(menu.tableId);
    const reachable = isTableReachable(currentQuery, commerceSchema, menu.tableId);
    const relationship = getRelationshipForTables(commerceSchema, currentJoinedTableIds, menu.tableId);
    const existingFilter =
      menu.kind === "column"
        ? currentQuery.filters.find(
            (filter) => filter.tableId === menu.tableId && filter.columnId === menu.columnId,
          )
        : undefined;
    const selected =
      menu.kind === "column" &&
      currentQuery.selectedColumns.some(
        (selectedColumn) =>
          selectedColumn.tableId === menu.tableId && selectedColumn.columnId === menu.columnId,
      );

    return (
      <div
        className="fixed z-50 w-72 rounded-md border border-border bg-card p-3 shadow-lg"
        style={{ left: Math.min(menu.x, window.innerWidth - 304), top: Math.min(menu.y, window.innerHeight - 360) }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">
              {column ? `${table?.label}.${column.label}` : table?.label}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {column ? `${column.type}${column.role ? ` · ${column.role.toUpperCase()}` : ""}` : table?.description}
            </p>
          </div>
          <button className="rounded p-1 hover:bg-accent" onClick={onClose} aria-label="Close menu">
            <XMarkIcon className="size-4" aria-hidden="true" />
          </button>
        </div>

        {menu.kind === "table" ? (
          <div className="space-y-2">
            {!currentQuery.baseTableId ? (
              <Button
                className="w-full"
                onClick={() => {
                  onQueryChange(addBaseTable(currentQuery, menu.tableId));
                  onClose();
                }}
              >
                Start from this table
              </Button>
            ) : null}
            {currentQuery.baseTableId && !isJoined && relationship ? (
              <div className="space-y-2">
                {joinTypes.map((joinType) => (
                  <Button
                    key={joinType}
                    className="w-full"
                    variant={joinType === "INNER JOIN" ? "default" : "outline"}
                    onClick={() => {
                      onQueryChange(addJoin(currentQuery, relationship.id, joinType));
                      onClose();
                    }}
                  >
                    {joinType} table
                  </Button>
                ))}
                <p className="text-xs text-muted-foreground">{relationship.label}</p>
              </div>
            ) : null}
            {currentQuery.baseTableId && !isJoined && !reachable ? (
              <p className="rounded-md bg-secondary p-2 text-xs text-muted-foreground">
                Join another connected table first to reach this table.
              </p>
            ) : null}
            {isJoined ? (
              <div className="space-y-2">
                <p className="rounded-md bg-select p-2 text-xs text-select-foreground">
                  This table is already part of the query.
                </p>
                {relationship && currentQuery.baseTableId !== menu.tableId ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      onQueryChange(removeJoin(currentQuery, relationship.id, commerceSchema));
                      onClose();
                    }}
                  >
                    Remove join
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <ColumnActions
            columnRef={{ tableId: menu.tableId, columnId: menu.columnId }}
            selected={selected}
            disabled={!isJoined}
            existingFilter={existingFilter}
            query={currentQuery}
            onClose={onClose}
            onQueryChange={onQueryChange}
          />
        )}
      </div>
    );
  }
}

function CanvasEmptyState({
  activeLesson,
  suggestedTableId,
  onStartTable,
}: {
  activeLesson?: Lesson;
  suggestedTableId?: string;
  onStartTable: (tableId: string) => void;
}) {
  const suggestedTable = suggestedTableId ? findTable(commerceSchema, suggestedTableId) : undefined;
  const tableOptions = [
    ...(suggestedTable ? [suggestedTable] : []),
    ...commerceSchema.tables.filter((table) => table.id !== suggestedTable?.id),
  ];

  return (
    <div className="pointer-events-none absolute left-1/2 top-5 z-10 w-[min(520px,calc(100%-32px))] -translate-x-1/2 rounded-md border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
      <div className="pointer-events-auto">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Choose a starting table</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeLesson
              ? `For "${activeLesson.title}", start with ${suggestedTable?.label ?? "the lesson table"}.`
              : "Pick the table that should appear after FROM."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tableOptions.map((table) => (
            <Button
              key={table.id}
              size="sm"
              variant={table.id === suggestedTable?.id ? "default" : "outline"}
              onClick={() => onStartTable(table.id)}
            >
              <TableCellsIcon aria-hidden="true" />
              {table.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RelationshipLegend({ hasBaseTable }: { hasBaseTable: boolean }) {
  return (
    <div className="absolute right-4 top-4 z-10 rounded-md border border-border bg-card/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
      <h2 className="mb-2 font-semibold">Relationships</h2>
      <div className="grid gap-1.5 text-muted-foreground">
        <LegendItem className="border-solid border-join" label="Joined" />
        <LegendItem className="border-dashed border-primary" label={hasBaseTable ? "Available join" : "Available after start"} />
        <LegendItem className="border-dashed border-border" label="Unavailable" />
      </div>
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-8 border-t-2", className)} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function SchemaTableNode({ data }: NodeProps<SchemaNode>) {
  const { table, query, joinedTableIds, onTableAction, onColumnAction, onColumnQuickAction } = data;
  const isBase = query.baseTableId === table.id;
  const isJoined = joinedTableIds.includes(table.id);
  const reachable = isTableReachable(query, commerceSchema, table.id);

  return (
    <article
      className={cn(
        "relative w-[230px] rounded-md border bg-card shadow-sm",
        isBase && "border-primary ring-2 ring-primary/25",
        !isBase && isJoined && "border-join",
        !isJoined && query.baseTableId && reachable && "border-primary/60",
        !isJoined && query.baseTableId && !reachable && "opacity-55",
      )}
    >
      <Handle className="opacity-0" type="target" position={Position.Left} isConnectable={false} />
      <Handle className="opacity-0" type="source" position={Position.Right} isConnectable={false} />
      <button
        className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left"
        onClick={(event) => onTableAction(event, table.id)}
        onContextMenu={(event) => onTableAction(event, table.id)}
      >
        <TableCellsIcon className="size-4 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{table.label}</h2>
          <p className="truncate text-[11px] text-muted-foreground">
            {isBase ? "FROM table" : isJoined ? "Joined table" : table.name}
          </p>
        </div>
      </button>
      <div className="p-2">
        {table.columns.map((column) => {
          const selected = query.selectedColumns.some(
            (item) => item.tableId === table.id && item.columnId === column.id,
          );
          const filtered = query.filters.some(
            (item) => item.tableId === table.id && item.columnId === column.id,
          );
          const sorted = query.sort?.tableId === table.id && query.sort.columnId === column.id;

          return (
            <div
              key={column.id}
              className={cn(
                "group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center rounded text-xs transition-colors hover:bg-accent focus-within:bg-accent",
                selected && "bg-select text-select-foreground hover:bg-select",
                (filtered || sorted) && !selected && "bg-secondary",
              )}
            >
              <button
                className="min-w-0 px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={(event) => onColumnAction(event, { tableId: table.id, columnId: column.id })}
                onContextMenu={(event) => onColumnAction(event, { tableId: table.id, columnId: column.id })}
              >
                <span className="block truncate font-medium">{column.name}</span>
              </button>
              <div className="flex items-center gap-0.5 pr-1">
                <span className="px-1 text-muted-foreground">
                  {filtered ? "WHERE" : sorted ? "SORT" : column.role ? column.role.toUpperCase() : column.type}
                </span>
                <ColumnQuickActionButton
                  active={selected}
                  ariaLabel={`${selected ? "Remove" : "Add"} ${table.label}.${column.label} from result`}
                  onClick={(event) =>
                    onColumnQuickAction(event, { tableId: table.id, columnId: column.id }, "select")
                  }
                >
                  <PlusIcon className="size-3.5" aria-hidden="true" />
                </ColumnQuickActionButton>
                <ColumnQuickActionButton
                  active={filtered}
                  ariaLabel={`Filter ${table.label}.${column.label}`}
                  onClick={(event) =>
                    onColumnQuickAction(event, { tableId: table.id, columnId: column.id }, "filter")
                  }
                >
                  <FunnelIcon className="size-3.5" aria-hidden="true" />
                </ColumnQuickActionButton>
                <ColumnQuickActionButton
                  active={sorted}
                  ariaLabel={`Sort ${table.label}.${column.label}`}
                  onClick={(event) =>
                    onColumnQuickAction(event, { tableId: table.id, columnId: column.id }, "sort")
                  }
                >
                  <BarsArrowDownIcon className="size-3.5" aria-hidden="true" />
                </ColumnQuickActionButton>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function ColumnQuickActionButton({
  active,
  ariaLabel,
  children,
  onClick,
}: {
  active: boolean;
  ariaLabel: string;
  children: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className={cn(
        "flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100",
        active && "bg-background text-primary opacity-100",
      )}
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ColumnActions({
  columnRef,
  selected,
  disabled,
  existingFilter,
  query,
  onClose,
  onQueryChange,
}: {
  columnRef: ColumnRef;
  selected: boolean;
  disabled: boolean;
  existingFilter?: { operator: FilterOperator; value: string };
  query: VisualQuery;
  onClose: () => void;
  onQueryChange: (nextQuery: VisualQuery) => void;
}) {
  const [operator, setOperator] = useState<FilterOperator>(existingFilter?.operator ?? "=");
  const [value, setValue] = useState(existingFilter?.value ?? "");
  const columnLabel = formatColumnRef(commerceSchema, columnRef);
  const column = findColumn(commerceSchema, columnRef);
  const sampleValues = column?.sampleValues ?? [];

  if (disabled) {
    return (
      <p className="rounded-md bg-secondary p-2 text-xs text-muted-foreground">
        Add this table to the query before using its columns.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        variant={selected ? "outline" : "default"}
        onClick={() => {
          onQueryChange(toggleSelectedColumn(query, columnRef));
          onClose();
        }}
      >
        {selected ? "Remove from result" : "Add to result"}
      </Button>

      <div className="space-y-2 rounded-md border border-border p-2">
        <div className="text-xs font-semibold">Filter</div>
        <div className="grid grid-cols-[92px_1fr] gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={operator}
            onChange={(event) => setOperator(event.target.value as FilterOperator)}
          >
            {filterOperators.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm"
            placeholder={sampleValues[0] !== undefined ? String(sampleValues[0]) : "value"}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        {sampleValues.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {sampleValues.map((sampleValue) => (
              <button
                key={String(sampleValue)}
                className="rounded border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
                onClick={() => setValue(String(sampleValue))}
              >
                {String(sampleValue)}
              </button>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={() => {
              onQueryChange(upsertFilter(query, { ...columnRef, operator, value }));
              onClose();
            }}
          >
            Apply
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onQueryChange(removeFilter(query, columnRef));
              onClose();
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onQueryChange(setSort(query, { ...columnRef, direction: "ASC" }));
            onClose();
          }}
        >
          Sort ASC
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onQueryChange(setSort(query, { ...columnRef, direction: "DESC" }));
            onClose();
          }}
        >
          Sort DESC
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{columnLabel}</p>
    </div>
  );
}

function LessonChecklist({
  requirements,
  highlightFirstAction,
}: {
  requirements: Array<{ requirement: LessonRequirement; state: RequirementState }>;
  highlightFirstAction: boolean;
}) {
  const firstActionId = requirements.find(({ state }) => state !== "complete")?.requirement.id;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase text-muted-foreground">Checklist</h2>
      {requirements.map(({ requirement, state }) => {
        const highlighted = highlightFirstAction && requirement.id === firstActionId;

        return (
          <div
            key={requirement.id}
            className={cn(
              "rounded-md border bg-background p-3",
              state === "complete" && "border-primary/40 bg-select",
              state === "incomplete" && "border-border",
              state === "needs-preview" && "border-border bg-secondary/60",
              highlighted && "border-primary bg-primary/10 ring-2 ring-primary/20",
            )}
          >
            <div className="flex items-start gap-2">
              <RequirementIcon state={state} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground">{requirement.label}</div>
                <p className="mt-1 text-xs text-muted-foreground">{requirement.tip}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RequirementIcon({ state }: { state: RequirementState }) {
  if (state === "complete") {
    return <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />;
  }

  if (state === "needs-preview") {
    return <PlayIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
  }

  return <XCircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

function StatusPanel({ status }: { status: QueryStatus }) {
  return (
    <div
      className={cn(
        "border-b border-border p-4",
        status.kind === "success" && "bg-select",
        status.kind === "error" && "bg-destructive/10",
      )}
    >
      <div className="flex items-start gap-2">
        {status.kind === "success" ? (
          <CheckCircleIcon className="mt-0.5 size-5 text-primary" aria-hidden="true" />
        ) : status.kind === "error" ? (
          <ExclamationTriangleIcon className="mt-0.5 size-5 text-destructive" aria-hidden="true" />
        ) : (
          <CursorArrowRaysIcon className="mt-0.5 size-5 text-primary" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Lesson Status</h2>
          <p className="mt-1 text-xs text-muted-foreground">{status.message}</p>
        </div>
      </div>
    </div>
  );
}

function SqlPanel({ sql }: { sql: string }) {
  return (
    <div className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] border-b border-border">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Generated SQL</h2>
      </div>
      <pre className="min-h-0 min-w-0 max-w-full overflow-auto whitespace-pre-wrap p-4 text-sm leading-6 [overflow-wrap:anywhere]">
        {sql.split("\n").map((line, index) => (
          <code key={`${index}-${line}`} className="block min-w-0 rounded px-2 font-mono text-foreground [overflow-wrap:anywhere]">
            {line}
          </code>
        ))}
      </pre>
    </div>
  );
}

function ResultPanel({
  result,
  expected,
  report,
}: {
  result: QueryResult | null;
  expected: QueryResult | null;
  report: LessonValidationReport | null;
}) {
  return (
    <div className="result-scroll h-full min-h-0 min-w-0 overflow-auto border-b border-border p-4">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Result Preview</h2>
        <span className="shrink-0 text-xs text-muted-foreground">
          Expected: {expected ? `${expected.rows.length} rows` : "none"}
        </span>
      </div>
      <ResultFeedback result={result} report={report} />
      {result && result.columns.length > 0 ? <ResultTable result={result} /> : null}
      {result && result.columns.length === 0 ? (
        <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">
          No rows to show yet.
        </p>
      ) : null}
      {!result ? (
        <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">
          Preview the query to execute it against the commerce database.
        </p>
      ) : null}
    </div>
  );
}

function ResultFeedback({
  result,
  report,
}: {
  result: QueryResult | null;
  report: LessonValidationReport | null;
}) {
  if (!report) {
    return null;
  }

  if (!result) {
    return (
      <div className="mb-3 rounded-md border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
        Preview the query to compare actual rows with the expected result.
      </div>
    );
  }

  if (report.passed) {
    return (
      <div className="mb-3 flex items-start gap-2 rounded-md border border-primary/40 bg-select p-3 text-xs text-select-foreground">
        <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>Result matches the expected columns, rows, and order.</span>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-md border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
        <ExclamationTriangleIcon className="size-4 text-destructive" aria-hidden="true" />
        Adjust the query
      </div>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        {report.diagnostics.slice(0, 4).map((diagnostic) => (
          <li key={`${diagnostic.type}-${diagnostic.message}`}>
            {diagnostic.message}
            {diagnostic.type === "missing-rows" || diagnostic.type === "extra-rows" ? (
              <span className="block pl-3 text-[11px]">{formatRows(diagnostic.rows)}</span>
            ) : null}
            {diagnostic.type === "order-differences" ? (
              <span className="block pl-3 text-[11px]">
                Row {diagnostic.differences[0]?.index + 1}: expected{" "}
                {formatRow(diagnostic.differences[0]?.expected ?? [])}, got{" "}
                {formatRow(diagnostic.differences[0]?.actual ?? [])}.
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultTable({ result }: { result: QueryResult }) {
  return (
    <table className="result-table w-full border-collapse text-left text-xs">
      <thead>
        <tr>
          {result.columns.map((column) => (
            <th key={column} className="border border-border bg-secondary px-2 py-1.5 font-semibold">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((value, valueIndex) => (
              <td key={`${rowIndex}-${valueIndex}`} className="border border-border px-2 py-1.5">
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LimitControl({
  query,
  onQueryChange,
}: {
  query: VisualQuery;
  onQueryChange: (nextQuery: VisualQuery) => void;
}) {
  return (
    <div className="grid gap-2 text-xs text-muted-foreground">
      <div className="grid grid-cols-[58px_1fr_auto] items-center gap-2">
        <span className="font-semibold text-foreground">LIMIT</span>
        <input
          className="h-8 min-w-0 rounded-md border border-input bg-background px-2"
          type="number"
          min={1}
          placeholder="none"
          value={query.limit?.value ?? ""}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            onQueryChange(setLimit(query, Number.isFinite(parsed) ? parsed : undefined));
          }}
        />
        <span>{query.limit?.value ?? "unset"}</span>
      </div>
    </div>
  );
}

function PanelResizeHandle({
  ariaLabel,
  className,
  maxValue,
  minValue,
  onPointerDown,
  onKeyDown,
  value,
}: {
  ariaLabel: string;
  className: string;
  maxValue: number;
  minValue: number;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  value: number;
}) {
  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      aria-valuemax={maxValue}
      aria-valuemin={minValue}
      aria-valuenow={value}
      className={cn(
        "absolute top-0 z-20 h-full w-3 -translate-x-1/2 cursor-col-resize touch-none",
        "after:absolute after:left-1/2 after:top-0 after:h-full after:w-px after:-translate-x-1/2 after:bg-transparent",
        "hover:after:bg-primary focus-visible:outline-none focus-visible:after:bg-primary",
        className,
      )}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
    />
  );
}

function startPanelResize(
  event: PointerEvent<HTMLDivElement>,
  resizePanel: (clientX: number) => void,
) {
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  resizePanel(event.clientX);

  function onPointerMove(moveEvent: globalThis.PointerEvent) {
    resizePanel(moveEvent.clientX);
  }

  function onPointerUp() {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  }

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

function getLessonRequirementStates(
  lesson: Lesson,
  query: VisualQuery,
  result: QueryResult | null,
): Array<{ requirement: LessonRequirement; state: RequirementState }> {
  const currentJoinedTableIds = getJoinedTableIds(query, commerceSchema);
  const report = getLessonValidationReport(result, lesson.expectedResult);

  return lesson.requirements.map((requirement) => ({
    requirement,
    state: getRequirementState(requirement, query, currentJoinedTableIds, result, report),
  }));
}

function getRequirementState(
  requirement: LessonRequirement,
  query: VisualQuery,
  joinedTableIds: string[],
  result: QueryResult | null,
  report: LessonValidationReport,
): RequirementState {
  if (requirement.type === "base-table") {
    return query.baseTableId === requirement.tableId ? "complete" : "incomplete";
  }

  if (requirement.type === "selected-columns") {
    return sameColumnList(query.selectedColumns, requirement.columns) ? "complete" : "incomplete";
  }

  if (requirement.type === "joined-tables") {
    return requirement.tableIds.every((tableId) => joinedTableIds.includes(tableId))
      ? "complete"
      : "incomplete";
  }

  if (requirement.type === "filters") {
    return requirement.filters.every((requiredFilter) =>
      query.filters.some(
        (filter) =>
          sameColumn(filter, requiredFilter) &&
          filter.operator === requiredFilter.operator &&
          filter.value.trim() === requiredFilter.value,
      ),
    )
      ? "complete"
      : "incomplete";
  }

  if (requirement.type === "sort") {
    return query.sort &&
      sameColumn(query.sort, requirement.sort) &&
      query.sort.direction === requirement.sort.direction
      ? "complete"
      : "incomplete";
  }

  if (requirement.type === "limit") {
    return query.limit?.value === requirement.value ? "complete" : "incomplete";
  }

  if (!result) {
    return "needs-preview";
  }

  return report.passed ? "complete" : "incomplete";
}

function sameColumnList(left: ColumnRef[], right: ColumnRef[]) {
  return left.length === right.length && left.every((column, index) => sameColumn(column, right[index]));
}

function formatRows(rows: QueryResult["rows"]) {
  return rows.map(formatRow).join("; ");
}

function formatRow(row: QueryResult["rows"][number]) {
  return `[${row.map((value) => (value === null ? "NULL" : String(value))).join(", ")}]`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resizePanelWithKeyboard(
  event: KeyboardEvent<HTMLDivElement>,
  setPanelWidth: (update: (currentWidth: number) => number) => void,
  minWidth: number,
  maxWidth: number,
  invert = false,
) {
  const smallStep = 12;
  const largeStep = 48;
  const direction = invert ? -1 : 1;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setPanelWidth((currentWidth) => clamp(currentWidth - smallStep * direction, minWidth, maxWidth));
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    setPanelWidth((currentWidth) => clamp(currentWidth + smallStep * direction, minWidth, maxWidth));
  }

  if (event.key === "Home") {
    event.preventDefault();
    setPanelWidth(() => minWidth);
  }

  if (event.key === "End") {
    event.preventDefault();
    setPanelWidth(() => maxWidth);
  }

  if (event.key === "PageDown") {
    event.preventDefault();
    setPanelWidth((currentWidth) => clamp(currentWidth - largeStep, minWidth, maxWidth));
  }

  if (event.key === "PageUp") {
    event.preventDefault();
    setPanelWidth((currentWidth) => clamp(currentWidth + largeStep, minWidth, maxWidth));
  }
}

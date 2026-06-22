export type ColumnType = "integer" | "text" | "real";

export type SchemaColumn = {
  id: string;
  name: string;
  label: string;
  type: ColumnType;
  role?: "pk" | "fk";
  sampleValues?: Array<string | number>;
};

export type SchemaTable = {
  id: string;
  name: string;
  label: string;
  description: string;
  columns: SchemaColumn[];
  position: { x: number; y: number };
};

export type Relationship = {
  id: string;
  fromTableId: string;
  fromColumnId: string;
  toTableId: string;
  toColumnId: string;
  label: string;
};

export type Schema = {
  tables: SchemaTable[];
  relationships: Relationship[];
};

export type ColumnRef = {
  tableId: string;
  columnId: string;
};

export type JoinType = "INNER JOIN" | "LEFT JOIN";

export type JoinSpec = {
  relationshipId: string;
  type: JoinType;
};

export type FilterOperator = "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains";

export type FilterSpec = ColumnRef & {
  operator: FilterOperator;
  value: string;
};

export type SortSpec = ColumnRef & {
  direction: "ASC" | "DESC";
};

export type LimitSpec = {
  value: number;
};

export type SelectedColumn = ColumnRef;

export type VisualQuery = {
  baseTableId?: string;
  joins: JoinSpec[];
  selectedColumns: SelectedColumn[];
  filters: FilterSpec[];
  sort?: SortSpec;
  limit?: LimitSpec;
};

export type LessonExpectedResult = {
  columns: string[];
  rows: Array<Array<string | number | null>>;
};

export type RequirementState = "complete" | "incomplete" | "needs-preview";

export type LessonRequirement =
  | {
      id: string;
      type: "base-table";
      label: string;
      tip: string;
      tableId: string;
    }
  | {
      id: string;
      type: "selected-columns";
      label: string;
      tip: string;
      columns: SelectedColumn[];
    }
  | {
      id: string;
      type: "joined-tables";
      label: string;
      tip: string;
      tableIds: string[];
    }
  | {
      id: string;
      type: "filters";
      label: string;
      tip: string;
      filters: FilterSpec[];
    }
  | {
      id: string;
      type: "sort";
      label: string;
      tip: string;
      sort: SortSpec;
    }
  | {
      id: string;
      type: "limit";
      label: string;
      tip: string;
      value: number;
    }
  | {
      id: string;
      type: "expected-result";
      label: string;
      tip: string;
    };

export type LessonHint = {
  title: string;
  body: string;
};

export type Lesson = {
  id: string;
  title: string;
  goal: string;
  tips: LessonHint[];
  requirements: LessonRequirement[];
  expectedResult: LessonExpectedResult;
};

export type QueryResult = {
  columns: string[];
  rows: Array<Array<string | number | null>>;
};

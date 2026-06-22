import type { QueryResult } from "@/types/query";

export type LessonValidationDiagnostic =
  | {
      type: "wrong-columns";
      message: string;
      expectedColumns: string[];
      actualColumns: string[];
    }
  | {
      type: "wrong-row-count";
      message: string;
      expectedCount: number;
      actualCount: number;
    }
  | {
      type: "missing-rows";
      message: string;
      rows: QueryResult["rows"];
      count: number;
    }
  | {
      type: "extra-rows";
      message: string;
      rows: QueryResult["rows"];
      count: number;
    }
  | {
      type: "order-differences";
      message: string;
      differences: Array<{
        index: number;
        expected: QueryResult["rows"][number];
        actual: QueryResult["rows"][number];
      }>;
      count: number;
    };

export type LessonValidationReport = {
  passed: boolean;
  diagnostics: LessonValidationDiagnostic[];
};

export function validateLessonResult(actual: QueryResult | null, expected: QueryResult) {
  return getLessonValidationReport(actual, expected).passed;
}

export function getLessonValidationReport(
  actual: QueryResult | null,
  expected: QueryResult,
): LessonValidationReport {
  if (!actual) {
    return {
      passed: false,
      diagnostics: [
        {
          type: "wrong-row-count",
          message: `Expected ${expected.rows.length} rows, but no preview has run yet.`,
          expectedCount: expected.rows.length,
          actualCount: 0,
        },
      ],
    };
  }

  const diagnostics: LessonValidationDiagnostic[] = [];

  if (!sameArray(actual.columns, expected.columns)) {
    diagnostics.push({
      type: "wrong-columns",
      message: `Expected columns ${formatList(expected.columns)}, but got ${formatList(actual.columns)}.`,
      expectedColumns: expected.columns,
      actualColumns: actual.columns,
    });
  }

  if (actual.rows.length !== expected.rows.length) {
    diagnostics.push({
      type: "wrong-row-count",
      message: `Expected ${expected.rows.length} rows, but got ${actual.rows.length}.`,
      expectedCount: expected.rows.length,
      actualCount: actual.rows.length,
    });
  }

  const missingRows = subtractRows(expected.rows, actual.rows);
  const extraRows = subtractRows(actual.rows, expected.rows);

  if (missingRows.length > 0) {
    diagnostics.push({
      type: "missing-rows",
      message: `${missingRows.length} expected row${missingRows.length === 1 ? "" : "s"} missing from the preview.`,
      rows: missingRows.slice(0, 3),
      count: missingRows.length,
    });
  }

  if (extraRows.length > 0) {
    diagnostics.push({
      type: "extra-rows",
      message: `${extraRows.length} extra row${extraRows.length === 1 ? "" : "s"} returned by the preview.`,
      rows: extraRows.slice(0, 3),
      count: extraRows.length,
    });
  }

  const rowSetsMatch = missingRows.length === 0 && extraRows.length === 0;
  const orderDifferences = expected.rows
    .map((row, index) => ({ index, expected: row, actual: actual.rows[index] }))
    .filter(({ expected: expectedRow, actual: actualRow }) => actualRow && !sameArray(actualRow, expectedRow));

  if (rowSetsMatch && orderDifferences.length > 0) {
    diagnostics.push({
      type: "order-differences",
      message: `${orderDifferences.length} row${orderDifferences.length === 1 ? "" : "s"} are present but in the wrong order.`,
      differences: orderDifferences.slice(0, 3) as Array<{
        index: number;
        expected: QueryResult["rows"][number];
        actual: QueryResult["rows"][number];
      }>,
      count: orderDifferences.length,
    });
  }

  return {
    passed: diagnostics.length === 0,
    diagnostics,
  };
}

function sameArray(left: Array<string | number | null>, right: Array<string | number | null>) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function subtractRows(left: QueryResult["rows"], right: QueryResult["rows"]) {
  const remaining = new Map<string, number>();

  for (const row of right) {
    const key = serializeRow(row);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }

  return left.filter((row) => {
    const key = serializeRow(row);
    const count = remaining.get(key) ?? 0;

    if (count === 0) {
      return true;
    }

    if (count === 1) {
      remaining.delete(key);
    } else {
      remaining.set(key, count - 1);
    }

    return false;
  });
}

function serializeRow(row: QueryResult["rows"][number]) {
  return JSON.stringify(row);
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "none";
}

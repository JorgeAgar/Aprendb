import type { QueryResult } from "@/types/query";

export function validateLessonResult(actual: QueryResult | null, expected: QueryResult) {
  if (!actual) {
    return false;
  }

  if (!sameArray(actual.columns, expected.columns)) {
    return false;
  }

  if (actual.rows.length !== expected.rows.length) {
    return false;
  }

  return actual.rows.every((row, rowIndex) => sameArray(row, expected.rows[rowIndex] ?? []));
}

function sameArray(left: Array<string | number | null>, right: Array<string | number | null>) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

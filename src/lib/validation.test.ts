import { describe, expect, it } from "vitest";
import { getLessonValidationReport, validateLessonResult } from "@/lib/validation";

describe("validateLessonResult", () => {
  it("passes when columns and rows match exactly", () => {
    expect(
      validateLessonResult(
        { columns: ["name"], rows: [["Ava Chen"]] },
        { columns: ["name"], rows: [["Ava Chen"]] },
      ),
    ).toBe(true);
  });

  it("fails when row order differs", () => {
    expect(
      validateLessonResult(
        { columns: ["id"], rows: [[2], [1]] },
        { columns: ["id"], rows: [[1], [2]] },
      ),
    ).toBe(false);
  });

  it("fails without a result", () => {
    expect(validateLessonResult(null, { columns: ["id"], rows: [[1]] })).toBe(false);
  });

  it("reports wrong columns", () => {
    const report = getLessonValidationReport(
      { columns: ["total"], rows: [[129.99]] },
      { columns: ["id"], rows: [[129.99]] },
    );

    expect(report.passed).toBe(false);
    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "wrong-columns",
          expectedColumns: ["id"],
          actualColumns: ["total"],
        }),
      ]),
    );
  });

  it("reports wrong row count", () => {
    const report = getLessonValidationReport(
      { columns: ["id"], rows: [[1], [2]] },
      { columns: ["id"], rows: [[1]] },
    );

    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "wrong-row-count",
          expectedCount: 1,
          actualCount: 2,
        }),
      ]),
    );
  });

  it("reports missing and extra rows", () => {
    const report = getLessonValidationReport(
      { columns: ["id"], rows: [[1], [3]] },
      { columns: ["id"], rows: [[1], [2]] },
    );

    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "missing-rows", rows: [[2]], count: 1 }),
        expect.objectContaining({ type: "extra-rows", rows: [[3]], count: 1 }),
      ]),
    );
  });

  it("reports order differences when the same rows are returned in the wrong order", () => {
    const report = getLessonValidationReport(
      { columns: ["id"], rows: [[2], [1]] },
      { columns: ["id"], rows: [[1], [2]] },
    );

    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "order-differences",
          count: 2,
          differences: [
            { index: 0, expected: [1], actual: [2] },
            { index: 1, expected: [2], actual: [1] },
          ],
        }),
      ]),
    );
  });
});

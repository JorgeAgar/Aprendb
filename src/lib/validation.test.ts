import { describe, expect, it } from "vitest";
import { validateLessonResult } from "@/lib/validation";

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
});

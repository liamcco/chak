import { describe, expect, it } from "vitest";
import { resultExportCsv } from "./results-csv";

describe("resultExportCsv", () => {
  it("exports aggregate totals without Participant or Ballot data", () => {
    const csv = resultExportCsv({ rows: [{ suggestion: "Kör,an", motivation: "Motivation", approvalYay: 2, approvalNay: 1, approvalUnanswered: 0, finalist: true, finalVoteTotal: 4, runoffTotals: [2] }], turnout: 2, participantCount: 3, publishedResult: { revealedAt: new Date("2026-01-01"), winners: [], finalists: [], turnout: 2, participantCount: 3 } });
    expect(csv).toContain("approval_yay");
    expect(csv).toContain('"Kör,an"');
    expect(csv).toContain('"2","3"');
    expect(csv).not.toMatch(/invitation|choice|allocation|Maja/i);
  });
});

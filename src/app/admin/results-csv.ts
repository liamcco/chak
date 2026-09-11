import type { ResultExport } from "@/server/name-election/service";

function csv(value: string | number | boolean) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function resultExportCsv(data: ResultExport) {
  const runoffCount = Math.max(0, ...data.rows.map((row) => row.runoffTotals.length));
  const header = ["suggestion", "motivation", "approval_yay", "approval_nay", "approval_unanswered", "finalist", "final_vote_total", ...Array.from({ length: runoffCount }, (_, i) => `runoff_${i + 1}_total`), "turnout", "participant_count"];
  const lines = [header.map(csv).join(",")];
  for (const row of data.rows) lines.push([...([row.suggestion, row.motivation, row.approvalYay, row.approvalNay, row.approvalUnanswered, row.finalist]), row.finalVoteTotal, ...Array.from({ length: runoffCount }, (_, i) => row.runoffTotals[i] ?? 0), data.turnout, data.participantCount].map(csv).join(","));
  return `${lines.join("\r\n")}\r\n`;
}

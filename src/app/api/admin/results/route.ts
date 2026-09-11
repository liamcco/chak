import { NextResponse } from "next/server";
import { isAdministrator } from "@/server/auth/admin";
import { nameElectionService } from "@/server/name-election";
import { resultExportCsv } from "@/app/admin/results-csv";

export async function GET() {
  if (!(await isAdministrator())) return new NextResponse("Unauthorized", { status: 401 });
  const result = await nameElectionService.exportResults();
  if (!result) return new NextResponse("Result Reveal is not available", { status: 409 });
  return new NextResponse(resultExportCsv(result), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=namnval-resultat.csv", "Cache-Control": "no-store" } });
}

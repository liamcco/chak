import { NextResponse } from "next/server";
import { nameElectionService } from "@/server/name-election";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(await nameElectionService.getPublishedResult(), { headers: { "Cache-Control": "no-store" } }); }

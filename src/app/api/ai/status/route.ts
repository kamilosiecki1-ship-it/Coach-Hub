import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/aiService";

export async function GET() {
  return NextResponse.json({ configured: isAiConfigured() });
}

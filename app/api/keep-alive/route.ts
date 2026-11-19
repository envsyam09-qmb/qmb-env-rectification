import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { ok: false, message: "Variabel .env.local belum terbaca" },
        { status: 500 }
      );
    }

    const { error } = await supabase
      .from("investigation_reports")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          message: error.message,
          details: error.details,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: "Supabase aktif & terhubung",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : "Gagal terhubung ke Supabase";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
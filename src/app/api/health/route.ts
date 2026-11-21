import { pool } from "@/lib/db";
import { responder } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — comprueba la BD. Lo llama un cron de Vercel (vercel.json) cada día para que
 * el proyecto gratuito de Supabase no se pause por inactividad (se pausa tras 7 días sin uso).
 */
export async function GET() {
  try {
    await pool.query("SELECT 1");
    return responder({ ok: true });
  } catch (error) {
    console.error("❌ Health check falló:", error);
    return responder({ ok: false }, 503);
  }
}


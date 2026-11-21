import { createClient } from "@supabase/supabase-js";

// Las credenciales ahora viven en variables de entorno (.env / panel de Vercel).
// La anon key es pública por diseño, pero la seguridad real la dan las políticas RLS en Supabase.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// 🚀 Crear cliente Supabase (valores de relleno evitan que el build falle si faltan)
export const supabase = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseAnonKey || "anon-key-no-configurada"
);

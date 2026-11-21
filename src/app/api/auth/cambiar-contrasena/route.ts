import { pool } from "@/lib/db";
import { conAuth, errorMensaje, hashearContrasena, leerJson, responder, verificarContrasena } from "@/lib/auth";

export const PUT = conAuth(async (req, sesion) => {
  const { actual, nueva } = await leerJson<{ actual?: string; nueva?: string }>(req);
  if (!actual || !nueva) return errorMensaje("Contraseña actual y nueva son obligatorias", 400);
  if (nueva.length < 6) return errorMensaje("La nueva contraseña debe tener al menos 6 caracteres", 400);

  const r = await pool.query('SELECT "contraseña" AS hash FROM usuarios WHERE id = $1', [sesion.id]);
  const { valida } = await verificarContrasena(r.rows[0]?.hash ?? null, actual);
  if (!valida) return errorMensaje("Contraseña actual incorrecta", 401);

  await pool.query('UPDATE usuarios SET "contraseña" = $1 WHERE id = $2', [
    await hashearContrasena(nueva),
    sesion.id,
  ]);
  return responder({ mensaje: "Contraseña actualizada correctamente" });
});


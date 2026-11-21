import { pool } from "@/lib/db";
import {
  errorMensaje,
  firmarToken,
  hashearContrasena,
  leerJson,
  responder,
  sinAuth,
  verificarContrasena,
} from "@/lib/auth";

export const POST = sinAuth(async (req) => {
  const { email, contraseña } = await leerJson<{ email?: string; contraseña?: string }>(req);
  if (!email || !contraseña) return errorMensaje("Correo y contraseña son obligatorios", 400);

  const resultado = await pool.query(
    'SELECT id, nombre, email, "contraseña" AS hash FROM usuarios WHERE LOWER(email) = $1',
    [email.trim().toLowerCase()]
  );
  const usuario = resultado.rows[0];

  const { valida, necesitaRehash } = await verificarContrasena(usuario?.hash ?? null, contraseña);
  if (!usuario || !valida) return errorMensaje("Credenciales incorrectas", 401);

  // Migración transparente: contraseña antigua en texto plano → hash bcrypt
  if (necesitaRehash) {
    await pool.query('UPDATE usuarios SET "contraseña" = $1 WHERE id = $2', [
      await hashearContrasena(contraseña),
      usuario.id,
    ]);
  }

  return responder({
    mensaje: "Inicio de sesión exitoso",
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
    token: firmarToken({ id: usuario.id, email: usuario.email }),
  });
});


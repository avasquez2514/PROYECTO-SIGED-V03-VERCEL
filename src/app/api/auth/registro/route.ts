import { randomUUID } from "crypto";
import { transaccion } from "@/lib/db";
import { asignarContenidoPorDefecto } from "@/lib/defaults";
import { errorMensaje, firmarToken, hashearContrasena, leerJson, responder, sinAuth } from "@/lib/auth";

export const POST = sinAuth(async (req) => {
  const { nombre, email, contraseña } = await leerJson<{ nombre?: string; email?: string; contraseña?: string }>(req);

  const correo = email?.trim().toLowerCase();
  if (!nombre?.trim() || !correo || !contraseña) {
    return errorMensaje("Nombre, correo y contraseña son obligatorios", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return errorMensaje("Correo inválido", 400);
  if (contraseña.length < 6) return errorMensaje("La contraseña debe tener al menos 6 caracteres", 400);

  const id = randomUUID();
  const hash = await hashearContrasena(contraseña);

  const creado = await transaccion(async (client) => {
    const existe = await client.query("SELECT 1 FROM usuarios WHERE LOWER(email) = $1", [correo]);
    if (existe.rows.length > 0) return false;

    await client.query(
      "INSERT INTO usuarios (id, nombre, email, contraseña) VALUES ($1,$2,$3,$4)",
      [id, nombre.trim(), correo, hash]
    );
    await asignarContenidoPorDefecto(client, id);
    return true;
  });

  if (!creado) return errorMensaje("El correo ya está registrado", 400);

  return responder(
    {
      mensaje: "Registro exitoso",
      usuario: { id, nombre: nombre.trim(), email: correo },
      token: firmarToken({ id, email: correo }),
    },
    201
  );
});


import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export interface Sesion {
  id: string;
  email: string;
}

const getSecret = (): string => {
  const secret = process.env.KEY;
  if (!secret) throw new Error("La variable de entorno KEY (secreto JWT) no está configurada");
  return secret;
};

export const firmarToken = (payload: Sesion): string =>
  jwt.sign(payload, getSecret(), { expiresIn: "8h" });

/* ───────── Contraseñas ───────── */

const esHash = (valor: string) => /^\$2[aby]\$/.test(valor);

export const hashearContrasena = (plana: string): Promise<string> => bcrypt.hash(plana, 10);

/**
 * Compara una contraseña con la almacenada. Soporta contraseñas antiguas en texto plano
 * (migración transparente): si coincide una en texto plano, `necesitaRehash` será true.
 */
export async function verificarContrasena(
  almacenada: string | null,
  ingresada: string
): Promise<{ valida: boolean; necesitaRehash: boolean }> {
  if (!almacenada || !ingresada) return { valida: false, necesitaRehash: false };
  if (esHash(almacenada)) {
    return { valida: await bcrypt.compare(ingresada, almacenada), necesitaRehash: false };
  }
  const valida = almacenada === ingresada;
  return { valida, necesitaRehash: valida };
}

/* ───────── Respuestas ───────── */

export const responder = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const errorMensaje = (mensaje: string, status: number) => responder({ mensaje }, status);

/* ───────── Wrapper de rutas protegidas ───────── */

type Params = Record<string, string>;

/**
 * Envuelve un handler exigiendo un JWT válido (`Authorization: Bearer <token>`).
 * El usuario SIEMPRE sale del token, nunca del body/URL (evita acceder a datos ajenos).
 */
export function conAuth<P extends Params = Params>(
  handler: (req: NextRequest, usuario: Sesion, params: P) => Promise<Response>
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }): Promise<Response> => {
    const header = req.headers.get("authorization");
    if (!header) return errorMensaje("Token no proporcionado", 401);

    const [esquema, token] = header.split(" ");
    if (esquema?.toLowerCase() !== "bearer" || !token) {
      return errorMensaje("Formato de token inválido (Esperado: Bearer <token>)", 401);
    }

    let usuario: Sesion;
    try {
      usuario = jwt.verify(token, getSecret()) as Sesion;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) return errorMensaje("Token expirado", 401);
      return errorMensaje("Token inválido", 403);
    }

    try {
      return await handler(req, usuario, await ctx.params);
    } catch (error) {
      console.error("❌ Error en ruta protegida:", error);
      return errorMensaje("Error en el servidor", 500);
    }
  };
}

/** Wrapper para rutas públicas: solo captura errores no controlados. */
export function sinAuth(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      return await handler(req);
    } catch (error) {
      console.error("❌ Error en ruta pública:", error);
      return errorMensaje("Error en el servidor", 500);
    }
  };
}

/** Lee el body JSON sin lanzar si viene vacío o malformado. */
export async function leerJson<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export const esUuid = (valor: unknown): valor is string =>
  typeof valor === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);


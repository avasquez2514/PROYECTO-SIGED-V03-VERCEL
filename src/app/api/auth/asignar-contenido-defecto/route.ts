import { transaccion } from "@/lib/db";
import { asignarContenidoPorDefecto } from "@/lib/defaults";
import { conAuth, responder } from "@/lib/auth";

export const POST = conAuth(async (_req, sesion) => {
  await transaccion((client) => asignarContenidoPorDefecto(client, sesion.id));
  return responder({ mensaje: "Contenido por defecto asignado exitosamente al usuario" });
});


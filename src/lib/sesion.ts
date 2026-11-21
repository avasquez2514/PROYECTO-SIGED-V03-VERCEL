export const EVENTO_SESION_EXPIRADA = "siged:sesion-expirada";

/**
 * Verifica en el cliente si el JWT almacenado sigue vigente (campo `exp`).
 */
export function esTokenVigente(token: string | null): boolean {
  if (!token) return false;
  try {
    const partes = token.split(".");
    if (partes.length !== 3) return false;
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    if (typeof payload.exp !== "number") return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * Limpia la sesión expirada y notifica a la app para volver al login sin producir 404.
 */
export function manejarSesionExpirada(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
  if (window.location.pathname !== "/") {
    window.location.replace("/");
  }
}

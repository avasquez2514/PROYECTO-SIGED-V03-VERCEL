"use client";

import React, { useState, FormEvent, useEffect, useRef } from "react";
import { FaGoogle, FaApple, FaCheckCircle, FaTimesCircle, FaInfoCircle } from "react-icons/fa";
import "../styles/loginregistro.css";

interface LoginRegistroProps {
  onLogin: (usuario: any) => void;
}

/* Campo con ícono a la izquierda y (opcional) botón de ver/ocultar contraseña */
interface CampoProps {
  label: string;
  icono: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  password?: boolean;
  visible?: boolean;
  onToggle?: () => void;
}

const Campo: React.FC<CampoProps> = ({
  label, icono, type = "text", value, onChange, placeholder, autoComplete, password, visible, onToggle,
}) => (
  <div className="lr-field">
    <label className="lr-label">{label}</label>
    <div className="lr-input-wrap">
      <span className="material-symbols-outlined lr-input-icon">{icono}</span>
      <input
        type={password ? (visible ? "text" : "password") : type}
        className="lr-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {password && (
        <button type="button" className="lr-eye" onClick={onToggle} aria-label="Mostrar u ocultar contraseña">
          <span className="material-symbols-outlined">{visible ? "visibility_off" : "visibility"}</span>
        </button>
      )}
    </div>
  </div>
);

const LoginRegistro: React.FC<LoginRegistroProps> = ({ onLogin }) => {
  const [esRegistro, setEsRegistro] = useState(false);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrar, setMostrar] = useState(false);
  const [recordarme, setRecordarme] = useState(false);

  // ── TOAST ──
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Modo recuperación
  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const guardarSesionEnLocalStorage = (token: string, usuario: any) => {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
  };

  const manejarEnvio = async (e: FormEvent) => {
    e.preventDefault();
    const ruta = esRegistro ? "registro" : "login";
    const datos = esRegistro ? { email, nombre, contraseña } : { email, contraseña };
    try {
      setCargando(true);
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
      const respuesta = await fetch(`${API_BASE}/api/auth/${ruta}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) { showToast(resultado.mensaje || "Error en la autenticación", "error"); return; }
      guardarSesionEnLocalStorage(resultado.token, resultado.usuario);
      showToast(resultado.mensaje || "Inicio de sesión exitoso", "success");
      setTimeout(() => onLogin(resultado.usuario), 1200);
    } catch { showToast("Error de conexión con el servidor", "error"); } finally { setCargando(false); }
  };

  const recuperarContraseña = async (e: FormEvent) => {
    e.preventDefault();
    if (nueva !== confirmar) { showToast("Las contraseñas no coinciden", "error"); return; }
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
      const respuesta = await fetch(`${API_BASE}/api/auth/recuperar-contrasena`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, actual, nueva }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) { showToast(resultado.mensaje || "Error al recuperar contraseña", "error"); return; }
      showToast(resultado.mensaje || "Contraseña actualizada correctamente", "success");
      setModoRecuperar(false);
      setEmail(""); setActual(""); setNueva(""); setConfirmar("");
    } catch { showToast("Error de conexión con el servidor", "error"); }
  };

  const toastEl = toast && (
    <div className={`lr-toast lr-toast-${toast.type}`}>
      <span className="lr-toast-icon">
        {toast.type === "success" && <FaCheckCircle />}
        {toast.type === "error" && <FaTimesCircle />}
        {toast.type === "info" && <FaInfoCircle />}
      </span>
      <span className="lr-toast-msg">{toast.msg}</span>
      <div className="lr-toast-bar" />
    </div>
  );

  const badge = (icono: string) => (
    <div className="lr-badge">
      <span className="material-symbols-outlined">{icono}</span>
    </div>
  );

  /* ─── MODO RECUPERAR ─── */
  if (modoRecuperar) {
    return (
      <div className="lr-wrapper">
        {toastEl}
        <div className="lr-card">
          {badge("lock_reset")}
          <h2 className="lr-title">Recuperar contraseña</h2>
          <p className="lr-subtitle">Ingresa tu correo y establece una nueva contraseña.</p>
          <form onSubmit={recuperarContraseña} className="lr-form">
            <Campo label="Correo electrónico" icono="mail" type="email" value={email} onChange={setEmail} placeholder="tu@correo.com" />
            <Campo label="Contraseña actual" icono="lock" password visible={mostrarActual} onToggle={() => setMostrarActual(v => !v)} value={actual} onChange={setActual} placeholder="••••••••" />
            <Campo label="Nueva contraseña" icono="lock" password visible={mostrarNueva} onToggle={() => setMostrarNueva(v => !v)} value={nueva} onChange={setNueva} placeholder="••••••••" />
            <Campo label="Confirmar contraseña" icono="lock" password visible={mostrarConfirmar} onToggle={() => setMostrarConfirmar(v => !v)} value={confirmar} onChange={setConfirmar} placeholder="••••••••" />
            <button type="submit" className="lr-btn-primary">Guardar nueva contraseña</button>
            <button type="button" className="lr-btn-secondary" onClick={() => setModoRecuperar(false)}>Cancelar</button>
          </form>
        </div>
      </div>
    );
  }

  /* ─── LOGIN / REGISTRO ─── */
  return (
    <div className="lr-wrapper">
      {toastEl}
      <div className="lr-card">
        {badge("verified_user")}

        <h2 className="lr-title">{esRegistro ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h2>
        <p className="lr-subtitle">
          {esRegistro ? "Completa tus datos para registrarte." : "Ingresa tus credenciales para continuar."}
        </p>

        {/* Tabs */}
        <div className="lr-tabs">
          <button type="button" className={`lr-tab${esRegistro ? " lr-tab-active" : ""}`} onClick={() => setEsRegistro(true)}>
            Inscribirse
          </button>
          <button type="button" className={`lr-tab${!esRegistro ? " lr-tab-active" : ""}`} onClick={() => setEsRegistro(false)}>
            Iniciar sesión
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="lr-form">
          {esRegistro && (
            <Campo label="Nombre completo" icono="person" value={nombre} onChange={setNombre} placeholder="Tu nombre" autoComplete="name" />
          )}

          <Campo label="Correo electrónico" icono="mail" type="email" value={email} onChange={setEmail} placeholder="tu@correo.com" autoComplete="username" />

          <Campo
            label="Contraseña"
            icono="lock"
            password
            visible={mostrar}
            onToggle={() => setMostrar(v => !v)}
            value={contraseña}
            onChange={setContraseña}
            placeholder="••••••••"
            autoComplete={esRegistro ? "new-password" : "current-password"}
          />

          {!esRegistro && (
            <div className="lr-row-extras">
              <label className="lr-remember">
                <input type="checkbox" className="lr-checkbox" checked={recordarme} onChange={e => setRecordarme(e.target.checked)} />
                <span>Recordarme</span>
              </label>
              <button type="button" className="lr-forgot" onClick={() => setModoRecuperar(true)}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <button type="submit" className="lr-btn-primary" disabled={cargando}>
            {cargando
              ? esRegistro ? "Registrando..." : "Ingresando..."
              : esRegistro ? "CREAR CUENTA" : "INGRESAR"}
          </button>
        </form>

        <div className="lr-divider">
          <span>O INICIA SESIÓN CON</span>
        </div>

        <div className="lr-social-grid">
          <button type="button" className="lr-social-btn">
            <FaGoogle size={15} style={{ color: "#ea4335" }} />
            <span>Google</span>
          </button>
          <button type="button" className="lr-social-btn">
            <FaApple size={16} />
            <span>Apple</span>
          </button>
        </div>

        <p className="lr-footer">
          Al crear una cuenta, aceptas nuestros{" "}
          <span className="lr-link">Términos y Condiciones</span>{" "}
          y nuestra política de privacidad.
        </p>
      </div>
    </div>
  );
};

export default LoginRegistro;

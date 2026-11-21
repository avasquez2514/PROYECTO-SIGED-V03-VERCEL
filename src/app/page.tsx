"use client";

import React, { useEffect, useState } from "react";
import Alarma from "../components/Alarma";
import Aplicativos from "../components/Aplicativos";
import LoginRegistro from "../components/LoginRegistro";
import NotasAvances from "../components/NotasAvances";
import NotasConciliacion from "../components/NotasConciliacion";
import PlantillasCorreo from "../components/PlantillasCorreo";
import PlantillasAdicionales from "../components/PlantillasAdicionales";
import PlantillaSelector from "../components/PlantillaSelector";
import Sidebar from "../components/Sidebar";
import TorreSelector from "../components/TorreSelector";

import { useNavegacion } from "../hooks/useNavegacion";
import { esTokenVigente, EVENTO_SESION_EXPIRADA } from "../lib/sesion";
import "../styles/splash.css";
import "../styles/welcome.css";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

export default function Page() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [mostrarSelector, setMostrarSelector] = useState<boolean>(false);
  const [despachoOpen, setDespachoOpen] = useState<boolean>(false);
  const [ahora, setAhora] = useState<Date>(() => new Date());

  // Fecha y hora actuales: se refresca al iniciar sesión y cada 30 segundos
  useEffect(() => {
    setAhora(new Date());
    const intervalo = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(intervalo);
  }, [usuario]);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem("usuario");
      const token = localStorage.getItem("token");
      if (guardado && guardado !== "undefined" && esTokenVigente(token)) {
        setUsuario(JSON.parse(guardado));
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        setUsuario(null);
      }
    } catch (error) {
      console.error("❌ Error al leer usuario desde localStorage:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      setUsuario(null);
    } finally {
      setCargandoSesion(false);
    }

    const onSesionExpirada = () => {
      setUsuario(null);
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, onSesionExpirada);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, onSesionExpirada);
  }, []);

  const {
    tipoNota,
    torre,
    pantallaBlanca,
    modoB2B,
    vista,
    vistaEspecial,
    handleSelectTipoNota,
    handleTorreSeleccionada,
    handleVistaEspecial,
    handleVolverInicio,
  } = useNavegacion();

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
  };

  const handleMenuOpen = () => setMenuOpen(!menuOpen);

  // Cierra el sidebar cuando hace click en INICIO
  const handleInicioClick = () => {
    handleVolverInicio();
    setMenuOpen(false);
    setDespachoOpen(false);
  };

  // Abre el sidebar y muestra pantalla en blanco
  const handleAbrirMenuConTorre = () => {
    setMenuOpen(true);
    // 🚀 La función que elimina el Sidebar ahora se llama desde el botón "Let's talk"
    handleSelectTipoNota("DESPACHO B2B");
  };

  // Maneja la selección de torre
  const handleTorreSeleccionadaConSubmenu = (torreSeleccionada: string) => {
    handleTorreSeleccionada(torreSeleccionada);
    setMostrarSelector(false);
  };

  // Determina si mostrar la pantalla de bienvenida elegante
  const mostrarBienvenida = usuario && vista === "inicio" && !pantallaBlanca;

  if (cargandoSesion) {
    return (
      <div className="siged-splash">
        <div className="siged-splash-card">
          <div className="siged-splash-loader">
            <span className="siged-splash-ring" />
            <span className="siged-splash-ring siged-splash-ring-2" />
            <div className="siged-splash-logo">
              <span className="material-symbols-outlined">verified_user</span>
            </div>
          </div>
          <h1 className="siged-splash-title">SIGED</h1>
          <p className="siged-splash-text">
            Cargando<span className="siged-dots"><i>.</i><i>.</i><i>.</i></span>
          </p>
          <div className="siged-splash-bar"><span /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="marca-de-agua"></div>

      {!usuario ? (
        <LoginRegistro onLogin={setUsuario} />
      ) : (
        <>
          <Sidebar
            onSelectTipoNota={handleSelectTipoNota}
            isOpen={menuOpen}
            onClose={handleMenuOpen}
            onVistaEspecial={handleVistaEspecial}
            torreSeleccionada={torre}
            modoB2B={modoB2B}
            onVolverInicio={handleInicioClick}
            cerrarSesion={cerrarSesion}
          />

          <main className={`main-container ${mostrarBienvenida || pantallaBlanca ? "wl-bg" : "bg-mesh"}`}>
            {/* --- DECORACIONES DE FONDO --- */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -z-10"></div>

            <div className="absolute bottom-12 right-12 select-none pointer-events-none metallic-logo">
              <span className="text-9xl font-black tracking-tighter italic" style={{ fontSize: '12rem', color: 'rgba(255,255,255,0.05)' }}>A</span>
            </div>

            {/* --- INDICADOR DE TORRE --- */}
            {torre && (
              <div className="tower-indicator">
                <div className="tower-dot"></div>
                <span>TORRE: {torre}</span>
              </div>
            )}

            {/* --- HEADER SUPERIOR --- */}
            {!pantallaBlanca && vista === "inicio" && (
              <header className="wl-topbar">
                <div className="wl-topbar-pill">
                  <button type="button" className="wl-topbar-btn is-active" onClick={handleInicioClick}>
                    <span className="material-symbols-outlined">home</span> HOME
                  </button>
                  <span className="wl-topbar-sep" />
                  <button type="button" className="wl-topbar-btn btn-exit" onClick={cerrarSesion}>
                    <span className="material-symbols-outlined">logout</span> SALIR
                  </button>
                </div>
              </header>
            )}

            {mostrarSelector ? (
              <TorreSelector onSelect={handleTorreSeleccionadaConSubmenu} />
            ) : mostrarBienvenida ? (
              (() => {
                const fecha = ahora.toLocaleDateString("es-CO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                const horaTexto = ahora.toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });
                const primerNombre = (usuario.nombre || "").trim().split(/\s+/)[0] || "USUARIO";
                return (
                  <section className="wl-hero">
                    <div className="wl-chip">
                      <span className="wl-chip-dot" />
                      <span className="material-symbols-outlined wl-chip-icon">calendar_month</span>
                      <span className="wl-chip-text">{fecha}</span>
                      <span className="wl-chip-sep" />
                      <span className="material-symbols-outlined wl-chip-icon">schedule</span>
                      <span className="wl-chip-text">{horaTexto}</span>
                    </div>

                    <div className="wl-badge">
                      <span className="material-symbols-outlined">bolt</span>
                    </div>

                    <h2 className="wl-title">
                      BIENVENIDO {primerNombre.toUpperCase()}
                    </h2>

                    <p className="wl-subtitle">SELECCIONA TU TORRE PARA COMENZAR</p>

                    <button type="button" onClick={handleAbrirMenuConTorre} className="wl-cta">
                      <span>SELECCIONA TU TORRE</span>
                      <span className="material-symbols-outlined wl-cta-arrow">arrow_forward</span>
                    </button>
                  </section>
                );
              })()
            ) : (
              // Contenido restante...
              <div className="flex-1 w-full overflow-auto">
                {pantallaBlanca ? (
                  <div className="pantalla-blanca"></div>
                ) : vista === "inicio" ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <h1 className="welcome-title text-neon-glow">HOLA, {usuario.nombre?.toUpperCase()}</h1>
                  </div>
                ) : modoB2B && !torre ? (
                  <TorreSelector onSelect={handleTorreSeleccionadaConSubmenu} />
                ) : vistaEspecial === "notasAvances" ? (
                  <NotasAvances torre={torre} />
                ) : vistaEspecial === "notasConciliacion" ? (
                  <NotasConciliacion torre={torre} />
                ) : vistaEspecial === "notasSeguimiento" || vistaEspecial === "plantillas" ? (
                  <PlantillaSelector torre={torre} onSelect={() => { }} />
                ) : vistaEspecial === "plantillasAdicionales" ? (
                  <PlantillasAdicionales torre={torre} />
                ) : vistaEspecial === "alarma" ? (
                  <Alarma />
                ) : vistaEspecial === "aplicativos" ? (
                  <Aplicativos torre={torre} />
                ) : vistaEspecial === "plantillasCorreo" ? (
                  <PlantillasCorreo />
                ) : (
                  !modoB2B && !torre && tipoNota && (
                    <TorreSelector onSelect={handleTorreSeleccionadaConSubmenu} />
                  )
                )}
              </div>
            )}
          </main>

        </>
      )}
    </div>
  );
}
"use client";

import React, { useEffect, useState } from "react";
import "../styles/alarma.css";

interface AlarmaItem {
  hora: string;
  nombre: string;
  sonido?: string;
}

interface SonidoPersonalizado {
  nombre: string;
  url: string;
}

const Alarma: React.FC = () => {
  const [nuevaHora, setNuevaHora] = useState<string>("");
  const [nombreAlarma, setNombreAlarma] = useState<string>("");
  const [sonidoPredeterminado] = useState<string>("/Sonidos/default.mp3");
  const [sonidoSeleccionado, setSonidoSeleccionado] = useState<string>("/Sonidos/default.mp3");
  const [archivoNombre, setArchivoNombre] = useState<string>("");
  const [arrastrando, setArrastrando] = useState<boolean>(false);
  const [audioEnReproduccion, setAudioEnReproduccion] = useState<HTMLAudioElement | null>(null);
  const [currentAlarmaActiva, setCurrentAlarmaActiva] = useState<AlarmaItem | null>(null);

  const [sonidos, setSonidos] = useState<SonidoPersonalizado[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const guardados = localStorage.getItem("sonidos");
      return guardados ? JSON.parse(guardados) : [];
    } catch {
      return [];
    }
  });

  const [alarmas, setAlarmas] = useState<AlarmaItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const guardadas = localStorage.getItem("alarmas");
      return guardadas ? JSON.parse(guardadas) : [];
    } catch (e) {
      console.error("❌ Error leyendo alarmas:", e);
      return [];
    }
  });

  const [activadas, setActivadas] = useState<number[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem("alarmas", JSON.stringify(alarmas));
    } catch (e) {
      console.error("Error guardando alarmas:", e);
    }
  }, [alarmas]);

  const detenerAlarma = () => {
    if (audioEnReproduccion) {
      audioEnReproduccion.pause();
      audioEnReproduccion.currentTime = 0;
      setAudioEnReproduccion(null);
    }
    setCurrentAlarmaActiva(null);
  };

  const activarAlarma = (alarma: AlarmaItem) => {
    setCurrentAlarmaActiva(alarma);

    const sonidoURL =
      alarma.sonido?.startsWith("blob:") || alarma.sonido?.startsWith("/Sonidos/")
        ? alarma.sonido
        : sonidoPredeterminado;

    const audio = new Audio(sonidoURL);
    audio.loop = true;
    audio.play().catch((e) => console.error("Error reproduciendo sonido:", e));
    setAudioEnReproduccion(audio);
  };

  useEffect(() => {
    const intervalo = setInterval(() => {
      const ahora = new Date();
      const horaActual = ahora.toTimeString().slice(0, 5);

      alarmas.forEach((alarma, index) => {
        if (alarma.hora === horaActual && !activadas.includes(index)) {
          activarAlarma(alarma);
          setActivadas((prev) => [...prev, index]);
        }
      });
    }, 1000);

    return () => clearInterval(intervalo);
  }, [alarmas, activadas]);

  const procesarArchivoAudio = (file: File) => {
    if (!["audio/mpeg", "audio/wav", "audio/ogg"].includes(file.type)) {
      alert("Por favor, sube un archivo MP3, WAV u OGG.");
      return;
    }

    const url = URL.createObjectURL(file);
    const nuevoSonido: SonidoPersonalizado = {
      nombre: file.name,
      url,
    };

    const actualizados = [...sonidos, nuevoSonido];
    setSonidos(actualizados);
    localStorage.setItem("sonidos", JSON.stringify(actualizados));
    setSonidoSeleccionado(url);
    setArchivoNombre(file.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    procesarArchivoAudio(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivoAudio(file);
  };

  const agregarAlarma = () => {
    if (!nuevaHora) {
      alert("Por favor, selecciona una hora.");
      return;
    }

    const nueva: AlarmaItem = {
      hora: nuevaHora,
      nombre: nombreAlarma.trim() || "Alarma sin nombre",
      sonido: sonidoSeleccionado,
    };

    setAlarmas((prev) => [...prev, nueva]);
    setNuevaHora("");
    setNombreAlarma("");
    setSonidoSeleccionado("/Sonidos/default.mp3");
    setArchivoNombre("");
  };

  const eliminarAlarma = (index: number) => {
    if (confirm("¿Estás seguro de eliminar esta alarma?")) {
      setAlarmas((prev) => prev.filter((_, i) => i !== index));
      setActivadas((prev) => prev.filter((i) => i !== index));
    }
  };

  const eliminarSonidoPersonalizado = (index: number) => {
    const actualizados = sonidos.filter((_, i) => i !== index);
    setSonidos(actualizados);
    localStorage.setItem("sonidos", JSON.stringify(actualizados));

    if (sonidoSeleccionado === sonidos[index].url) {
      setSonidoSeleccionado("/Sonidos/default.mp3");
    }
  };

  return (
    <div className="alarm-wrapper">
      <div className="alarm-wrapper-inner">
        {/* ============================================================ */}
        {/* COLUMNA IZQUIERDA: GESTIÓN DE ALARMAS                        */}
        {/* ============================================================ */}
        <section className="alarm-card">
          {/* Encabezado */}
          <div className="alarm-header">
            <div className="alarm-header-icon">
              <span className="material-symbols-outlined">notifications</span>
            </div>
            <div className="alarm-header-text">
              <h1>Gestión de alarmas</h1>
              <p>Crea y administra tus alarmas personalizadas</p>
            </div>
          </div>

          <div className="alarm-form">
            {/* Sección: Hora y Nombre */}
            <div className="form-section">
              <label className="section-label" htmlFor="alarm-time">
                <span className="material-symbols-outlined">schedule</span>
                <span>HORA Y NOMBRE</span>
              </label>
              <div className="input-vertical-group">
                <div className="alarm-input-wrap">
                  <span className="material-symbols-outlined alarm-input-icon">schedule</span>
                  <input
                    id="alarm-time"
                    type="time"
                    value={nuevaHora}
                    onChange={(e) => setNuevaHora(e.target.value)}
                    className="input-field input-time"
                  />
                </div>
                <div className="alarm-input-wrap">
                  <span className="material-symbols-outlined alarm-input-icon">notifications</span>
                  <input
                    type="text"
                    placeholder="Ej: Reunión importante"
                    value={nombreAlarma}
                    onChange={(e) => setNombreAlarma(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Sección: Sonido de alarma */}
            <div className="form-section">
              <label className="section-label" htmlFor="sound-select">
                <span className="material-symbols-outlined">volume_up</span>
                <span>SONIDO DE ALARMA</span>
              </label>
              <div className="alarm-select-wrap">
                <select
                  id="sound-select"
                  value={sonidoSeleccionado}
                  onChange={(e) => setSonidoSeleccionado(e.target.value)}
                  className="sound-select"
                >
                  <option value="/Sonidos/default.mp3">Sonido predeterminado</option>
                  {sonidos.map((s, index) => (
                    <option key={index} value={s.url}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined alarm-select-chevron">expand_more</span>
              </div>
            </div>

            {/* Sección: Agregar sonido personalizado */}
            <div className="form-section">
              <label className="section-label is-muted">AGREGAR SONIDO PERSONALIZADO</label>
              <div
                className={`drop-zone ${arrastrando ? "is-dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastrando(true);
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="file-input-hidden"
                  accept="audio/mpeg, audio/wav, audio/ogg"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="drop-zone-label">
                  <div className="drop-zone-icon-box">
                    <span className="material-symbols-outlined">cloud_upload</span>
                  </div>
                  <p className="drop-zone-title">
                    Haz clic para subir o arrastra el archivo de audio
                  </p>
                  <span className="drop-zone-formats">MP3, WAV u OGG</span>
                  <span className="drop-zone-pill">
                    {archivoNombre || "Sin archivo seleccionado"}
                  </span>
                </label>
              </div>
            </div>

            {/* Lista de sonidos personalizados cargados */}
            {sonidos.length > 0 && (
              <div className="sounds-list-section">
                <h4 className="sounds-list-title">
                  <span className="material-symbols-outlined">library_music</span>
                  <span>Sonidos personalizados</span>
                </h4>
                <ul className="sonidos-lista">
                  {sonidos.map((s, index) => (
                    <li key={index} className="sonido-item">
                      <span>{s.nombre}</span>
                      <button
                        type="button"
                        onClick={() => eliminarSonidoPersonalizado(index)}
                        className="btn-icon-only"
                        title="Eliminar sonido"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Botón principal */}
            <button type="button" onClick={agregarAlarma} className="add-alarm-btn">
              <span className="material-symbols-outlined">add</span>
              <span>AGREGAR ALARMA</span>
            </button>
          </div>
        </section>

        {/* ============================================================ */}
        {/* COLUMNA DERECHA: ALARMAS PROGRAMADAS                         */}
        {/* ============================================================ */}
        <section className="alarm-panel-right">
          <div className="alarm-right-header">
            <h2 className="alarm-right-title">Alarmas programadas</h2>
            <span className="alarm-count-badge">{alarmas.length}</span>
          </div>

          {alarmas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-bell-circle">
                <span className="material-symbols-outlined">notifications</span>
              </div>
              <h3>No hay alarmas programadas</h3>
              <p>Crea tu primera alarma con el formulario de la izquierda.</p>
            </div>
          ) : (
            <ul className="alarma-lista">
              {alarmas.map((alarma, index) => (
                <li key={index} className="alarma-item">
                  <div className="alarma-item-content">
                    <div className="alarma-item-icon">
                      <span className="material-symbols-outlined">alarm</span>
                    </div>
                    <div className="alarma-item-info">
                      <p className="alarma-hora">{alarma.hora}</p>
                      <p className="alarma-nombre">{alarma.nombre}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarAlarma(index)}
                    className="alarma-eliminar"
                    title="Eliminar alarma"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Overlay de Alarma Activa */}
      {currentAlarmaActiva && (
        <div className="alarma-overlay" onClick={detenerAlarma}>
          <div className="overlay-content">
            <div className="overlay-icon">
              <span className="material-symbols-outlined">notifications_active</span>
            </div>
            <h2 className="overlay-title">{currentAlarmaActiva.nombre}</h2>
            <p className="overlay-time">{currentAlarmaActiva.hora}</p>
            <p className="overlay-instruction">CLICK EN CUALQUIER LUGAR PARA DETENER</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alarma;

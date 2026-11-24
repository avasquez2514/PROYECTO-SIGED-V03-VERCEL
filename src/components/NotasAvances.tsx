"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { manejarSesionExpirada } from "../lib/sesion";
import "../styles/notasAvances.css";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export interface Nota {
  id: string;
  plantilla_id: string;
  texto: string;
  favorito?: boolean;
}

interface NotasAvancesProps {
  torre?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const STORAGE_KEY_ORDEN = "siged_notas_avances_orden";
const STORAGE_KEY_FAVORITOS = "siged_notas_avances_favoritos";

const NotasAvances: React.FC<NotasAvancesProps> = ({ torre }) => {
  const [notasAvance, setNotasAvance] = useState<Nota[]>([]);
  const [ordenNotas, setOrdenNotas] = useState<string[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [textoNota, setTextoNota] = useState("");
  const [esFavoritoForm, setEsFavoritoForm] = useState(false);
  const [notaActual, setNotaActual] = useState<Nota | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [tabActiva, setTabActiva] = useState<"todas" | "favoritas">("todas");

  useEffect(() => {
    setMounted(true);
  }, []);

  const prefijo = torre ? `Gestión-MOC-Torre ${torre}:\n\n` : "";

  const cargarNotas = useCallback(async () => {
    setCargando(true);
    const usuario = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("usuario") || "null") : null;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const usuario_id = usuario?.id;

    if (!usuario_id || !token) {
      setNotasAvance([]);
      setCargando(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/notas/avances/${usuario_id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) {
        manejarSesionExpirada();
        return;
      }

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const filtradas: Nota[] = Array.isArray(data)
        ? data
            .filter((n: any) => n.nota_avances?.trim())
            .map((n: any) => ({
              id: String(n.id),
              plantilla_id: String(n.plantilla_id || n.id),
              texto: n.nota_avances,
            }))
        : [];

      setNotasAvance(filtradas);
    } catch (err) {
      console.error("Error cargando notas de avance desde la base de datos:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarNotas();
  }, [cargarNotas]);

  // Cargar orden de notas
  useEffect(() => {
    try {
      const ordenGuardada = localStorage.getItem(STORAGE_KEY_ORDEN);
      if (ordenGuardada) {
        const parsed = JSON.parse(ordenGuardada) as string[];
        const idsExistentes = notasAvance.map((n) => n.id);
        const ordenValida = parsed.filter((id) => idsExistentes.includes(id));
        const nuevasIds = idsExistentes.filter((id) => !ordenValida.includes(id));
        setOrdenNotas([...ordenValida, ...nuevasIds]);
      } else {
        setOrdenNotas(notasAvance.map((n) => n.id));
      }

      const favsGuardados = localStorage.getItem(STORAGE_KEY_FAVORITOS);
      if (favsGuardados) {
        setFavoritos(JSON.parse(favsGuardados));
      } else {
        const favsIniciales = notasAvance.filter((n) => n.favorito).map((n) => n.id);
        if (favsIniciales.length > 0) setFavoritos(favsIniciales);
      }
    } catch (e) {
      console.error("Error cargando configuración:", e);
    }
  }, [notasAvance]);

  // Guardar orden
  useEffect(() => {
    if (ordenNotas.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_ORDEN, JSON.stringify(ordenNotas));
      } catch (e) {
        console.error("Error guardando orden:", e);
      }
    }
  }, [ordenNotas]);

  // Copiar nota al portapapeles
  const copiarNota = (texto: string, id: string) => {
    const contenido = prefijo ? `${prefijo}${texto}` : texto;
    navigator.clipboard
      .writeText(contenido)
      .then(() => {
        setCopiadoId(id);
        setTimeout(() => setCopiadoId((curr) => (curr === id ? null : curr)), 1600);
      })
      .catch((err) => console.error("Error al copiar: ", err));
  };

  // Alternar favorito (preferencia visual)
  const toggleFavorito = (id: string) => {
    const nuevosFavoritos = favoritos.includes(id)
      ? favoritos.filter((fid) => fid !== id)
      : [...favoritos, id];

    setFavoritos(nuevosFavoritos);
    try {
      localStorage.setItem(STORAGE_KEY_FAVORITOS, JSON.stringify(nuevosFavoritos));
    } catch (e) {
      console.error("Error guardando favoritos:", e);
    }
  };

  // Eliminar nota en PostgreSQL
  const eliminarNota = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar esta nota de avance?")) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      manejarSesionExpirada();
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/notas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        manejarSesionExpirada();
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.mensaje || `Error ${res.status}`);
      }

      setOrdenNotas((prev) => prev.filter((oid) => oid !== id));
      setFavoritos((prev) => prev.filter((fid) => fid !== id));
      await cargarNotas();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      alert(`No se pudo eliminar la nota: ${msg}`);
    }
  };

  // Modal Abrir Agregar
  const abrirModalAgregar = () => {
    setTextoNota("");
    setNotaActual(null);
    setEsFavoritoForm(false);
    setModalOpen(true);
  };

  // Modal Abrir Modificar
  const abrirModalModificar = (nota: Nota) => {
    setTextoNota(nota.texto);
    setNotaActual(nota);
    setEsFavoritoForm(favoritos.includes(nota.id));
    setModalOpen(true);
  };

  // Guardar Nota (Crear o Editar) directamente en PostgreSQL
  const guardarNota = async () => {
    const textoLimpio = textoNota.trim();
    if (!textoLimpio) {
      alert("Por favor escribe el contenido de la nota.");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const usuario = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("usuario") || "null") : null;
    const usuario_id = usuario?.id;

    if (!token || !usuario_id) {
      manejarSesionExpirada();
      return;
    }

    setGuardando(true);
    try {
      if (notaActual) {
        const res = await fetch(`${API_URL}/api/notas/plantilla/${notaActual.plantilla_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nota_avances: textoLimpio,
          }),
        });

        if (res.status === 401 || res.status === 403) {
          manejarSesionExpirada();
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.mensaje || `Error ${res.status}`);
        }

        if (esFavoritoForm && !favoritos.includes(notaActual.id)) {
          const nuevosFavs = [...favoritos, notaActual.id];
          setFavoritos(nuevosFavs);
          localStorage.setItem(STORAGE_KEY_FAVORITOS, JSON.stringify(nuevosFavs));
        } else if (!esFavoritoForm && favoritos.includes(notaActual.id)) {
          const nuevosFavs = favoritos.filter((id) => id !== notaActual.id);
          setFavoritos(nuevosFavs);
          localStorage.setItem(STORAGE_KEY_FAVORITOS, JSON.stringify(nuevosFavs));
        }
      } else {
        const res = await fetch(`${API_URL}/api/notas`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            novedad: `Nota de Avance - ${Date.now()}`,
            nota_avances: textoLimpio,
          }),
        });

        if (res.status === 401 || res.status === 403) {
          manejarSesionExpirada();
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.mensaje || `Error ${res.status}`);
        }

        const created = await res.json().catch(() => null);
        if (created?.id) {
          const idReal = String(created.id);
          setOrdenNotas((prev) => [idReal, ...prev]);
          if (esFavoritoForm) {
            const nuevosFavs = [idReal, ...favoritos];
            setFavoritos(nuevosFavs);
            localStorage.setItem(STORAGE_KEY_FAVORITOS, JSON.stringify(nuevosFavs));
          }
        }
      }

      setModalOpen(false);
      await cargarNotas();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      alert(`No se pudo guardar la nota en la base de datos: ${msg}`);
    } finally {
      setGuardando(false);
    }
  };

  // Drag and drop reordering
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;

    const items = Array.from(ordenNotas);
    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(destinationIndex, 0, reorderedItem);
    setOrdenNotas(items);
  };

  // Notas estructuradas con estado de favoritos
  const notasMapeadas = useMemo(() => {
    const map = new Map<string, Nota>();
    notasAvance.forEach((n) => map.set(n.id, n));

    const ordenadas: (Nota & { favorito: boolean })[] = [];
    const vistas = new Set<string>();

    ordenNotas.forEach((id) => {
      const nota = map.get(id);
      if (nota) {
        ordenadas.push({ ...nota, favorito: favoritos.includes(id) });
        vistas.add(id);
      }
    });

    notasAvance.forEach((n) => {
      if (!vistas.has(n.id)) {
        ordenadas.push({ ...n, favorito: favoritos.includes(n.id) });
      }
    });

    return ordenadas;
  }, [notasAvance, ordenNotas, favoritos]);

  // Conteo total y conteo de favoritos
  const totalNotas = notasAvance.length;
  const totalFavoritas = favoritos.filter((id) => notasAvance.some((n) => n.id === id)).length;

  // Filtrado por tab y por búsqueda de texto
  const notasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return notasMapeadas.filter((n) => {
      if (tabActiva === "favoritas" && !n.favorito) return false;
      if (!q) return true;
      return n.texto.toLowerCase().includes(q);
    });
  }, [notasMapeadas, tabActiva, busqueda]);

  return (
    <div className="na-view">
      <div className="na-container">
        {/* ============================================================ */}
        {/* 1. HEADER PRINCIPAL                                          */}
        {/* ============================================================ */}
        <header className="na-header">
          <div className="na-title-box">
            <div className="na-icon-badge">
              <span className="material-symbols-outlined">description</span>
            </div>
            <div>
              <h1 className="na-title">Notas de avances</h1>
              <p className="na-subtitle">Guarda tus notas y comentarios de campo y cópialos con un clic.</p>
            </div>
          </div>

          <button type="button" onClick={abrirModalAgregar} className="na-btn-add">
            <span className="material-symbols-outlined">add</span>
            <span>Agregar nota</span>
          </button>
        </header>

        {/* ============================================================ */}
        {/* 2. BARRA DE BÚSQUEDA Y TABS SEGMENTADAS                      */}
        {/* ============================================================ */}
        <section className="na-controls-row">
          {/* Buscador */}
          <div className="na-search-box">
            <span className="material-symbols-outlined na-search-icon">search</span>
            <input
              type="text"
              placeholder="Buscar en notas de avances"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="na-search-input"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="na-search-clear"
                title="Limpiar búsqueda"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* Segmented Tabs: Todas / Favoritas */}
          <div className="na-tabs-pill">
            <button
              type="button"
              className={`na-tab-btn ${tabActiva === "todas" ? "is-active" : ""}`}
              onClick={() => setTabActiva("todas")}
            >
              <span>Todas</span>
              <span className="na-tab-count">{totalNotas}</span>
            </button>
            <button
              type="button"
              className={`na-tab-btn ${tabActiva === "favoritas" ? "is-active" : ""}`}
              onClick={() => setTabActiva("favoritas")}
            >
              <span className="na-star-icon">★</span>
              <span>Favoritas</span>
              <span className="na-tab-count">{totalFavoritas}</span>
            </button>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. ESTADOS DE CARGA / VACÍO                                  */}
        {/* ============================================================ */}
        {cargando && (
          <div className="na-loading-state">
            <div className="na-spinner"></div>
            <span>Cargando notas de avances...</span>
          </div>
        )}

        {!cargando && notasFiltradas.length === 0 && (
          <div className="na-empty-state">
            <span className="material-symbols-outlined">search_off</span>
            <strong className="na-empty-title">
              {tabActiva === "favoritas"
                ? "No tienes notas marcadas como favoritas"
                : "No se encontraron notas de avances"}
            </strong>
            <p className="na-empty-desc">
              {busqueda
                ? `No hay coincidencias con «${busqueda}».`
                : tabActiva === "favoritas"
                ? "Marca con una estrella ★ tus notas más usadas para verlas aquí."
                : "Usa el botón «+ Agregar nota» para registrar tu primer avance."}
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. GRID DE TARJETAS (3 COLUMNAS EXACTAS)                     */}
        {/* ============================================================ */}
        {!cargando && notasFiltradas.length > 0 && (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="na-cards-grid">
              {(provided) => (
                <div
                  className="na-grid-cards"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {notasFiltradas.map((nota, index) => {
                    const esCopiado = copiadoId === nota.id;
                    const esFav = !!nota.favorito;

                    return (
                      <Draggable key={nota.id} draggableId={nota.id} index={index}>
                        {(dragProvided) => (
                          <article
                            className={`na-card ${esFav ? "is-fav" : ""}`}
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            {/* Parte Superior: Texto + Estrella de Favorito */}
                            <div className="na-card-top">
                              <p className="na-card-text">{nota.texto}</p>
                              <button
                                type="button"
                                className={`na-star-btn ${esFav ? "is-active" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorito(nota.id);
                                }}
                                title={esFav ? "Quitar de favoritas" : "Marcar como favorita"}
                                aria-label="Favorito"
                              >
                                <span className="material-symbols-outlined">
                                  {esFav ? "star" : "grade"}
                                </span>
                              </button>
                            </div>

                            {/* Parte Inferior: Botón Copiar a la izquierda, Editar y Eliminar a la derecha */}
                            <div className="na-card-bottom">
                              <button
                                type="button"
                                onClick={() => copiarNota(nota.texto, nota.id)}
                                className={`na-btn-copy ${esCopiado ? "is-copied" : ""}`}
                                title="Copiar texto de la nota"
                              >
                                <span className="material-symbols-outlined">
                                  {esCopiado ? "check" : "content_copy"}
                                </span>
                                <span>{esCopiado ? "¡Copiado!" : "Copiar"}</span>
                              </button>

                              <div className="na-card-actions-right">
                                <button
                                  type="button"
                                  onClick={() => abrirModalModificar(nota)}
                                  className="na-action-icon-btn"
                                  title="Editar nota"
                                  aria-label="Editar"
                                >
                                  <span className="material-symbols-outlined">edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => eliminarNota(nota.id)}
                                  className="na-action-icon-btn btn-delete"
                                  title="Eliminar nota"
                                  aria-label="Eliminar"
                                >
                                  <span className="material-symbols-outlined">delete</span>
                                </button>
                              </div>
                            </div>
                          </article>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. MODAL AGREGAR / EDITAR NOTA (PORTAL FIDELIDAD 1:1)         */}
      {/* ============================================================ */}
      {modalOpen &&
        mounted &&
        createPortal(
          <div
            className="na-modal-backdrop"
            onClick={() => setModalOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="na-modal-card" onClick={(e) => e.stopPropagation()}>
              {/* Header Modal */}
              <div className="na-modal-header">
                <div className="na-modal-header-left">
                  <div className="na-modal-icon-badge">
                    <span className="material-symbols-outlined">edit_note</span>
                  </div>
                  <div className="na-modal-titles">
                    <h2 className="na-modal-title">
                      {notaActual ? "Modificar nota de avance" : "Nueva nota de avance"}
                    </h2>
                    <p className="na-modal-subtitle">
                      {notaActual
                        ? "Actualiza el contenido de tu nota de campo."
                        : "Registra una nota frecuente para copiarla con un solo clic."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="na-modal-close-btn"
                  onClick={() => setModalOpen(false)}
                  aria-label="Cerrar modal"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Formulario Modal */}
              <form
                className="na-modal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  guardarNota();
                }}
              >
                <div className="na-modal-field">
                  <label className="na-modal-label">
                    Contenido de la nota <span className="na-required">*</span>
                  </label>
                  <textarea
                    rows={5}
                    className="na-modal-textarea"
                    placeholder="Escribe el texto de la nota aquí..."
                    value={textoNota}
                    onChange={(e) => setTextoNota(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        guardarNota();
                      }
                    }}
                    autoFocus
                    required
                  />
                  <div className="na-modal-meta">
                    <span>
                      <kbd>Ctrl</kbd> + <kbd>Enter</kbd> para guardar
                    </span>
                    <span>{textoNota.length} caracteres</span>
                  </div>
                </div>

                {/* Switch de Favorita */}
                <div className="na-modal-field">
                  <button
                    type="button"
                    className={`na-fav-card ${esFavoritoForm ? "is-on" : ""}`}
                    onClick={() => setEsFavoritoForm(!esFavoritoForm)}
                    aria-pressed={esFavoritoForm}
                  >
                    <span className="na-fav-card-icon">
                      <span className="material-symbols-outlined">
                        {esFavoritoForm ? "star" : "grade"}
                      </span>
                    </span>
                    <span className="na-fav-card-text">
                      <strong>Nota favorita</strong>
                      <small>Se resalta en dorado y aparece en la pestaña Favoritas</small>
                    </span>
                    <span className="na-switch">
                      <span className="na-switch-knob" />
                    </span>
                  </button>
                </div>

                {/* Footer Modal */}
                <div className="na-modal-footer">
                  <button
                    type="button"
                    className="na-btn-modal-cancel"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="na-btn-modal-save">
                    <span className="material-symbols-outlined">check</span>
                    <span>{notaActual ? "Guardar cambios" : "Guardar nota"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.getElementById("modal-root") || document.body
        )}
    </div>
  );
};

export default NotasAvances;

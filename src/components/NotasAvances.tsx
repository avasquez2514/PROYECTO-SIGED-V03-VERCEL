"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import "../styles/notasAvances.css";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export interface Nota {
  id: string;
  plantilla_id?: string;
  texto: string;
  favorito?: boolean;
}

interface NotasAvancesProps {
  torre?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const STORAGE_KEY_NOTAS = "siged_notas_avances_data";
const STORAGE_KEY_ORDEN = "siged_notas_avances_orden";
const STORAGE_KEY_FAVORITOS = "siged_notas_avances_favoritos";

// 12 notas predeterminadas idénticas a la imagen de referencia oficial
const NOTAS_DEFAULT: Nota[] = [
  {
    id: "nota-1",
    plantilla_id: "p-1",
    texto: "Cordial saludo, se cancela visita por solicitud del cliente.",
    favorito: true,
  },
  {
    id: "nota-2",
    plantilla_id: "p-2",
    texto: "Se continúa a la espera de llegada de equipo, último avance por parte de inventarios:",
    favorito: false,
  },
  {
    id: "nota-3",
    plantilla_id: "p-3",
    texto: "Buen día,\n\nSe confirma personal:",
    favorito: false,
  },
  {
    id: "nota-4",
    plantilla_id: "p-4",
    texto: "Buen día compañeros, por favor validar si es necesaria la visita y validar fluido eléctrico en la sede. Quedamos atentos para coordinar la visita.",
    favorito: false,
  },
  {
    id: "nota-5",
    plantilla_id: "p-5",
    texto: "Caso se encuentra pendiente para escalamiento a infraestructura.",
    favorito: false,
  },
  {
    id: "nota-6",
    plantilla_id: "p-6",
    texto: "Por solicitud de TIGO, se dejará de atender este incidente en la franja pactada con el usuario, para darle prioridad al incidente INCXXXXXXXXX.",
    favorito: false,
  },
  {
    id: "nota-7",
    plantilla_id: "p-7",
    texto: "Nuestro personal en campo informa que el local está cerrado, se llama al cliente y no contesta, se valida desde la MOC y no es posible comunicarse con el cliente, por tal motivo la orden queda pendiente.",
    favorito: false,
  },
  {
    id: "nota-8",
    plantilla_id: "p-8",
    texto: "Reparador OTDR: ELIAN SANDOVAL\nPrueba OTDR: Con novedad\nDescripción de falla: se realiza medición con equipo OTDR, encontrando evento.",
    favorito: false,
  },
  {
    id: "nota-9",
    plantilla_id: "p-9",
    texto: "Nuestro personal informa que está a la espera de permisos de ingreso por parte del cliente.",
    favorito: false,
  },
  {
    id: "nota-10",
    plantilla_id: "p-10",
    texto: "Se realiza prueba de enlace y se valida continuidad del servicio con el cliente en sede.",
    favorito: false,
  },
  {
    id: "nota-11",
    plantilla_id: "p-11",
    texto: "Visita reprogramada por condiciones climáticas adversas en la zona de trabajo.",
    favorito: false,
  },
  {
    id: "nota-12",
    plantilla_id: "p-12",
    texto: "Incidente cerrado exitosamente tras restablecimiento de energía en el nodo principal.",
    favorito: false,
  },
];

const NotasAvances: React.FC<NotasAvancesProps> = ({ torre }) => {
  const [notasAvance, setNotasAvance] = useState<Nota[]>([]);
  const [ordenNotas, setOrdenNotas] = useState<string[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [textoNota, setTextoNota] = useState("");
  const [esFavoritoForm, setEsFavoritoForm] = useState(false);
  const [notaActual, setNotaActual] = useState<Nota | null>(null);
  const [cargando, setCargando] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [tabActiva, setTabActiva] = useState<"todas" | "favoritas">("todas");

  useEffect(() => {
    setMounted(true);
  }, []);

  const prefijo = torre ? `Gestión-MOC-Torre ${torre}:\n\n` : "";

  // Guardar en localStorage
  const persistirNotas = (notas: Nota[]) => {
    setNotasAvance(notas);
    try {
      localStorage.setItem(STORAGE_KEY_NOTAS, JSON.stringify(notas));
    } catch (e) {
      console.error("Error al persistir notas:", e);
    }
  };

  const cargarNotas = useCallback(async () => {
    setCargando(true);
    const usuario = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("usuario") || "null") : null;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const usuario_id = usuario?.id;

    // 1. Intentar cargar de API si hay sesión activa
    if (usuario_id && token) {
      try {
        const res = await fetch(`${API_URL}/api/notas/avances/${usuario_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const filtradas: Nota[] = data
            .filter((n: any) => n.nota_avances?.trim())
            .map((n: any) => ({
              id: String(n.id),
              plantilla_id: String(n.plantilla_id || n.id),
              texto: n.nota_avances,
            }));
          if (filtradas.length > 0) {
            setNotasAvance(filtradas);
            persistirNotas(filtradas);
            setCargando(false);
            return;
          }
        }
      } catch (err) {
        console.warn("No se pudo cargar desde la API, usando datos locales:", err);
      }
    }

    // 2. Intentar cargar desde localStorage
    try {
      const guardado = localStorage.getItem(STORAGE_KEY_NOTAS);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotasAvance(parsed);
          setCargando(false);
          return;
        }
      }
    } catch (e) {
      console.error("Error leyendo notas de localStorage:", e);
    }

    // 3. Fallback a las 12 notas predeterminadas de la maqueta
    setNotasAvance(NOTAS_DEFAULT);
    persistirNotas(NOTAS_DEFAULT);

    // Inicializar favoritos por defecto (nota-1)
    try {
      const favsGuardados = localStorage.getItem(STORAGE_KEY_FAVORITOS);
      if (!favsGuardados) {
        setFavoritos(["nota-1"]);
        localStorage.setItem(STORAGE_KEY_FAVORITOS, JSON.stringify(["nota-1"]));
      } else {
        setFavoritos(JSON.parse(favsGuardados));
      }
    } catch {
      setFavoritos(["nota-1"]);
    }

    setCargando(false);
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

  // Alternar favorito
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

    // Actualizar también el objeto nota
    const actualizadas = notasAvance.map((n) =>
      n.id === id ? { ...n, favorito: nuevosFavoritos.includes(id) } : n
    );
    persistirNotas(actualizadas);
  };

  // Eliminar nota
  const eliminarNota = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar esta nota de avance?")) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      try {
        await fetch(`${API_URL}/api/notas/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.warn("No se pudo eliminar en el servidor:", error);
      }
    }

    const actualizadas = notasAvance.filter((n) => n.id !== id);
    persistirNotas(actualizadas);
    setOrdenNotas((prev) => prev.filter((oid) => oid !== id));
    setFavoritos((prev) => prev.filter((fid) => fid !== id));
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

  // Guardar Nota (Crear o Editar)
  const guardarNota = async () => {
    const textoLimpio = textoNota.trim();
    if (!textoLimpio) {
      alert("Por favor escribe el contenido de la nota.");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const usuario = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("usuario") || "null") : null;
    const usuario_id = usuario?.id;

    if (notaActual) {
      // Modo Edición
      const actualizadas = notasAvance.map((n) =>
        n.id === notaActual.id ? { ...n, texto: textoLimpio, favorito: esFavoritoForm } : n
      );
      persistirNotas(actualizadas);

      if (esFavoritoForm && !favoritos.includes(notaActual.id)) {
        const nuevosFavs = [...favoritos, notaActual.id];
        setFavoritos(nuevosFavs);
        localStorage.setItem(STORAGE_KEY_FAVORITOS, JSON.stringify(nuevosFavs));
      } else if (!esFavoritoForm && favoritos.includes(notaActual.id)) {
        const nuevosFavs = favoritos.filter((id) => id !== notaActual.id);
        setFavoritos(nuevosFavs);
        localStorage.setItem(STORAGE_KEY_FAVORITOS, JSON.stringify(nuevosFavs));
      }

      if (token && notaActual.plantilla_id) {
        try {
          await fetch(`${API_URL}/api/notas/plantilla/${notaActual.plantilla_id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              novedad: `Nota de Avance - ${new Date().toLocaleDateString()}`,
              nota_avances: textoLimpio,
            }),
          });
        } catch (e) {
          console.warn("No se pudo sincronizar edición con servidor:", e);
        }
      }
    } else {
      // Modo Nueva Nota
      const nuevoId = `nota-${Date.now()}`;
      const nueva: Nota = {
        id: nuevoId,
        plantilla_id: nuevoId,
        texto: textoLimpio,
        favorito: esFavoritoForm,
      };

      const nuevasNotas = [nueva, ...notasAvance];
      persistirNotas(nuevasNotas);
      setOrdenNotas([nuevoId, ...ordenNotas]);

      if (esFavoritoForm) {
        const nuevosFavs = [nuevoId, ...favoritos];
        setFavoritos(nuevosFavs);
        localStorage.setItem(STORAGE_KEY_FAVORITOS, JSON.stringify(nuevosFavs));
      }

      if (token && usuario_id) {
        try {
          await fetch(`${API_URL}/api/notas`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              novedad: `Nota de Avance - ${new Date().toLocaleDateString()}`,
              nota_avances: textoLimpio,
              usuario_id,
            }),
          });
        } catch (e) {
          console.warn("No se pudo sincronizar creación con servidor:", e);
        }
      }
    }

    setModalOpen(false);
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

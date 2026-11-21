"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { manejarSesionExpirada } from "../lib/sesion";
import "../styles/plantillasAdicionales.css";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Plantilla {
  id: string;
  relacionId?: string;
  nombre: string;
  texto: string;
}

interface PlantillasAdicionalesProps {
  torre: string;
}

const STORAGE_KEY = "plantillasAdicionalesOrden";

/** Resalta en azul las etiquetas tipo "Campo:" al inicio de cada línea */
const renderTextoFormateado = (texto: string) => {
  const lineas = texto.split("\n");
  return lineas.map((linea, idx) => {
    const match = linea.match(/^([^:\n]{1,70}:)(.*)$/);
    const esUrl = match && match[2].startsWith("//");
    return (
      <React.Fragment key={idx}>
        {match && !esUrl ? (
          <>
            <span className="pa-field-label">{match[1]}</span>
            <span>{match[2]}</span>
          </>
        ) : (
          linea
        )}
        {idx < lineas.length - 1 && "\n"}
      </React.Fragment>
    );
  });
};

const PlantillasAdicionales: React.FC<PlantillasAdicionalesProps> = () => {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [ordenPlantillas, setOrdenPlantillas] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modo, setModo] = useState<"agregar" | "editar">("agregar");
  const [loading, setLoading] = useState(true);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const [formData, setFormData] = useState<{
    id: string | null;
    relacionId: string | null;
    nombre: string;
    texto: string;
  }>({ id: null, relacionId: null, nombre: "", texto: "" });

  const API = `${process.env.NEXT_PUBLIC_API_URL || ""}/api/notas`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [modalOpen]);

  const cargarPlantillas = async () => {
    const token = localStorage.getItem("token");
    const usuarioRaw = localStorage.getItem("usuario");
    const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;

    if (!token || !usuario?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API}/${usuario.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          manejarSesionExpirada();
          return;
        }
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        setPlantillas([]);
        setOrdenPlantillas([]);
        return;
      }

      const filtradas: Plantilla[] = data
        .filter(
          (nota: any) =>
            nota.plantilla?.trim() &&
            !nota.nota_publica?.trim() &&
            !nota.nota_interna?.trim() &&
            !nota.nota_avances?.trim()
        )
        .map((nota: any) => ({
          id: nota.plantilla_id,
          relacionId: nota.id,
          nombre: nota.novedad || "Sin título",
          texto: nota.plantilla,
        }));

      setPlantillas(filtradas);

      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) {
        const ordenGuardada = JSON.parse(guardado) as string[];
        const nuevasPlantillas = filtradas
          .map((p) => p.id)
          .filter((id) => !ordenGuardada.includes(id));
        setOrdenPlantillas([...ordenGuardada, ...nuevasPlantillas]);
      } else {
        setOrdenPlantillas(filtradas.map((p: Plantilla) => p.id));
      }
    } catch (error) {
      console.error("Error al cargar plantillas:", error);
      setPlantillas([]);
      setOrdenPlantillas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPlantillas();
  }, []);

  useEffect(() => {
    if (ordenPlantillas.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ordenPlantillas));
    }
  }, [ordenPlantillas]);

  const copiarPlantilla = (texto: string, id: string) => {
    navigator.clipboard
      .writeText(texto)
      .then(() => {
        setCopiadoId(id);
        setTimeout(() => setCopiadoId((curr) => (curr === id ? null : curr)), 1600);
      })
      .catch((err) => console.error("Error al copiar: ", err));
  };

  const eliminarPlantilla = async (plantillaId: string | null) => {
    if (!plantillaId) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!window.confirm("¿Estás seguro de eliminar esta plantilla?")) return;

    try {
      const response = await fetch(`${API}/plantilla/${plantillaId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
          manejarSesionExpirada();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.mensaje || `Error ${response.status}: ${response.statusText}`);
      }

      await cargarPlantillas();
    } catch (error) {
      console.error("❌ Error al eliminar plantilla:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      alert(`Error al eliminar plantilla: ${errorMessage}`);
    }
  };

  const abrirModalAgregar = () => {
    setModo("agregar");
    setFormData({ id: null, relacionId: null, nombre: "", texto: "" });
    setModalOpen(true);
  };

  const abrirModalEditar = (plantilla: Plantilla) => {
    setModo("editar");
    setFormData({
      id: plantilla.id,
      relacionId: plantilla.relacionId || null,
      nombre: plantilla.nombre,
      texto: plantilla.texto,
    });
    setModalOpen(true);
  };

  const manejarCambio = (
    e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const guardarModal = async () => {
    const token = localStorage.getItem("token");
    const usuarioRaw = localStorage.getItem("usuario");
    const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;

    if (!token || !formData.nombre.trim() || !formData.texto.trim()) return;

    try {
      let response: Response;
      if (modo === "agregar") {
        if (!usuario?.id) return;
        response = await fetch(API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            novedad: formData.nombre.trim(),
            plantilla: formData.texto.trim(),
            usuario_id: usuario.id,
          }),
        });
      } else {
        if (!formData.id) return;
        response = await fetch(`${API}/plantilla/${formData.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            novedad: formData.nombre.trim(),
            plantilla: formData.texto.trim(),
          }),
        });
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
          manejarSesionExpirada();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.mensaje || `Error ${response.status}: ${response.statusText}`);
      }

      setModalOpen(false);
      setFormData({ id: null, relacionId: null, nombre: "", texto: "" });
      await cargarPlantillas();
    } catch (error) {
      console.error("Error al guardar plantilla:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      alert(`Error al guardar plantilla: ${errorMessage}`);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || busqueda.trim()) return;
    const items = Array.from(ordenPlantillas);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setOrdenPlantillas(items);
  };

  const plantillasOrdenadas = ordenPlantillas
    .map((id) => plantillas.find((p: Plantilla) => p.id === id))
    .filter(Boolean) as Plantilla[];

  const plantillasFiltradas = plantillasOrdenadas.filter((p) => {
    if (!busqueda.trim()) return true;
    const term = busqueda.toLowerCase();
    return p.nombre.toLowerCase().includes(term) || p.texto.toLowerCase().includes(term);
  });

  return (
    <div className="plantilla-containerr">
      <div className="plantilla-content">
        {/* Header Principal */}
        <header className="plantilla-header">
          <div className="plantilla-title-section">
            <div className="plantilla-icon">
              <span className="material-symbols-outlined">description</span>
            </div>
            <div className="plantilla-title-text">
              <h1>Plantillas adicionales</h1>
              <p>Gestiona tus plantillas de texto personalizadas</p>
            </div>
          </div>

          <button type="button" className="agregar-button" onClick={abrirModalAgregar}>
            <span className="material-symbols-outlined">add</span>
            <span>Agregar plantilla</span>
          </button>
        </header>

        {/* Barra de búsqueda */}
        <div className="pa-search-box">
          <span className="material-symbols-outlined pa-search-icon">search</span>
          <input
            type="text"
            placeholder="Buscar plantilla por nombre o contenido..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pa-search-input"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="pa-search-clear"
              title="Limpiar búsqueda"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Estado de carga o lista */}
        {loading ? (
          <div className="pa-loading">
            <div className="pa-spinner" />
            <span>Cargando plantillas...</span>
          </div>
        ) : plantillasFiltradas.length === 0 ? (
          <div className="pa-empty-state">
            <span className="material-symbols-outlined">description</span>
            <strong>
              {busqueda
                ? `No se encontraron resultados para «${busqueda}»`
                : "No hay plantillas disponibles"}
            </strong>
            <p>
              {busqueda
                ? "Intenta con otro término o limpia el buscador."
                : "Haz clic en «+ Agregar plantilla» para crear una nueva."}
            </p>
          </div>
        ) : (
          <>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="plantillas-list">
                {(provided) => (
                  <div
                    className="plantilla-list"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {plantillasFiltradas.map((plantilla, index) => {
                      const esCopiado = copiadoId === plantilla.id;
                      return (
                        <Draggable
                          key={plantilla.id}
                          draggableId={plantilla.id}
                          index={index}
                          isDragDisabled={!!busqueda.trim()}
                        >
                          {(dragProvided, snapshot) => (
                            <article
                              className={`plantilla-item ${snapshot.isDragging ? "dragging" : ""}`}
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
                              <h3 className="plantilla-nombre">{plantilla.nombre}</h3>

                              <div className="plantilla-texto-box">
                                <p className="plantilla-texto">{renderTextoFormateado(plantilla.texto)}</p>
                              </div>

                              <div className="plantilla-buttons">
                                <button
                                  type="button"
                                  className={`plantilla-button copy ${esCopiado ? "is-copied" : ""}`}
                                  onClick={() => copiarPlantilla(plantilla.texto, plantilla.id)}
                                  title="Copiar contenido"
                                >
                                  <span className="material-symbols-outlined">
                                    {esCopiado ? "check" : "content_copy"}
                                  </span>
                                  <span>{esCopiado ? "COPIADO" : "COPIAR"}</span>
                                </button>

                                <button
                                  type="button"
                                  className="plantilla-button edit"
                                  onClick={() => abrirModalEditar(plantilla)}
                                  title="Editar plantilla"
                                >
                                  <span className="material-symbols-outlined">edit</span>
                                  <span>EDITAR</span>
                                </button>

                                <button
                                  type="button"
                                  className="plantilla-button clear"
                                  onClick={() => eliminarPlantilla(plantilla.id)}
                                  title="Eliminar plantilla"
                                >
                                  <span className="material-symbols-outlined">delete</span>
                                  <span>ELIMINAR</span>
                                </button>
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

            {/* Footer con contador pill */}
            <div className="plantilla-footer">
              <div className="pa-footer-pill">
                <span>TOTAL DE PLANTILLAS</span>
                <strong>{plantillasOrdenadas.length}</strong>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Agregar / Editar Plantilla */}
      {modalOpen &&
        mounted &&
        createPortal(
          <div
            className="pa-modal-backdrop"
            onClick={() => setModalOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="pa-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="pa-modal-header">
                <div className="pa-modal-header-left">
                  <div className="pa-modal-badge">
                    <span className="material-symbols-outlined">
                      {modo === "agregar" ? "note_add" : "edit_note"}
                    </span>
                  </div>
                  <div>
                    <h2 className="pa-modal-title">
                      {modo === "agregar" ? "Nueva plantilla adicional" : "Editar plantilla"}
                    </h2>
                    <p className="pa-modal-subtitle">
                      {modo === "agregar"
                        ? "Crea una plantilla personalizada para copiarla en un clic."
                        : "Actualiza el título o contenido de esta plantilla."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="pa-modal-close"
                  onClick={() => setModalOpen(false)}
                  aria-label="Cerrar modal"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form
                className="pa-modal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  guardarModal();
                }}
              >
                <div className="pa-modal-field">
                  <label className="pa-modal-label">
                    Título de la plantilla <span className="pa-required">*</span>
                  </label>
                  <input
                    className="pa-modal-input"
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={manejarCambio}
                    placeholder="Ej: Plantilla solicitar inventarios"
                    required
                    autoFocus
                  />
                </div>

                <div className="pa-modal-field">
                  <label className="pa-modal-label">
                    Contenido <span className="pa-required">*</span>
                  </label>
                  <textarea
                    className="pa-modal-textarea"
                    rows={7}
                    name="texto"
                    value={formData.texto}
                    onChange={manejarCambio}
                    placeholder="Escribe el contenido de la plantilla..."
                    required
                  />
                </div>

                <div className="pa-modal-footer">
                  <button
                    type="button"
                    className="pa-btn-cancel"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="pa-btn-save">
                    <span className="material-symbols-outlined">check</span>
                    <span>{modo === "agregar" ? "Guardar plantilla" : "Actualizar"}</span>
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

export default PlantillasAdicionales;

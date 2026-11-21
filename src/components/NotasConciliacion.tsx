"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import "../styles/notasConciliacion.css";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface NotasConciliacionProps {
  torre: string;
}

const STORAGE_KEY = "categoriasConciliacionOrden";

/** Separa el prefijo "CONCILIACION" para mostrarlo como etiqueta y el resto como título limpio */
const formatearCategoria = (texto: string): { etiqueta: string; titulo: string } => {
  const sinPrefijo = texto.replace(/^CONCILIACI[OÓ]N\s+/i, "").trim();
  if (!sinPrefijo || sinPrefijo === texto.trim()) {
    return { etiqueta: "CONCILIACIÓN", titulo: texto.toUpperCase() };
  }
  return { etiqueta: "CONCILIACIÓN", titulo: sinPrefijo.toUpperCase() };
};

const categoriasIniciales = [
  "CONCILIACION EQUIPOS",
  "CONCILIACION MESA",
  "CONCILIACION METRAJE",
  "CONCILIACION HOTELES",
  "CONCILIACION N2/N3",
  "CONCILIACION INVENTARIO",
  "CONCILIACION TIGO",
  "CONCILIACION CLIENTE",
  "CONCILIACION INFRAESTRUCTURA",
  "CONCILIACION CENTROS COMERCIALES",
  "CONCILIACION BMC",
];

const NotasConciliacion: React.FC<NotasConciliacionProps> = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiadoIdx, setCopiadoIdx] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [textoTemporal, setTextoTemporal] = useState("");
  const [indexEditar, setIndexEditar] = useState<number | null>(null);

  const [categorias, setCategorias] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const guardadas = localStorage.getItem(STORAGE_KEY);
        return guardadas ? JSON.parse(guardadas) : categoriasIniciales;
      } catch {
        return categoriasIniciales;
      }
    }
    return categoriasIniciales;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrarModal();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [modalOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categorias));
    } catch (e) {
      console.error("Error guardando categorías de conciliación:", e);
    }
  }, [categorias]);

  const abrirModalAgregar = () => {
    setIndexEditar(null);
    setTextoTemporal("");
    setModalOpen(true);
  };

  const abrirModalModificar = (index: number) => {
    setIndexEditar(index);
    setTextoTemporal(categorias[index]);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setTextoTemporal("");
    setIndexEditar(null);
  };

  const guardarModal = () => {
    const limpio = textoTemporal.trim().toUpperCase();
    if (!limpio) return;

    if (indexEditar !== null) {
      const nuevas = [...categorias];
      nuevas[indexEditar] = limpio;
      setCategorias(nuevas);
    } else {
      if (categorias.includes(limpio)) {
        alert("Esa categoría ya existe.");
        return;
      }
      setCategorias([limpio, ...categorias]);
    }
    cerrarModal();
  };

  const copiarTexto = (texto: string, idx: number) => {
    navigator.clipboard
      .writeText(texto)
      .then(() => {
        setCopiadoIdx(idx);
        setTimeout(() => setCopiadoIdx((curr) => (curr === idx ? null : curr)), 1600);
      })
      .catch((err) => console.error("Error al copiar el texto:", err));
  };

  const eliminarCategoria = (index: number) => {
    const confirmado = window.confirm(`¿Estás seguro de eliminar "${categorias[index]}"?`);
    if (!confirmado) return;
    setCategorias((prev) => prev.filter((_, i) => i !== index));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || busqueda.trim()) return;
    const items = Array.from(categorias);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setCategorias(items);
  };

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return categorias
      .map((cat, idx) => ({ cat, idx }))
      .filter(({ cat }) => !q || cat.toLowerCase().includes(q));
  }, [categorias, busqueda]);

  return (
    <div className="nc-view">
      <div className="nc-container">
        {/* Header Principal */}
        <header className="nc-header">
          <div className="nc-title-box">
            <div className="nc-icon-badge">
              <span className="material-symbols-outlined">assignment_turned_in</span>
            </div>
            <div>
              <h1 className="nc-title">Categorías de conciliación</h1>
              <p className="nc-subtitle">
                Guarda tus textos de conciliación y cópialos con un clic.
              </p>
            </div>
          </div>

          <button type="button" className="nc-btn-add" onClick={abrirModalAgregar}>
            <span className="material-symbols-outlined">add</span>
            <span>Agregar categoría</span>
          </button>
        </header>

        {/* Barra de Búsqueda ancho completo */}
        <div className="nc-search-box">
          <span className="material-symbols-outlined nc-search-icon">search</span>
          <input
            type="text"
            placeholder="Buscar categoría de conciliación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="nc-search-input"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="nc-search-clear"
              title="Limpiar búsqueda"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Grid de Categorías */}
        {filtradas.length === 0 ? (
          <div className="nc-empty-state">
            <span className="material-symbols-outlined">search_off</span>
            <strong>
              {busqueda
                ? `Sin resultados para «${busqueda}»`
                : "No hay categorías registradas"}
            </strong>
            <p>
              {busqueda
                ? "Intenta con otro término o limpia el buscador."
                : "Usa el botón «+ Agregar categoría» para crear la primera."}
            </p>
          </div>
        ) : (
          <>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="nc-categorias-grid">
                {(provided) => (
                  <div
                    className="nc-grid"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {filtradas.map(({ cat, idx }, dragIndex) => {
                      const esCopiado = copiadoIdx === idx;
                      const { etiqueta, titulo } = formatearCategoria(cat);
                      return (
                        <Draggable
                          key={cat}
                          draggableId={cat}
                          index={dragIndex}
                          isDragDisabled={!!busqueda.trim()}
                        >
                          {(dragProvided, snapshot) => (
                            <article
                              className={`nc-card ${snapshot.isDragging ? "is-dragging" : ""}`}
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
                              <div className="nc-card-head">
                                <span className="nc-card-eyebrow">{etiqueta}</span>
                                <h3 className="nc-card-title">{titulo}</h3>
                              </div>

                              <div className="nc-card-bottom">
                                <button
                                  type="button"
                                  onClick={() => copiarTexto(cat, idx)}
                                  className={`nc-btn-copy ${esCopiado ? "is-copied" : ""}`}
                                  title={`Copiar: ${cat}`}
                                >
                                  <span className="material-symbols-outlined">
                                    {esCopiado ? "check" : "content_copy"}
                                  </span>
                                  <span>{esCopiado ? "Copiado" : "Copiar"}</span>
                                </button>

                                <div className="nc-card-actions-right">
                                  <button
                                    type="button"
                                    onClick={() => abrirModalModificar(idx)}
                                    className="nc-action-icon-btn"
                                    title="Editar categoría"
                                    aria-label="Editar"
                                  >
                                    <span className="material-symbols-outlined">edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => eliminarCategoria(idx)}
                                    className="nc-action-icon-btn btn-delete"
                                    title="Eliminar categoría"
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

            {/* Footer Pill centrado */}
            <div className="nc-footer">
              <div className="nc-footer-pill">
                <span>TOTAL DE CATEGORÍAS</span>
                <strong>{categorias.length}</strong>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Agregar / Editar Categoría */}
      {modalOpen &&
        mounted &&
        createPortal(
          <div
            className="nc-modal-backdrop"
            onClick={cerrarModal}
            role="dialog"
            aria-modal="true"
          >
            <div className="nc-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="nc-modal-header">
                <div className="nc-modal-header-left">
                  <div className="nc-modal-badge">
                    <span className="material-symbols-outlined">
                      {indexEditar !== null ? "edit_note" : "note_add"}
                    </span>
                  </div>
                  <div>
                    <h2 className="nc-modal-title">
                      {indexEditar !== null ? "Modificar categoría" : "Nueva categoría"}
                    </h2>
                    <p className="nc-modal-subtitle">
                      {indexEditar !== null
                        ? "Actualiza el nombre de esta categoría de conciliación."
                        : "Agrega una nueva etiqueta de conciliación para copiarla rápido."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="nc-modal-close"
                  onClick={cerrarModal}
                  aria-label="Cerrar modal"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form
                className="nc-modal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  guardarModal();
                }}
              >
                <div className="nc-modal-field">
                  <label className="nc-modal-label">
                    Nombre de la categoría <span className="nc-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="nc-modal-input"
                    value={textoTemporal}
                    onChange={(e) => setTextoTemporal(e.target.value)}
                    placeholder="Ej: CONCILIACION FIBRA OPTICA"
                    autoFocus
                    required
                  />
                </div>

                <div className="nc-modal-footer">
                  <button type="button" className="nc-btn-cancel" onClick={cerrarModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="nc-btn-save">
                    <span className="material-symbols-outlined">check</span>
                    <span>{indexEditar !== null ? "Guardar cambios" : "Guardar categoría"}</span>
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

export default NotasConciliacion;

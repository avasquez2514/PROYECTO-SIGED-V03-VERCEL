"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { manejarSesionExpirada } from "../lib/sesion";
import "../styles/plantillas.css";

/**
 * Interfaz que define la estructura de una plantilla de notas
 */
interface Plantilla {
  id: string;
  plantilla_id: string;
  notaPublica: string;
  notaInterna: string;
}

/**
 * Props del componente PlantillaSelector
 */
interface PlantillaSelectorProps {
  torre: string;
  onSelect: (texto: string) => void;
}

/**
 * Componente selector de plantillas para gestión de notas públicas e internas
 */
const PlantillaSelector: React.FC<PlantillaSelectorProps> = ({ torre, onSelect }) => {
  // --- ESTADOS DEL COMPONENTE ---

  const [plantillas, setPlantillas] = useState<Record<string, Plantilla>>({});
  const [copiado, setCopiado] = useState(false);
  const [notaSeleccionada, setNotaSeleccionada] = useState("");
  
  // CAMBIO REALIZADO: Ahora el valor inicial es "publica"
  const [tipoNota, setTipoNota] = useState<"publica" | "interna">("publica");

  const [textoNota, setTextoNota] = useState("");
  const [textoModificado, setTextoModificado] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modoModal, setModoModal] = useState<"agregar" | "modificar">("agregar");
  const [formData, setFormData] = useState({
    novedad: "",
    nota_publica: "",
    nota_interna: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mostrarModal) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMostrarModal(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [mostrarModal]);

  const API = `${process.env.NEXT_PUBLIC_API_URL || ""}/api/notas`;

  const cargarPlantillas = async () => {
    const token = localStorage.getItem("token");
    const usuarioRaw = localStorage.getItem("usuario");
    const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;

    if (!token || !usuario?.id) return;

    try {
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
        setPlantillas({});
        return;
      }

      const agrupadas: Record<string, Plantilla> = {};
      data.forEach((row: any) => {
        const esPlantillaAdicional = row.plantilla?.trim();
        const esNotaAvances = row.nota_avances?.trim() &&
          !row.nota_publica?.trim() &&
          !row.nota_interna?.trim() &&
          !row.plantilla?.trim();

        if (!esPlantillaAdicional && !esNotaAvances) {
          const novedad = row.novedad || "Sin título";
          agrupadas[novedad] = {
            id: row.id,
            plantilla_id: row.plantilla_id,
            notaPublica: row.nota_publica || "",
            notaInterna: row.nota_interna || "",
          };
        }
      });

      setPlantillas(agrupadas);
    } catch (error) {
      console.error("Error al cargar plantillas:", error);
      setPlantillas({});
    }
  };

  useEffect(() => {
    cargarPlantillas();
  }, []);

  useEffect(() => {
    if (notaSeleccionada && plantillas[notaSeleccionada] && !textoModificado) {
      const encabezado = `Gestión-MOC-Torre ${torre}:`;
      const nota = tipoNota === "publica"
        ? plantillas[notaSeleccionada].notaPublica
        : `${encabezado}\n\n${plantillas[notaSeleccionada].notaInterna}`;
      setTextoNota(nota);
      onSelect(nota);
    }
  }, [notaSeleccionada, tipoNota, plantillas, torre, textoModificado, onSelect]);

  // --- MANEJADORES DE EVENTOS ---

  const handleNotaChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setNotaSeleccionada(e.target.value);
    setTextoModificado(false);
  };

  const handleTipoNotaChange = (tipo: "publica" | "interna") => {
    setTipoNota(tipo);
    setTextoModificado(false);
  };

  const handleTextoChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setTextoNota(e.target.value);
    setTextoModificado(true);
  };

  const copiarTexto = () => {
    if (!textoNota.trim()) return;
    navigator.clipboard.writeText(textoNota).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    }).catch((err) => console.error("Error al copiar:", err));
  };

  const limpiarTexto = () => {
    setTextoNota("");
    setTextoModificado(true);
    onSelect("");
  };

  // --- FUNCIONES DE GESTIÓN ---

  const abrirModalAgregar = () => {
    setModoModal("agregar");
    setFormData({ novedad: "", nota_publica: "", nota_interna: "" });
    setMostrarModal(true);
  };

  const abrirModalModificar = () => {
    if (!notaSeleccionada) {
      alert("Selecciona una nota primero");
      return;
    }
    const actual = plantillas[notaSeleccionada];
    setModoModal("modificar");
    setFormData({
      novedad: notaSeleccionada,
      nota_publica: actual.notaPublica,
      nota_interna: actual.notaInterna,
    });
    setMostrarModal(true);
  };

  const handleSubmitModal = async () => {
    const token = localStorage.getItem("token");
    const usuarioRaw = localStorage.getItem("usuario");
    const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;

    if (!token || !usuario?.id) return;

    try {
      let response;

      if (modoModal === "agregar") {
        const nombreUnico = `${formData.novedad.trim()} - ${Date.now()}`;
        response = await fetch(`${API}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            novedad: nombreUnico,
            nota_publica: formData.nota_publica.trim(),
            nota_interna: formData.nota_interna.trim(),
            usuario_id: usuario.id,
          }),
        });
      } else {
        const actual = plantillas[notaSeleccionada];
        response = await fetch(`${API}/plantilla/${actual.plantilla_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            novedad: formData.novedad.trim(),
            nota_publica: formData.nota_publica.trim(),
            nota_interna: formData.nota_interna.trim(),
            nota_avances: "",
            plantilla: ""
          }),
        });
        setNotaSeleccionada(formData.novedad.trim());
      }

      if (response && !response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.mensaje || `Error ${response.status}`);
      }

      setMostrarModal(false);
      cargarPlantillas();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al guardar plantilla: ${errorMessage}`);
    }
  };

  const eliminarPlantilla = async () => {
    if (!notaSeleccionada) {
      alert("Selecciona una nota primero");
      return;
    }

    const id = plantillas[notaSeleccionada].id;
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!window.confirm(`¿Eliminar plantilla "${notaSeleccionada}"?`)) return;

    try {
      const response = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.mensaje || `Error ${response.status}`);
      }

      setNotaSeleccionada("");
      setTextoNota("");
      onSelect("");
      cargarPlantillas();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al eliminar plantilla: ${errorMessage}`);
    }
  };

  return (
    <div className="plantilla-view-wrapper">
      <div className="plantilla-container-premium">
        <div className="plantilla-card-premium">
          {/* Header */}
          <div className="plantilla-header-premium">
            <div className="header-icon-box-p">
              <span className="material-symbols-outlined">description</span>
            </div>
            <div className="header-text-p">
              <h2 className="title-p">Plantillas de notas</h2>
              <p className="subtitle-p">Gestión de comunicaciones y notas de despacho</p>
            </div>
          </div>

          {/* Categoría */}
          <div className="category-section-p">
            <label className="label-p">CATEGORÍA</label>
            <div className="select-wrapper-p">
              <select value={notaSeleccionada} onChange={handleNotaChange} className="select-p">
                <option value="">ELIJA UNA OPCIÓN</option>
                {Object.keys(plantillas).map((key) => (
                  <option key={key} value={key}>
                    {key.toUpperCase()}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined select-icon-p">expand_more</span>
            </div>
          </div>

          {/* Acciones CRUD */}
          <div className="actions-grid-p">
            <button type="button" className="action-btn-p" onClick={abrirModalAgregar}>
              <span className="material-symbols-outlined">add</span>
              <span>AGREGAR</span>
            </button>
            <button type="button" className="action-btn-p" onClick={abrirModalModificar}>
              <span className="material-symbols-outlined">edit</span>
              <span>MODIFICAR</span>
            </button>
            <button type="button" className="action-btn-p btn-del" onClick={eliminarPlantilla}>
              <span className="material-symbols-outlined">delete</span>
              <span>ELIMINAR</span>
            </button>
          </div>

          {/* Contenido + contador de caracteres */}
          <div className="textarea-section-p">
            <div className="content-header-p">
              <label className="label-p">CONTENIDO</label>
              <span className="char-counter-p">{textoNota.length} caracteres</span>
            </div>
            <textarea
              value={textoNota}
              onChange={handleTextoChange}
              className="textarea-p"
              placeholder="Contenido de la plantilla..."
            />
          </div>

          {/* Switch Nota Pública / Nota Interna */}
          <div className="type-toggle-p">
            <button
              type="button"
              className={`type-toggle-btn ${tipoNota === "publica" ? "active" : ""}`}
              onClick={() => handleTipoNotaChange("publica")}
            >
              <span className="material-symbols-outlined">public</span>
              <span>NOTA PÚBLICA</span>
            </button>

            <button
              type="button"
              className={`type-toggle-btn ${tipoNota === "interna" ? "active" : ""}`}
              onClick={() => handleTipoNotaChange("interna")}
            >
              <span className="material-symbols-outlined">lock</span>
              <span>NOTA INTERNA</span>
            </button>
          </div>

          {/* Utilidades: Copiar / Limpiar */}
          <div className="utility-grid-p">
            <button
              type="button"
              className={`util-btn-p copy ${copiado ? "is-copied" : ""}`}
              onClick={copiarTexto}
            >
              <span className="material-symbols-outlined">
                {copiado ? "check" : "content_copy"}
              </span>
              <span>{copiado ? "¡COPIADO!" : "COPIAR TEXTO"}</span>
            </button>
            <button type="button" className="util-btn-p clear" onClick={limpiarTexto}>
              <span className="material-symbols-outlined">backspace</span>
              <span>LIMPIAR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Agregar / Editar Plantilla */}
      {mostrarModal &&
        mounted &&
        createPortal(
          <div className="pl-modal-overlay" onClick={() => setMostrarModal(false)} role="dialog" aria-modal="true">
            <div className="pl-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="pl-modal-header">
                <div className="pl-modal-header-left">
                  <div className="pl-modal-badge">
                    <span className="material-symbols-outlined">
                      {modoModal === "agregar" ? "note_add" : "edit_note"}
                    </span>
                  </div>
                  <div>
                    <h2 className="pl-modal-title">
                      {modoModal === "agregar" ? "Nueva plantilla" : "Editar plantilla"}
                    </h2>
                    <p className="pl-modal-subtitle">
                      Define los textos de nota pública e interna para esta categoría.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="pl-modal-close"
                  onClick={() => setMostrarModal(false)}
                  aria-label="Cerrar modal"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form
                className="pl-modal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitModal();
                }}
              >
                <div className="pl-modal-field">
                  <label className="pl-modal-label">
                    Nombre de la novedad <span className="pl-required">*</span>
                  </label>
                  <input
                    className="pl-modal-input"
                    value={formData.novedad}
                    onChange={(e) => setFormData({ ...formData, novedad: e.target.value })}
                    placeholder="Ej: CONFIRMACION, CAÍDA DE SISTEMA"
                    required
                    autoFocus
                  />
                </div>

                <div className="pl-modal-field">
                  <label className="pl-modal-label">Contenido Nota Pública</label>
                  <textarea
                    className="pl-modal-textarea"
                    rows={4}
                    value={formData.nota_publica}
                    onChange={(e) => setFormData({ ...formData, nota_publica: e.target.value })}
                    placeholder="Lo que verá el usuario final..."
                  />
                </div>

                <div className="pl-modal-field">
                  <label className="pl-modal-label">Contenido Nota Interna</label>
                  <textarea
                    className="pl-modal-textarea"
                    rows={4}
                    value={formData.nota_interna}
                    onChange={(e) => setFormData({ ...formData, nota_interna: e.target.value })}
                    placeholder="Información interna para el equipo..."
                  />
                </div>

                <div className="pl-modal-footer">
                  <button
                    type="button"
                    onClick={() => setMostrarModal(false)}
                    className="pl-btn-cancel"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="pl-btn-save">
                    <span className="material-symbols-outlined">check</span>
                    <span>{modoModal === "agregar" ? "Guardar plantilla" : "Actualizar plantilla"}</span>
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

export default PlantillaSelector;

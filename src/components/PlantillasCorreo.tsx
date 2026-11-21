"use client";

import React, { useState, useEffect, useMemo } from "react";
import "../styles/plantillasCorreo.css";

interface TandaCorreos {
  id: string;
  nombre: string;
  correos: string;
  color?: string;
}

interface EntradaCorreo {
  raw: string;
  nombre: string;
  email: string;
  valido: boolean;
  duplicado: boolean;
}

const STORAGE_KEY_PARA = "siged_correos_para";
const STORAGE_KEY_CC = "siged_correos_cc";

const COLOR_PARA = "#3b82f6";
const COLOR_CC = "#a855f7";
const COLORES_ETIQUETA = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

// Ejemplo inicial oficial de la tanda Apertura para PARA
const TANDA_APERTURA_DEFAULT =
  "Olga Lucia Cortes Leon <Olga.Cortes@tigo.com.co>; Daniel Adolfo Botero Mira <Daniel.Botero@tigo.com.co>; Francisco Javier Florez Osorio <Francisco.Florez@tigo.com.co>; Jhon Wilson Urrego Argaez <Jhon.Urrego@tigo.com.co>; Duvan Andres Avila Rincon <DAVILA@tigo.com.co>; Hector Leon Zuleta Carmona <Hector.Zuleta@tigo.com.co>; William Dario Viana Martinez <William.Viana@tigo.com.co>; JUAN REZA PATERNINA <Juan.Reza@tigo.com.co>; Olga Lucia Cortes Leon <Olga.Cortes@tigo.com.co>; holmanmedina.bog energiaintegralandina.com <holmanmedina.bog@energiaintegralandina.com>; Supervision De Contratos Instalaciones B2B <SupervisiondeContratosInstalacionesB2B@tigo.com.co>; Wilmer Jesus Bovea Serrano <Wilmer.Bovea@tigo.com.co>; jaime.muriel@eiasa.com.co <jaime.muriel@eiasa.com.co>; 'Carlos Alberto Barrera Ortega' <carlos.barrera@eiasa.com.co>; 'jorge.baldovino@eiasa.com.co' <jorge.baldovino@eiasa.com.co>; analista.ctg@energiaintegralandina.com <analista.ctg@energiaintegralandina.com>; analista.ctg@energiaintegralandina.com <analista.ctg@energiaintegralandina.com>; Analista.kpi.buc1@energiaintegralandina.com <analista.kpi.buc1@energiaintegralandina.com>; je-49@hotmail.com je-49@hotmail.com; galeraosneider@gmail.com;rcespedesortiz@gmail.com;wilmer.bovea@tigo.com.co;elemir.machado@tigo.com.co";

const TANDA_CC_DEFAULT =
  "Despacho reparaciones B2B <despachoreparacionesb2b@tigo.com.co>";

/* ============================================================================
   UTILIDADES
============================================================================ */
const EMAIL_RE = /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/;
const BARE_RE = /[^\s<>'",;]+@[^\s<>'",;]+/g;

/** Extrae las iniciales limpias de un nombre o correo para el avatar */
const obtenerIniciales = (nombre: string, email: string): string => {
  if (nombre && nombre.trim()) {
    const partes = nombre.trim().split(/[\s,.'"-]+/).filter(Boolean);
    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }
    if (partes.length === 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    if (partes.length >= 3) {
      const primerNombre = partes[0][0];
      const apellido = partes.length >= 4 ? partes[2][0] : partes[partes.length - 1][0];
      return (primerNombre + apellido).toUpperCase();
    }
  }
  if (email && email.trim()) {
    const user = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
    return (user.slice(0, 2) || "DE").toUpperCase();
  }
  return "DE";
};

/** Separa un texto de correos (separados por ; o saltos de línea) en entradas analizadas. */
const parseCorreos = (texto: string): EntradaCorreo[] => {
  const segmentos: string[] = [];
  (texto || "").split(/[;\n\r]+/).forEach((seg) => {
    const s = seg.trim();
    if (!s) return;
    const arrobas = (s.match(/@/g) || []).length;
    if (arrobas > 1 && !s.includes("<")) {
      s.split(/[,\s]+/).forEach((p) => {
        const t = p.trim();
        if (t) segmentos.push(t);
      });
    } else {
      segmentos.push(s);
    }
  });

  const vistos = new Set<string>();
  return segmentos.map((raw) => {
    const m = raw.match(/<([^>]+)>/);
    let email = "";
    let nombre = "";
    if (m) {
      email = m[1].trim();
      nombre = raw.replace(m[0], "").replace(/['"]/g, "").trim();
    } else {
      const b = raw.match(BARE_RE);
      email = b ? b[0] : raw.replace(/['"]/g, "").trim();
    }
    if (nombre.includes("@")) nombre = "";
    const valido = EMAIL_RE.test(email);
    const clave = email.toLowerCase();
    const duplicado = valido && vistos.has(clave);
    if (valido) vistos.add(clave);
    return { raw, nombre, email, valido, duplicado };
  });
};

const unirRaw = (entradas: EntradaCorreo[]) => entradas.map((e) => e.raw).join("; ");

/** Une todas las tandas en un solo texto, sin correos repetidos. */
const unirTandasSinDuplicados = (listas: TandaCorreos[]): string => {
  const vistos = new Set<string>();
  const salida: string[] = [];
  listas.forEach((t) => {
    parseCorreos(t.correos).forEach((e) => {
      if (e.valido) {
        const k = e.email.toLowerCase();
        if (vistos.has(k)) return;
        vistos.add(k);
      }
      salida.push(e.raw);
    });
  });
  return salida.join("; ");
};

const copiarAlPortapapeles = async (texto: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    /* continúa con el método alternativo */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

const normalizar = (parsed: any[], prefijo: string, nombreDef: string, colorDef: string): TandaCorreos[] =>
  parsed.map((item: any, idx: number) => ({
    id: item.id || `${prefijo}-${idx}`,
    nombre: item.nombre || nombreDef,
    correos: item.correos || item.correo || "",
    color: item.color || colorDef,
  }));

/* ============================================================================
   PANEL REUTILIZABLE (PARA / CC)
============================================================================ */
interface PanelProps {
  tipo: "para" | "cc";
  titulo: string;
  icono: string;
  acento: string;
  lista: TandaCorreos[];
  onChange: (nueva: TandaCorreos[]) => void;
}

const PanelDestinatarios: React.FC<PanelProps> = ({ tipo, titulo, icono, acento, lista, onChange }) => {
  const [busqueda, setBusqueda] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correos, setCorreos] = useState("");
  const [color, setColor] = useState(acento);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const marcarCopiado = (clave: string) => {
    setCopiado(clave);
    setTimeout(() => setCopiado((c) => (c === clave ? null : c)), 1800);
  };

  const copiar = async (texto: string, clave: string) => {
    if (!texto.trim()) return;
    if (await copiarAlPortapapeles(texto.trim())) marcarCopiado(clave);
  };

  const analizadas = useMemo(
    () => lista.map((t) => ({ t, entradas: parseCorreos(t.correos) })),
    [lista]
  );

  const q = busqueda.trim().toLowerCase();

  const visibles = useMemo(() => {
    return analizadas
      .map(({ t, entradas }) => {
        const indices = entradas
          .map((e, i) => ({ e, i }))
          .filter(({ e }) => !q || e.email.toLowerCase().includes(q) || e.nombre.toLowerCase().includes(q) || e.raw.toLowerCase().includes(q));
        const coincideNombre = q ? t.nombre.toLowerCase().includes(q) : true;
        return { t, entradas, indices: coincideNombre && q && indices.length === 0 ? entradas.map((e, i) => ({ e, i })) : indices, coincideNombre };
      })
      .filter(({ indices, coincideNombre }) => !q || coincideNombre || indices.length > 0);
  }, [analizadas, q]);

  const totalCorreos = analizadas.reduce((acc, { entradas }) => acc + entradas.length, 0);

  const statsForm = useMemo(() => {
    const entradas = parseCorreos(correos);
    return {
      entradas,
      total: entradas.length,
      duplicados: entradas.filter((e) => e.duplicado).length,
      invalidos: entradas.filter((e) => !e.valido).length,
    };
  }, [correos]);

  const cerrarForm = () => {
    setFormAbierto(false);
    setEditandoId(null);
    setNombre("");
    setCorreos("");
    setColor(acento);
  };

  const abrirNueva = () => {
    setEditandoId(null);
    setNombre("");
    setCorreos("");
    setColor(acento);
    setFormAbierto(true);
  };

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correos.trim()) return;
    const nombreFinal = nombre.trim() || (tipo === "para" ? "Tanda sin nombre" : "Tanda CC sin nombre");
    const correosFinal = correos.trim();
    if (editandoId) {
      onChange(lista.map((t) => (t.id === editandoId ? { ...t, nombre: nombreFinal, correos: correosFinal, color } : t)));
    } else {
      onChange([{ id: Date.now().toString(), nombre: nombreFinal, correos: correosFinal, color }, ...lista]);
    }
    cerrarForm();
  };

  const editar = (t: TandaCorreos) => {
    setEditandoId(t.id);
    setNombre(t.nombre);
    setCorreos(t.correos);
    setColor(t.color || acento);
    setFormAbierto(true);
  };

  const pedirEliminar = (id: string) => {
    if (confirmId === id) {
      onChange(lista.filter((t) => t.id !== id));
      setConfirmId(null);
      if (editandoId === id) cerrarForm();
    } else {
      setConfirmId(id);
      setTimeout(() => setConfirmId((c) => (c === id ? null : c)), 3000);
    }
  };

  const quitarCorreo = (t: TandaCorreos, entradas: EntradaCorreo[], indice: number) => {
    const nuevas = unirRaw(entradas.filter((_, i) => i !== indice));
    onChange(lista.map((x) => (x.id === t.id ? { ...x, correos: nuevas } : x)));
  };

  const limpiarDuplicadosTanda = (t: TandaCorreos, entradas: EntradaCorreo[]) => {
    const nuevas = unirRaw(entradas.filter((e) => !e.duplicado));
    onChange(lista.map((x) => (x.id === t.id ? { ...x, correos: nuevas } : x)));
  };

  const limpiarDuplicadosForm = () => setCorreos(unirRaw(statsForm.entradas.filter((e) => !e.duplicado)));

  const copiadoTodas = copiado === "todas";

  return (
    <section className="pc-card" style={{ ["--pc-accent" as string]: acento } as React.CSSProperties}>
      {/* Encabezado */}
      <header className="pc-card-header">
        <div className="pc-card-title">
          <span className="pc-card-icon">
            <span className="material-symbols-outlined">{icono}</span>
          </span>
          <div className="pc-card-title-text">
            <span className="pc-card-heading">{titulo}</span>
            <small className="pc-card-meta">
              {lista.length} {lista.length === 1 ? "tanda" : "tandas"}, {totalCorreos} {totalCorreos === 1 ? "correo" : "correos"}
            </small>
          </div>
        </div>
        <div className="pc-card-header-actions">
          {lista.length > 0 && (
            <button
              type="button"
              onClick={() => copiar(unirTandasSinDuplicados(lista), "todas")}
              className={`pc-btn-copy-all ${copiadoTodas ? "is-ok" : ""}`}
              title="Copiar todas las tandas en una sola lista, sin correos repetidos"
            >
              <span className="material-symbols-outlined">{copiadoTodas ? "check_circle" : "content_copy"}</span>
              <span className="pc-hide-sm">{copiadoTodas ? "¡Copiado!" : "Copiar todas"}</span>
            </button>
          )}
          <button type="button" onClick={formAbierto ? cerrarForm : abrirNueva} className="pc-btn-new-tanda">
            <span className="material-symbols-outlined">{formAbierto ? "close" : "add"}</span>
            <span>{formAbierto ? "Cerrar" : "Nueva tanda"}</span>
          </button>
        </div>
      </header>

      {/* Formulario desplegable */}
      {formAbierto && (
        <form onSubmit={guardar} className="pc-form">
          <div className="pc-form-row">
            <input
              type="text"
              placeholder="Nombre de la tanda (ej. Apertura, Cierre, Redes)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="pc-input"
              autoFocus
            />
            <div className="pc-colors" role="radiogroup" aria-label="Color de la etiqueta">
              {COLORES_ETIQUETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  className={`pc-color-dot ${color === c ? "is-active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  title="Color de la etiqueta"
                />
              ))}
            </div>
          </div>

          <textarea
            placeholder={"Pega aquí los correos separados por punto y coma (;)...\nEj: Olga Cortes <Olga.Cortes@tigo.com.co>; Daniel Botero <Daniel.Botero@tigo.com.co>"}
            value={correos}
            onChange={(e) => setCorreos(e.target.value)}
            rows={4}
            className="pc-textarea custom-scrollbar"
          />

          {statsForm.total > 0 && (
            <div className="pc-form-stats">
              <span className="pc-stat">
                <span className="material-symbols-outlined">mail</span>
                {statsForm.total} {statsForm.total === 1 ? "correo" : "correos"}
              </span>
              {statsForm.duplicados > 0 && (
                <span className="pc-stat warn">
                  <span className="material-symbols-outlined">content_copy</span>
                  {statsForm.duplicados} {statsForm.duplicados === 1 ? "duplicado" : "duplicados"}
                </span>
              )}
              {statsForm.invalidos > 0 && (
                <span className="pc-stat danger">
                  <span className="material-symbols-outlined">error</span>
                  {statsForm.invalidos} {statsForm.invalidos === 1 ? "inválido" : "inválidos"}
                </span>
              )}
              {statsForm.duplicados === 0 && statsForm.invalidos === 0 && (
                <span className="pc-stat ok">
                  <span className="material-symbols-outlined">check_circle</span>
                  Todo en orden
                </span>
              )}
              {statsForm.duplicados > 0 && (
                <button type="button" onClick={limpiarDuplicadosForm} className="pc-link-btn">
                  <span className="material-symbols-outlined">cleaning_services</span>
                  Limpiar duplicados
                </button>
              )}
            </div>
          )}

          <div className="pc-form-actions">
            <button type="submit" className="pc-btn-save" disabled={!correos.trim()}>
              <span className="material-symbols-outlined">{editandoId ? "save" : "add_task"}</span>
              {editandoId ? "Guardar cambios" : "Guardar tanda"}
            </button>
            <button type="button" onClick={cerrarForm} className="pc-btn-cancel">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Buscador */}
      {lista.length > 0 && (
        <div className="pc-search-box">
          <span className="material-symbols-outlined pc-search-icon">search</span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por tanda, persona o correo"
            className="pc-search-input"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="pc-search-clear"
              title="Limpiar búsqueda"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
      )}

      {/* Lista de tandas */}
      <div className="pc-list custom-scrollbar">
        {lista.length === 0 ? (
          <div className="pc-empty">
            <span className="material-symbols-outlined">inbox</span>
            <strong>Aún no hay tandas en {tipo === "para" ? "PARA" : "CC"}</strong>
            <p>Pulsa «Nueva tanda» y pega tu lista de correos para guardarla.</p>
          </div>
        ) : visibles.length === 0 ? (
          <div className="pc-empty">
            <span className="material-symbols-outlined">search_off</span>
            <strong>Sin resultados</strong>
            <p>No se encontró «{busqueda}» en esta sección.</p>
          </div>
        ) : (
          visibles.map(({ t, entradas, indices }) => {
            const colorTanda = t.color || acento;
            const dups = entradas.filter((e) => e.duplicado).length;
            const invs = entradas.filter((e) => !e.valido).length;
            const expandida = !!abiertas[t.id] || !!q;
            const MAX_COLAPSADA = 4;
            const chips = expandida ? indices : indices.slice(0, MAX_COLAPSADA);
            const restantes = indices.length - chips.length;
            const claveCopia = `tanda-${t.id}`;
            const copiadaTanda = copiado === claveCopia;
            const eliminando = confirmId === t.id;

            return (
              <article
                key={t.id}
                className="pc-tanda"
                style={{ ["--pc-tag" as string]: colorTanda } as React.CSSProperties}
              >
                {/* Header de la Tanda */}
                <div className="pc-tanda-header">
                  <div className="pc-tanda-info">
                    <span className="pc-tanda-dot" />
                    <span className="pc-tanda-nombre" title={t.nombre}>
                      {t.nombre}
                    </span>
                    <span className="pc-tanda-count">
                      {entradas.length} {entradas.length === 1 ? "correo" : "correos"}
                    </span>
                    {invs > 0 && (
                      <span className="pc-tag danger" title={`${invs} dirección(es) con formato inválido`}>
                        {invs} inv.
                      </span>
                    )}
                  </div>

                  <div className="pc-item-actions">
                    <button
                      type="button"
                      onClick={() => copiar(t.correos, claveCopia)}
                      className={`pc-icon-btn copy ${copiadaTanda ? "is-ok" : ""}`}
                      title="Copiar todos los correos de esta tanda"
                    >
                      <span className="material-symbols-outlined">
                        {copiadaTanda ? "check_circle" : "content_copy"}
                      </span>
                      <span className="pc-btn-label">{copiadaTanda ? "¡Copiado!" : "Copiar"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => editar(t)}
                      className="pc-icon-btn edit"
                      title="Editar tanda"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => pedirEliminar(t.id)}
                      className={`pc-icon-btn delete ${eliminando ? "is-confirm" : ""}`}
                      title={eliminando ? "Pulsa de nuevo para confirmar" : "Eliminar tanda"}
                    >
                      <span className="material-symbols-outlined">
                        {eliminando ? "warning" : "delete"}
                      </span>
                      {eliminando && <span className="pc-btn-label always">¿Eliminar?</span>}
                    </button>
                  </div>
                </div>

                {/* Banner de correos duplicados en la tanda */}
                {dups > 0 && (
                  <div className="pc-dup-alert-banner">
                    <div className="pc-dup-alert-left">
                      <span className="material-symbols-outlined pc-dup-alert-icon">
                        cleaning_services
                      </span>
                      <span className="pc-dup-alert-text">
                        {dups} {dups === 1 ? "correo duplicado" : "correos duplicados"} en esta tanda
                      </span>
                    </div>
                    <button
                      type="button"
                      className="pc-dup-alert-btn"
                      onClick={() => limpiarDuplicadosTanda(t, entradas)}
                      title="Quitar automáticamente los correos repetidos"
                    >
                      Limpiar
                    </button>
                  </div>
                )}

                {/* Grid de Destinatarios (2 Columnas) */}
                {entradas.length === 0 ? (
                  <p className="pc-tanda-vacia">Esta tanda no tiene correos.</p>
                ) : (
                  <>
                    <div className="pc-recipient-grid">
                      {chips.map(({ e, i }) => {
                        const claveChip = `chip-${t.id}-${i}`;
                        const chipCopiado = copiado === claveChip;
                        const iniciales = obtenerIniciales(e.nombre, e.email);
                        const nombreMostrar = e.nombre || e.email.split("@")[0] || "Destinatario";
                        const emailMostrar = e.valido ? e.email : e.raw;

                        return (
                          <div
                            key={claveChip}
                            className={`pc-recipient-card ${e.duplicado ? "is-dup" : ""} ${!e.valido ? "is-inv" : ""} ${chipCopiado ? "is-ok" : ""}`}
                            title={
                              chipCopiado
                                ? "¡Copiado!"
                                : e.duplicado
                                ? "Correo repetido (Clic para copiar)"
                                : !e.valido
                                ? "Formato inválido (Clic para copiar)"
                                : `Clic para copiar: ${e.raw}`
                            }
                          >
                            <button
                              type="button"
                              className="pc-recipient-card-btn"
                              onClick={() => copiar(e.raw, claveChip)}
                            >
                              <div className="pc-recipient-avatar">
                                {chipCopiado ? (
                                  <span className="material-symbols-outlined pc-avatar-check">check</span>
                                ) : (
                                  <span>{iniciales}</span>
                                )}
                              </div>
                              <div className="pc-recipient-details">
                                <span className="pc-recipient-name" title={nombreMostrar}>
                                  {chipCopiado ? "¡Copiado!" : nombreMostrar}
                                </span>
                                <span className="pc-recipient-email" title={emailMostrar}>
                                  {emailMostrar}
                                </span>
                              </div>
                            </button>

                            <button
                              type="button"
                              className="pc-recipient-remove-btn"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                quitarCorreo(t, entradas, i);
                              }}
                              title="Quitar este correo de la tanda"
                              aria-label={`Eliminar ${nombreMostrar}`}
                            >
                              <span className="material-symbols-outlined">close</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {!expandida && restantes > 0 && (
                      <button
                        type="button"
                        className="pc-btn-more-cards"
                        onClick={() => setAbiertas({ ...abiertas, [t.id]: true })}
                      >
                        Ver {restantes} más
                      </button>
                    )}

                    {abiertas[t.id] && !q && entradas.length > MAX_COLAPSADA && (
                      <button
                        type="button"
                        className="pc-btn-more-cards is-collapse"
                        onClick={() => setAbiertas({ ...abiertas, [t.id]: false })}
                      >
                        <span className="material-symbols-outlined">expand_less</span>
                        Ver menos
                      </button>
                    )}
                  </>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};

/* ============================================================================
   COMPONENTE PRINCIPAL
============================================================================ */
const PlantillasCorreo: React.FC = () => {
  const [listaPara, setListaPara] = useState<TandaCorreos[]>([]);
  const [listaCC, setListaCC] = useState<TandaCorreos[]>([]);
  const [copiadoAmbos, setCopiadoAmbos] = useState(false);

  // --- Carga inicial desde localStorage ---
  useEffect(() => {
    try {
      const guardadoPara = localStorage.getItem(STORAGE_KEY_PARA);
      if (guardadoPara) {
        setListaPara(normalizar(JSON.parse(guardadoPara), "para", "Envío apertura", COLOR_PARA));
      } else {
        setListaPara([{ id: "tanda-apertura-1", nombre: "Envío apertura", correos: TANDA_APERTURA_DEFAULT, color: COLOR_PARA }]);
      }

      const guardadoCC = localStorage.getItem(STORAGE_KEY_CC);
      if (guardadoCC) {
        setListaCC(normalizar(JSON.parse(guardadoCC), "cc", "Envío apertura", COLOR_CC));
      } else {
        setListaCC([{ id: "tanda-cc-1", nombre: "Envío apertura", correos: TANDA_CC_DEFAULT, color: COLOR_CC }]);
      }
    } catch (e) {
      console.error("Error al cargar plantillas de correo:", e);
    }
  }, []);

  const guardarPara = (nueva: TandaCorreos[]) => {
    setListaPara(nueva);
    localStorage.setItem(STORAGE_KEY_PARA, JSON.stringify(nueva));
  };

  const guardarCC = (nueva: TandaCorreos[]) => {
    setListaCC(nueva);
    localStorage.setItem(STORAGE_KEY_CC, JSON.stringify(nueva));
  };

  const copiarAmbos = async () => {
    const para = unirTandasSinDuplicados(listaPara);
    const cc = unirTandasSinDuplicados(listaCC);
    const texto = [para && `PARA: ${para}`, cc && `CC: ${cc}`].filter(Boolean).join("\n");
    if (!texto) return;
    if (await copiarAlPortapapeles(texto)) {
      setCopiadoAmbos(true);
      setTimeout(() => setCopiadoAmbos(false), 1800);
    }
  };

  return (
    <div className="pc-wrapper">
      <div className="pc-container">
        {/* Cabecera Principal */}
        <div className="pc-header">
          <div className="pc-title-box">
            <div className="pc-icon">
              <span className="material-symbols-outlined">mail</span>
            </div>
            <div>
              <h1 className="pc-title">Plantillas de correo</h1>
              <p className="pc-subtitle">Guarda tus listas de destinatarios y cópialas con un clic.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={copiarAmbos}
            className={`pc-btn-copiar-ambos ${copiadoAmbos ? "is-ok" : ""}`}
            title="Copia las listas PARA y CC juntas, con su encabezado, sin correos repetidos"
            disabled={listaPara.length === 0 && listaCC.length === 0}
          >
            <span className="material-symbols-outlined">{copiadoAmbos ? "check_circle" : "content_copy"}</span>
            <span>{copiadoAmbos ? "¡Copiado!" : "Copiar PARA + CC"}</span>
          </button>
        </div>

        {/* PARA y CC lado a lado */}
        <div className="pc-destinatarios-row">
          <PanelDestinatarios
            tipo="para"
            titulo="Destinatarios principales PARA"
            icono="send"
            acento={COLOR_PARA}
            lista={listaPara}
            onChange={guardarPara}
          />
          <PanelDestinatarios
            tipo="cc"
            titulo="Destinatarios en copia CC"
            icono="group"
            acento={COLOR_CC}
            lista={listaCC}
            onChange={guardarCC}
          />
        </div>
      </div>
    </div>
  );
};

export default PlantillasCorreo;

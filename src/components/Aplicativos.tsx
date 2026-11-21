"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import "../styles/aplicativos.css";

export interface Aplicativo {
  id: string | number;
  nombre: string;
  subtitulo?: string;
  url: string;
  categoria: string;
  estado?: "Activo" | "En revisión" | "Inactivo" | "Mantenimiento";
  icono?: string;
}

interface AplicativosProps {
  torre?: string;
}

const STORAGE_KEY_APLICATIVOS = "siged_aplicativos_data";
const STORAGE_KEY_CATEGORIAS = "siged_aplicativos_categorias";

// Lista inicial de 16 aplicaciones oficiales exacta a la imagen de referencia
const APLICATIVOS_INICIALES: Aplicativo[] = [
  {
    id: "app-1",
    nombre: "FORMULARIO-TECNICOS-FSCR",
    subtitulo: "Google Forms",
    url: "https://docs.google.com/forms/d/e/1FAIpQLScFormularioTecnicos/viewform",
    categoria: "Formularios",
    estado: "Activo",
    icono: "grid_view",
  },
  {
    id: "app-2",
    nombre: "PARAFISCALES-FSCR",
    subtitulo: "SharePoint · Drive",
    url: "https://millicom-my.sharepoint.com/personal/parafiscales_tigo",
    categoria: "Web apps",
    estado: "Activo",
    icono: "folder",
  },
  {
    id: "app-3",
    nombre: "GESTION MOC-FCSR",
    subtitulo: "Google Sheets",
    url: "https://docs.google.com/spreadsheets/d/1GestionMOC_TigoB2B",
    categoria: "Hojas de cálculo",
    estado: "Activo",
    icono: "grid_view",
  },
  {
    id: "app-4",
    nombre: "SEGUIMIENTO TECNICOS",
    subtitulo: "Web app",
    url: "https://corporativo.tigoune.com.co/seguimiento",
    categoria: "Web apps",
    estado: "Activo",
    icono: "grid_view",
  },
  {
    id: "app-5",
    nombre: "SIGED",
    subtitulo: "Web app",
    url: "https://proyecto-siged.onrender.com",
    categoria: "Web apps",
    estado: "Mantenimiento",
    icono: "grid_view",
  },
  {
    id: "app-6",
    nombre: "CONFIRMACION VISITAS",
    subtitulo: "Google Sheets",
    url: "https://docs.google.com/spreadsheets/d/ConfirmacionVisitas_B2B",
    categoria: "Hojas de cálculo",
    estado: "Activo",
    icono: "grid_view",
  },
  {
    id: "app-7",
    nombre: "SMNET",
    subtitulo: "Web app",
    url: "https://smnet.une.net.co",
    categoria: "Web apps",
    estado: "Activo",
    icono: "grid_view",
  },
  {
    id: "app-8",
    nombre: "BUZON DESPACHO",
    subtitulo: "Outlook Mail",
    url: "https://outlook.office.com/mail/inbox",
    categoria: "Correo",
    estado: "Activo",
    icono: "mail",
  },
  {
    id: "app-9",
    nombre: "BMC REMEDY HELPDESK",
    subtitulo: "ITSM Platform",
    url: "https://remedy.tigoune.com.co/arsys",
    categoria: "Web apps",
    estado: "Activo",
    icono: "bolt",
  },
  {
    id: "app-10",
    nombre: "PYMES B2B GESTION",
    subtitulo: "Internal Tool",
    url: "https://pymes.tigo.com.co/portal",
    categoria: "Web apps",
    estado: "Activo",
    icono: "apps",
  },
  {
    id: "app-11",
    nombre: "MONITOREO DE ENLACES",
    subtitulo: "Nagios / Zabbix",
    url: "https://monitoreo.tigoune.com.co/zabbix",
    categoria: "Web apps",
    estado: "Activo",
    icono: "monitoring",
  },
  {
    id: "app-12",
    nombre: "PLANILLAS OPERATIVAS",
    subtitulo: "Google Sheets",
    url: "https://docs.google.com/spreadsheets/d/PlanillasOperativasB2B",
    categoria: "Hojas de cálculo",
    estado: "Activo",
    icono: "grid_view",
  },
  {
    id: "app-13",
    nombre: "GMAIL CORPORATIVO",
    subtitulo: "Google Workspace",
    url: "https://mail.google.com",
    categoria: "Correo",
    estado: "Activo",
    icono: "mail",
  },
  {
    id: "app-14",
    nombre: "ENCUESTAS DE SATISFACCION",
    subtitulo: "Google Forms",
    url: "https://docs.google.com/forms/d/EncuestasSatisfaccion",
    categoria: "Formularios",
    estado: "Activo",
    icono: "grid_view",
  },
  {
    id: "app-15",
    nombre: "PORTAL DE INCIDENCIAS B2B",
    subtitulo: "Portal Web",
    url: "https://incidencias.tigo.com.co",
    categoria: "Web apps",
    estado: "Mantenimiento",
    icono: "apps",
  },
  {
    id: "app-16",
    nombre: "WHATSAPP WEB DESPACHO",
    subtitulo: "Web App",
    url: "https://web.whatsapp.com",
    categoria: "Web apps",
    estado: "Activo",
    icono: "chat",
  },
];

const CATEGORIAS_BASE = ["Formularios", "Hojas de cálculo", "Correo", "Web apps"];

const ITEMS_POR_PAGINA = 8;

const Aplicativos: React.FC<AplicativosProps> = () => {
  // --- Estados de Datos ---
  const [aplicativos, setAplicativos] = useState<Aplicativo[]>([]);
  const [cargado, setCargado] = useState(false);

  // --- Estados de Filtros y Navegación ---
  const [categoriaActiva, setCategoriaActiva] = useState<string>("Todos");
  const [busqueda, setBusqueda] = useState<string>("");
  const [paginaActual, setPaginaActual] = useState<number>(1);

  // --- Selección múltiple ---
  const [seleccionados, setSeleccionados] = useState<Set<string | number>>(new Set());

  // --- Feedback de Copiado ---
  const [copiadoId, setCopiadoId] = useState<string | number | null>(null);

  // --- Estados de Modal de Creación / Edición ---
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formSubtitulo, setFormSubtitulo] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formCategoria, setFormCategoria] = useState("Web apps");
  const [formEstado, setFormEstado] = useState<"Activo" | "En revisión" | "Inactivo" | "Mantenimiento">("Activo");
  const [nuevaCatInput, setNuevaCatInput] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [modalOpen]);

  // --- Carga Inicial ---
  useEffect(() => {
    try {
      const guardados = localStorage.getItem(STORAGE_KEY_APLICATIVOS);
      if (guardados) {
        const parsed: Aplicativo[] = JSON.parse(guardados);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAplicativos(parsed);
        } else {
          setAplicativos(APLICATIVOS_INICIALES);
          localStorage.setItem(STORAGE_KEY_APLICATIVOS, JSON.stringify(APLICATIVOS_INICIALES));
        }
      } else {
        setAplicativos(APLICATIVOS_INICIALES);
        localStorage.setItem(STORAGE_KEY_APLICATIVOS, JSON.stringify(APLICATIVOS_INICIALES));
      }
    } catch (e) {
      console.error("Error cargando aplicativos:", e);
      setAplicativos(APLICATIVOS_INICIALES);
    } finally {
      setCargado(true);
    }
  }, []);

  // --- Guardar en localStorage ---
  const guardarAplicativos = (nuevaLista: Aplicativo[]) => {
    setAplicativos(nuevaLista);
    try {
      localStorage.setItem(STORAGE_KEY_APLICATIVOS, JSON.stringify(nuevaLista));
    } catch (e) {
      console.error("Error guardando aplicativos:", e);
    }
  };

  // --- Helper para extraer dominio limpio ---
  const extraerDominio = (urlStr: string): string => {
    try {
      const u = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
      return u.hostname;
    } catch {
      return urlStr.replace(/^https?:\/\//, "").split("/")[0] || urlStr;
    }
  };

  // --- Helper para ícono y estilo según la app ---
  const resolverIcono = (app: Aplicativo) => {
    const n = (app.nombre + " " + (app.subtitulo || "") + " " + app.categoria).toLowerCase();
    if (n.includes("mail") || n.includes("correo") || n.includes("buzon") || n.includes("outlook") || n.includes("gmail")) {
      return { icono: "mail", clase: "icon-mail" };
    }
    if (n.includes("sharepoint") || n.includes("drive") || n.includes("folder") || n.includes("parafiscales")) {
      return { icono: "folder", clase: "icon-folder" };
    }
    if (n.includes("sheet") || n.includes("hoja") || n.includes("calculo") || n.includes("excel") || n.includes("form") || n.includes("moc")) {
      return { icono: "grid_view", clase: "icon-grid" };
    }
    if (n.includes("bolt") || n.includes("remedy")) {
      return { icono: "bolt", clase: "icon-bolt" };
    }
    return { icono: app.icono || "grid_view", clase: "icon-grid" };
  };

  // --- Categorías Dinámicas ---
  const categorias = useMemo(() => {
    const setCats = new Set<string>(CATEGORIAS_BASE);
    aplicativos.forEach((a) => {
      if (a.categoria) setCats.add(a.categoria);
    });
    return Array.from(setCats);
  }, [aplicativos]);

  // --- Helper para badge y bullet según estado ---
  const getEstadoBadgeClass = (estado?: string) => {
    switch (estado) {
      case "En revisión":
        return "status-review";
      case "Mantenimiento":
        return "status-warn";
      case "Inactivo":
        return "status-danger";
      case "Activo":
      default:
        return "status-ok";
    }
  };

  const getBulletClass = (estado?: string) => {
    switch (estado) {
      case "En revisión":
        return "bullet-review";
      case "Mantenimiento":
        return "bullet-warn";
      case "Inactivo":
        return "bullet-danger";
      case "Activo":
      default:
        return "bullet-ok";
    }
  };

  // --- Filtrado ---
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return aplicativos.filter((app) => {
      const matchCat = categoriaActiva === "Todos" || app.categoria === categoriaActiva;
      const matchQ =
        !q ||
        app.nombre.toLowerCase().includes(q) ||
        (app.subtitulo && app.subtitulo.toLowerCase().includes(q)) ||
        app.url.toLowerCase().includes(q) ||
        extraerDominio(app.url).toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [aplicativos, categoriaActiva, busqueda]);

  // Reset de página al filtrar
  useEffect(() => {
    setPaginaActual(1);
  }, [categoriaActiva, busqueda]);

  // --- Paginación y Modo Scroll ---
  // Al seleccionar "Todos", se muestran todos los aplicativos permitiendo el scroll vertical continuo
  const esModoScroll = categoriaActiva === "Todos";
  const totalPaginas = Math.ceil(filtrados.length / ITEMS_POR_PAGINA) || 1;
  const indexInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const indexFin = Math.min(indexInicio + ITEMS_POR_PAGINA, filtrados.length);
  const appsPaginadas = filtrados.slice(indexInicio, indexFin);
  const appsRenderizadas = esModoScroll ? filtrados : appsPaginadas;

  // --- Métricas KPI ---
  const totalApps = aplicativos.length;
  const linksActivos = aplicativos.filter((a) => (a.estado || "Activo") === "Activo").length;
  const enMantenimiento = aplicativos.filter((a) => a.estado === "Mantenimiento").length;

  // --- Manejadores de Selección ---
  const toggleSeleccionarTodos = () => {
    if (seleccionados.size === appsRenderizadas.length && appsRenderizadas.length > 0) {
      setSeleccionados(new Set());
    } else {
      const nuevoSet = new Set<string | number>();
      appsRenderizadas.forEach((a) => nuevoSet.add(a.id));
      setSeleccionados(nuevoSet);
    }
  };

  const toggleSeleccionarItem = (id: string | number) => {
    const nuevo = new Set(seleccionados);
    if (nuevo.has(id)) {
      nuevo.delete(id);
    } else {
      nuevo.add(id);
    }
    setSeleccionados(nuevo);
  };

  // --- Acciones de Fila ---
  const copiarUrl = (url: string, id: string | number) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 1800);
    });
  };

  const abrirEnlace = (url: string) => {
    const u = url.startsWith("http") ? url : `https://${url}`;
    window.open(u, "_blank", "noopener,noreferrer");
  };

  const abrirNuevoModal = () => {
    setEditandoId(null);
    setFormNombre("");
    setFormSubtitulo("");
    setFormUrl("");
    setFormCategoria(categoriaActiva !== "Todos" ? categoriaActiva : "Web apps");
    setFormEstado("Activo");
    setNuevaCatInput("");
    setModalOpen(true);
  };

  const abrirEditarModal = (app: Aplicativo) => {
    setEditandoId(app.id);
    setFormNombre(app.nombre);
    setFormSubtitulo(app.subtitulo || "");
    setFormUrl(app.url);
    setFormCategoria(app.categoria || "Web apps");
    setFormEstado(app.estado || "Activo");
    setNuevaCatInput("");
    setModalOpen(true);
  };

  const handleGuardarModal = () => {
    if (!formNombre.trim() || !formUrl.trim()) {
      alert("Por favor completa el nombre y la URL del aplicativo.");
      return;
    }

    const catFinal = nuevaCatInput.trim() || formCategoria || "Web apps";

    if (editandoId !== null) {
      const actualizados = aplicativos.map((a) =>
        a.id === editandoId
          ? {
              ...a,
              nombre: formNombre.trim(),
              subtitulo: formSubtitulo.trim() || "Web app",
              url: formUrl.trim(),
              categoria: catFinal,
              estado: formEstado,
            }
          : a
      );
      guardarAplicativos(actualizados);
    } else {
      const nuevo: Aplicativo = {
        id: `app-${Date.now()}`,
        nombre: formNombre.trim(),
        subtitulo: formSubtitulo.trim() || "Web app",
        url: formUrl.trim(),
        categoria: catFinal,
        estado: formEstado,
        icono: "grid_view",
      };
      guardarAplicativos([nuevo, ...aplicativos]);
    }

    setModalOpen(false);
  };

  const handleEliminar = (id: string | number, nombre: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el aplicativo "${nombre}"?`)) {
      const actualizados = aplicativos.filter((a) => a.id !== id);
      guardarAplicativos(actualizados);
      if (seleccionados.has(id)) {
        const nuevo = new Set(seleccionados);
        nuevo.delete(id);
        setSeleccionados(nuevo);
      }
    }
  };

  return (
    <div className="ap-wrapper">
      <div className="ap-container">
        {/* ============================================================ */}
        {/* ENCABEZADO SUPERIOR: TÍTULO, BÚSQUEDA Y BOTÓN NUEVO           */}
        {/* ============================================================ */}
        <header className="ap-header">
          <div className="ap-title-box">
            <h1 className="ap-title">Aplicativos Despacho</h1>
            <p className="ap-subtitle">Gestión centralizada de herramientas operativas de despacho.</p>
          </div>

          <div className="ap-header-actions">
            <div className="ap-search-box">
              <input
                type="text"
                placeholder="Buscar aplicativo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="ap-search-input"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="ap-search-clear"
                  title="Limpiar búsqueda"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>

            <button type="button" onClick={abrirNuevoModal} className="ap-btn-new">
              <span className="material-symbols-outlined text-lg">add</span>
              <span>Nuevo aplicativo</span>
            </button>
          </div>
        </header>

        {/* ============================================================ */}
        {/* BARRA DE PESTAÑAS / FILTROS DE CATEGORÍA                     */}
        {/* ============================================================ */}
        <nav className="ap-tabs-bar" aria-label="Categorías de aplicativos">
          <button
            type="button"
            onClick={() => setCategoriaActiva("Todos")}
            className={`ap-tab-pill ${categoriaActiva === "Todos" ? "is-active" : ""}`}
          >
            <span>Todos</span>
            <span className="ap-tab-dot">·</span>
            <span>{totalApps}</span>
          </button>

          {categorias.map((cat) => {
            const count = aplicativos.filter((a) => a.categoria === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaActiva(cat)}
                className={`ap-tab-pill ${categoriaActiva === cat ? "is-active" : ""}`}
              >
                <span>{cat}</span>
              </button>
            );
          })}
        </nav>

        {/* ============================================================ */}
        {/* TABLA DE APLICATIVOS (DATAGRID)                              */}
        {/* ============================================================ */}
        <div className="ap-table-card">
          <div className="ap-table-responsive custom-scrollbar">
            <table className="ap-table">
              <thead>
                <tr>
                  <th className="ap-th-check">
                    <label className="ap-checkbox-custom">
                      <input
                        type="checkbox"
                        checked={appsRenderizadas.length > 0 && seleccionados.size === appsRenderizadas.length}
                        onChange={toggleSeleccionarTodos}
                        aria-label="Seleccionar todos los visibles"
                      />
                      <span className="ap-checkbox-mark"></span>
                    </label>
                  </th>
                  <th className="ap-th-icon">ÍCONO</th>
                  <th className="ap-th-name">APLICATIVO</th>
                  <th className="ap-th-domain">DOMINIO</th>
                  <th className="ap-th-status">ESTADO</th>
                  <th className="ap-th-actions">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {appsRenderizadas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="ap-empty-row">
                      <div className="ap-empty-box">
                        <span className="material-symbols-outlined ap-empty-icon">search_off</span>
                        <p className="ap-empty-text">No se encontraron aplicativos para esta categoría o búsqueda.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  appsRenderizadas.map((app) => {
                    const isChecked = seleccionados.has(app.id);
                    const isMantenimiento = app.estado === "Mantenimiento";
                    const dominio = extraerDominio(app.url);
                    const { icono, clase } = resolverIcono(app);
                    const isCopiado = copiadoId === app.id;

                    return (
                      <tr key={app.id} className={`ap-tr ${isChecked ? "is-selected" : ""}`}>
                        {/* Checkbox */}
                        <td className="ap-td-check">
                          <label className="ap-checkbox-custom">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSeleccionarItem(app.id)}
                              aria-label={`Seleccionar ${app.nombre}`}
                            />
                            <span className="ap-checkbox-mark"></span>
                          </label>
                        </td>

                        {/* Ícono */}
                        <td className="ap-td-icon">
                          <div className={`ap-icon-box ${clase}`}>
                            <span className="material-symbols-outlined">{icono}</span>
                          </div>
                        </td>

                        {/* Aplicativo (Nombre + Subtítulo) */}
                        <td className="ap-td-name">
                          <div className="ap-name-cell">
                            <span className="ap-app-title" title={app.nombre}>
                              {app.nombre}
                            </span>
                            <span className="ap-app-subtitle">
                              {app.subtitulo || app.categoria || "Web app"}
                            </span>
                          </div>
                        </td>

                        {/* Dominio */}
                        <td className="ap-td-domain">
                          <a
                            href={app.url.startsWith("http") ? app.url : `https://${app.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ap-domain-cell ap-domain-link"
                            title={`Abrir ${app.nombre} (${app.url})`}
                          >
                            <span className={`ap-domain-bullet ${getBulletClass(app.estado)}`}>
                              ●
                            </span>
                            <span className="ap-domain-text">{dominio}</span>
                          </a>
                        </td>

                        {/* Estado */}
                        <td className="ap-td-status">
                          <span className={`ap-status-badge ${getEstadoBadgeClass(app.estado)}`}>
                            {app.estado || "Activo"}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="ap-td-actions">
                          <div className="ap-actions-group">
                            {/* Copiar enlace */}
                            <button
                              type="button"
                              onClick={() => copiarUrl(app.url, app.id)}
                              className={`ap-btn-icon ${isCopiado ? "is-copied" : ""}`}
                              title={isCopiado ? "¡Copiado!" : "Copiar enlace"}
                            >
                              <span className="material-symbols-outlined">
                                {isCopiado ? "check" : "content_copy"}
                              </span>
                            </button>

                            {/* Abrir en nueva pestaña */}
                            <button
                              type="button"
                              onClick={() => abrirEnlace(app.url)}
                              className="ap-btn-icon"
                              title="Abrir en nueva pestaña"
                            >
                              <span className="material-symbols-outlined">open_in_new</span>
                            </button>

                            {/* Editar */}
                            <button
                              type="button"
                              onClick={() => abrirEditarModal(app)}
                              className="ap-btn-icon"
                              title="Editar aplicativo"
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </button>

                            {/* Eliminar */}
                            <button
                              type="button"
                              onClick={() => handleEliminar(app.id, app.nombre)}
                              className="ap-btn-icon btn-delete"
                              title="Eliminar aplicativo"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ============================================================ */}
          {/* PIE DE TABLA: CONTADOR Y PAGINACIÓN                          */}
          {/* ============================================================ */}
          <footer className="ap-table-footer">
            <span className="ap-footer-counter">
              {filtrados.length === 0
                ? "Mostrando 0 de 0"
                : esModoScroll
                ? `Mostrando 1-${filtrados.length} de ${filtrados.length} (Desplázate para ver todos)`
                : `Mostrando ${indexInicio + 1}-${indexFin} de ${filtrados.length}`}
            </span>

            <div className="ap-pagination">
              <button
                type="button"
                onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                disabled={esModoScroll || paginaActual === 1}
                className="ap-page-arrow"
              >
                &lt; Anterior
              </button>

              {esModoScroll ? (
                <button type="button" className="ap-page-num is-active">
                  1
                </button>
              ) : (
                Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPaginaActual(num)}
                    className={`ap-page-num ${paginaActual === num ? "is-active" : ""}`}
                  >
                    {num}
                  </button>
                ))
              )}

              <button
                type="button"
                onClick={() => setPaginaActual((p) => Math.min(p + 1, totalPaginas))}
                disabled={esModoScroll || paginaActual === totalPaginas}
                className="ap-page-arrow"
              >
                Siguiente &gt;
              </button>
            </div>
          </footer>
        </div>

        {/* ============================================================ */}
        {/* BLOQUE INFERIOR: 4 TARJETAS KPI DE MÉTRICAS                  */}
        {/* ============================================================ */}
        <section className="ap-kpi-grid">
          {/* Total Apps */}
          <div className="ap-kpi-card">
            <span className="ap-kpi-label">TOTAL APPS</span>
            <span className="ap-kpi-value value-white">{totalApps}</span>
          </div>

          {/* Links Activos */}
          <div className="ap-kpi-card">
            <span className="ap-kpi-label">LINKS ACTIVOS</span>
            <span className="ap-kpi-value value-green">{linksActivos}</span>
          </div>

          {/* Mantenimiento */}
          <div className="ap-kpi-card">
            <span className="ap-kpi-label">MANTENIMIENTO</span>
            <span className="ap-kpi-value value-orange">{enMantenimiento}</span>
          </div>

          {/* Versión Sistema */}
          <div className="ap-kpi-card ap-kpi-version">
            <span className="ap-kpi-label">VERSIÓN SISTEMA</span>
            <span className="ap-kpi-value value-blue">v4.0.1</span>
          </div>
        </section>
      </div>

      {/* ============================================================ */}
      {/* MODAL: AGREGAR O EDITAR APLICATIVO                           */}
      {/* ============================================================ */}
      {modalOpen &&
        mounted &&
        createPortal(
          (() => {
            const catPreview =
              formCategoria === "__nueva__"
                ? nuevaCatInput.trim() || "Nueva categoría"
                : formCategoria || "Web apps";
            const previewInfo = resolverIcono({
              id: "preview",
              nombre: formNombre || "Aplicativo",
              subtitulo: formSubtitulo,
              url: formUrl,
              categoria: catPreview,
            });
            const dominioPreview = formUrl.trim()
              ? extraerDominio(formUrl.trim())
              : "dominio.ejemplo.com";
            const urlValida = formUrl.trim().length > 3 && formUrl.includes(".");

            return (
              <div
                className="ap-modal-backdrop"
                onClick={() => setModalOpen(false)}
                role="dialog"
                aria-modal="true"
              >
                <div
                  className="ap-modal-card"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="ap-modal-header">
                    <div className="ap-modal-header-left">
                      <div className="ap-modal-icon-badge">
                        <span className="material-symbols-outlined">
                          {editandoId ? "edit_square" : "grid_view"}
                        </span>
                      </div>
                      <div className="ap-modal-titles">
                        <h2 className="ap-modal-title">
                          {editandoId ? "Editar aplicativo" : "Nuevo aplicativo"}
                        </h2>
                        <p className="ap-modal-subtitle">
                          {editandoId
                            ? "Actualiza los detalles y accesos del aplicativo."
                            : "Registra un formulario, sitio o app para tu equipo."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="ap-modal-close-btn"
                      onClick={() => setModalOpen(false)}
                      aria-label="Cerrar modal"
                      title="Cerrar (Esc)"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {/* Vista previa en vivo */}
                  <div className="ap-modal-preview">
                    <div className="ap-modal-preview-left">
                      <div className={`ap-icon-box ${previewInfo.clase}`}>
                        <span className="material-symbols-outlined">{previewInfo.icono}</span>
                      </div>
                      <div className="ap-modal-preview-info">
                        <span className="ap-modal-preview-name">
                          {formNombre.trim() || "FORMULARIO-TECNICOS-FSCR"}
                        </span>
                        <span className="ap-modal-preview-meta">
                          {formSubtitulo.trim() || catPreview} · {dominioPreview}
                        </span>
                      </div>
                    </div>
                    <span className={`ap-status-badge ${getEstadoBadgeClass(formEstado)}`}>
                      {formEstado}
                    </span>
                  </div>

                  {/* Formulario */}
                  <form
                    className="ap-modal-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleGuardarModal();
                    }}
                  >
                    {/* 1. Nombre del aplicativo */}
                    <div className="ap-modal-field">
                      <label className="ap-modal-label">
                        Nombre del aplicativo <span className="ap-required">*</span>
                      </label>
                      <div className="ap-input-with-icon">
                        <span className="material-symbols-outlined ap-field-icon">short_text</span>
                        <input
                          type="text"
                          className="ap-modal-input"
                          placeholder="FORMULARIO-TECNICOS-FSCR"
                          value={formNombre}
                          onChange={(e) => setFormNombre(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* 2. Subtítulo + Categoría en 2 columnas */}
                    <div className="ap-modal-row-2">
                      <div className="ap-modal-field">
                        <label className="ap-modal-label">
                          Subtítulo <span className="ap-label-opt">(opcional)</span>
                        </label>
                        <div className="ap-input-with-icon">
                          <span className="material-symbols-outlined ap-field-icon">sell</span>
                          <input
                            type="text"
                            className="ap-modal-input"
                            placeholder="Google Forms, Web app"
                            value={formSubtitulo}
                            onChange={(e) => setFormSubtitulo(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="ap-modal-field">
                        <label className="ap-modal-label">Categoría</label>
                        <div className="ap-input-with-icon ap-select-wrapper">
                          <span className="material-symbols-outlined ap-field-icon">web</span>
                          <select
                            className="ap-modal-input ap-modal-select"
                            value={formCategoria}
                            onChange={(e) => setFormCategoria(e.target.value)}
                          >
                            {categorias.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                            <option value="__nueva__">+ Crear otra categoría...</option>
                          </select>
                          <span className="material-symbols-outlined ap-select-chevron">
                            expand_more
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Si seleccionó crear otra categoría */}
                    {formCategoria === "__nueva__" && (
                      <div className="ap-modal-field">
                        <label className="ap-modal-label">
                          Nombre de la nueva categoría <span className="ap-required">*</span>
                        </label>
                        <div className="ap-input-with-icon">
                          <span className="material-symbols-outlined ap-field-icon">
                            create_new_folder
                          </span>
                          <input
                            type="text"
                            className="ap-modal-input"
                            placeholder="Ej: Monitoreo B2B"
                            value={nuevaCatInput}
                            onChange={(e) => setNuevaCatInput(e.target.value)}
                            autoFocus
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* 3. URL de acceso */}
                    <div className="ap-modal-field">
                      <label className="ap-modal-label">
                        URL de acceso <span className="ap-required">*</span>
                      </label>
                      <div className="ap-input-with-icon">
                        <span className="material-symbols-outlined ap-field-icon">link</span>
                        <input
                          type="text"
                          className={`ap-modal-input ${urlValida ? "has-right-action" : ""}`}
                          placeholder="https://docs.google.com/..."
                          value={formUrl}
                          onChange={(e) => setFormUrl(e.target.value)}
                          required
                        />
                        {urlValida && (
                          <button
                            type="button"
                            className="ap-input-test-btn"
                            onClick={() => abrirEnlace(formUrl.trim())}
                            title="Probar enlace en nueva pestaña"
                          >
                            <span className="material-symbols-outlined">open_in_new</span>
                          </button>
                        )}
                      </div>
                      <span className="ap-field-hint">
                        Pega el enlace completo, incluido https://
                      </span>
                    </div>

                    {/* 4. Estado (Segmented Pills) */}
                    <div className="ap-modal-field">
                      <label className="ap-modal-label">Estado</label>
                      <div className="ap-segmented-status">
                        <button
                          type="button"
                          className={`ap-status-pill pill-ok ${formEstado === "Activo" ? "is-selected" : ""}`}
                          onClick={() => setFormEstado("Activo")}
                        >
                          <span className="ap-status-dot dot-green"></span>
                          <span>Activo</span>
                        </button>
                        <button
                          type="button"
                          className={`ap-status-pill pill-warn ${formEstado === "Mantenimiento" ? "is-selected" : ""}`}
                          onClick={() => setFormEstado("Mantenimiento")}
                        >
                          <span className="ap-status-dot dot-orange"></span>
                          <span>Mantenimiento</span>
                        </button>
                        <button
                          type="button"
                          className={`ap-status-pill pill-review ${formEstado === "En revisión" ? "is-selected" : ""}`}
                          onClick={() => setFormEstado("En revisión")}
                        >
                          <span className="ap-status-dot dot-amber"></span>
                          <span>En revisión</span>
                        </button>
                        <button
                          type="button"
                          className={`ap-status-pill pill-danger ${formEstado === "Inactivo" ? "is-selected" : ""}`}
                          onClick={() => setFormEstado("Inactivo")}
                        >
                          <span className="ap-status-dot dot-red"></span>
                          <span>Inactivo</span>
                        </button>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="ap-modal-footer">
                      <span className="ap-modal-esc-hint">
                        <kbd>Esc</kbd> para cerrar
                      </span>
                      <div className="ap-modal-footer-btns">
                        <button
                          type="button"
                          className="ap-btn-cancel-modal"
                          onClick={() => setModalOpen(false)}
                        >
                          Cancelar
                        </button>
                        <button type="submit" className="ap-btn-save-modal">
                          <span className="material-symbols-outlined">check</span>
                          <span>{editandoId ? "Guardar cambios" : "Guardar aplicativo"}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            );
          })(),
          document.getElementById("modal-root") || document.body
        )}
    </div>
  );
};

export default Aplicativos;

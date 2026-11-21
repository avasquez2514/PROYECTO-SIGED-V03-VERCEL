// src/components/Tema.tsx
"use client";

import React, { useEffect, useState } from "react";

const Tema = () => {
  const [tema, setTema] = useState<"oscuro" | "claro">("oscuro");

  useEffect(() => {
    // Al montar, recupera el tema guardado o usa oscuro por defecto
    const guardado = localStorage.getItem("tema");
    const esClaro = guardado === "claro";
    setTema(esClaro ? "claro" : "oscuro");
    
    if (esClaro) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.add("light-theme");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.remove("light-theme");
    }
  }, []);

  const toggleTheme = () => {
    const nuevo = tema === "oscuro" ? "claro" : "oscuro";
    setTema(nuevo);
    localStorage.setItem("tema", nuevo);

    if (nuevo === "claro") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.add("light-theme");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.remove("light-theme");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white dark:hover:text-white transition-colors border-none bg-transparent cursor-pointer"
      title={`Cambiar a modo ${tema === "oscuro" ? "claro" : "oscuro"}`}
    >
      <span className={`material-symbols-outlined text-sm ${tema === "claro" ? "text-amber-500" : "text-blue-400"}`}>
        {tema === "claro" ? "light_mode" : "dark_mode"}
      </span>
      <span>{tema === "claro" ? "Modo Claro" : "Modo Oscuro"}</span>
    </button>
  );
};

export default Tema;

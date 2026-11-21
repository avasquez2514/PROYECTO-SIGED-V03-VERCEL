"use client";

import React from "react";
import "../styles/torreSelector.css";

interface TorreSelectorProps {
  onSelect: (torre: string) => void;
}

const TorreSelector: React.FC<TorreSelectorProps> = ({ onSelect }) => {
  const torres: string[] = [
    "ANTIOQUIA CENTRO",
    "ANTIOQUIA ORIENTE",
    "EDATEL",
    "BOGOTÁ",
    "OPC_BASIC",
    "SANTANDER",
    "COSTA",
  ];

  return (
    <div className="torre-selector-container">
      <div className="torre-header-badge">
        <span className="material-symbols-outlined">cell_tower</span>
      </div>

      <h2 className="torre-selector-title">SELECCIONA TU TORRE</h2>
      <p className="torre-selector-subtitle">
        ELIGE LA TORRE CON LA QUE VAS A TRABAJAR.
      </p>

      <div className="torre-buttons">
        {torres.map((torre) => (
          <button
            key={torre}
            type="button"
            className="torre-button"
            onClick={() => onSelect(torre)}
          >
            <div className="torre-btn-left">
              <span className="torre-btn-icon">
                <span className="material-symbols-outlined">cell_tower</span>
              </span>
              <span className="torre-btn-name">{torre}</span>
            </div>
            <span className="material-symbols-outlined torre-btn-arrow">
              chevron_right
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TorreSelector;

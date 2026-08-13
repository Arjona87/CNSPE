/**
 * reporte.js — Botón "Generar Reporte" del dashboard CNSPE.
 * -------------------------------------------------------------------------
 * Descarga la Ficha Informativa oficial (PDF) elaborada por la CGES/DAAV.
 *
 * Nota (13-ago-2026): antes este archivo generaba un documento Word al vuelo
 * con los datos del Sheet. A solicitud del usuario, ahora entrega un PDF fijo
 * y ya validado —la ficha institucional definitiva— en vez de un documento
 * generado automáticamente. Para publicar una nueva versión de la ficha basta
 * con reemplazar el PDF en el repositorio: no hay que tocar este código.
 *
 * Requisito: el archivo PDF debe estar subido junto a index.html, con el
 * mismo nombre indicado en ARCHIVO_PDF (sin acentos ni espacios, para que la
 * URL funcione correctamente en GitHub Pages).
 */

const ARCHIVO_PDF = "Ficha_CNSPE_2026.pdf";             // debe existir junto a index.html
const NOMBRE_DESCARGA = "Ficha_CNSPE_2026_Jalisco.pdf"; // nombre con el que se guarda

function descargarFicha() {
  const a = document.createElement("a");
  a.href = ARCHIVO_PDF;
  a.download = NOMBRE_DESCARGA;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function initBotonReporte() {
  const btn = document.getElementById("btn-generar-reporte");
  if (!btn) return;

  btn.disabled = false;
  btn.textContent = "Descargar Ficha Informativa";
  btn.title = "Descarga la Ficha Informativa del CNSPE 2026 (PDF)";

  btn.addEventListener("click", () => {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Descargando\u2026";
    try {
      descargarFicha();
    } catch (err) {
      console.error("No se pudo descargar la ficha:", err);
      // Respaldo: si la descarga directa falla, abrir el PDF en una pestaña nueva.
      window.open(ARCHIVO_PDF, "_blank", "noopener");
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = original;
      }, 900);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBotonReporte);
} else {
  initBotonReporte();
}

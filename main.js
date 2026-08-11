/* =========================================================================
   main.js — Orquestación (Fase 2)
   Carga el dataset (data.js), puebla el selector de año, calcula y pinta
   las tarjetas KPI con datos reales, y deja marcadas (placeholder, con la
   cuenta real de series listas) las tarjetas de gráficas que construirá
   charts.js en la Fase 3. No inventa datos: todo lo que se muestra viene
   de window.CGES.loadDataset().
   ========================================================================= */

const STATE = {
  dataset: null,     // { series, secciones, source, fetchedAt }
  anioKpi: 2025,      // año mostrado en las tarjetas KPI (ajustar cuando se publique el CNSPE 2026)
};

const AÑO_ULTIMA_EDICION_OFICIAL = 2025; // CNSPE 2025 = datos con cierre 2024. Actualizar al publicarse 2026.

function fmtValor(valor, unidad) {
  if (valor === null || valor === undefined) return "Sin dato";
  if (unidad === "mdp") return "$" + valor.toLocaleString("es-MX", { maximumFractionDigits: 1 }) + " mdp";
  if (unidad === "tasa") return valor.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return Math.round(valor).toLocaleString("es-MX");
}

/* -------------------------------------------------------------------------
   Tarjetas KPI — 6 indicadores representativos de Jalisco, con el valor
   Nacional del mismo año como referencia (nota neutra, sin flecha de
   "bueno/malo": para datos institucionales "más alto" no siempre es mejor
   ni peor, a diferencia de un conteo de delitos).
   ------------------------------------------------------------------------- */
const KPI_DEFS = [
  { icon: "👮", claseIcono: "", label: "Personal adscrito", serieJalisco: "personal_adscrito_jalisco", serieNacional: "personal_adscrito_total", unidad: "personas" },
  { icon: "💰", claseIcono: "orange", label: "Presupuesto ejercido", serieJalisco: "presupuesto_jalisco", serieNacional: "presupuesto_nacional", unidad: "mdp" },
  { icon: "📊", claseIcono: "blue", label: "Tasa policía preventiva /1,000 hab.", serieJalisco: "tasa_preventiva_jalisco", serieNacional: "tasa_preventiva_nacional", unidad: "tasa" },
  { icon: "🎓", claseIcono: "green", label: "Personal con Certificado Único Policial", serieJalisco: "cup_total__jalisco", serieNacional: "cup_total__nacional", unidad: "personas" },
  { icon: "⚔️", claseIcono: "orange", label: "Enfrentamientos", serieJalisco: "enfrentamientos_jalisco", serieNacional: "enfrentamientos_nacional", unidad: "eventos" },
  { icon: "🏢", claseIcono: "blue", label: "Empresas de seguridad privada", serieJalisco: "empresas_jalisco", serieNacional: "empresas_nacional", unidad: "empresas" },
];

function renderKPIs() {
  const grid = document.getElementById("kpi-grid");
  const { series } = STATE.dataset;
  const anio = STATE.anioKpi;
  grid.innerHTML = "";

  KPI_DEFS.forEach(def => {
    const sJal = series[def.serieJalisco];
    const sNac = series[def.serieNacional];
    const valJal = sJal ? sJal.valores[anio] : null;
    const valNac = sNac ? sNac.valores[anio] : null;

    const card = document.createElement("div");
    card.className = "kpi-card";
    card.innerHTML = `
      <div class="kpi-icon ${def.claseIcono}">${def.icon}</div>
      <div class="kpi-label">${def.label}</div>
      <div class="kpi-value">${fmtValor(valJal, def.unidad)}</div>
      <div class="kpi-delta flat">${valNac !== null ? "Nacional: " + fmtValor(valNac, def.unidad) : '<span class="kpi-na">Sin referencia nacional</span>'}</div>
    `;
    grid.appendChild(card);
  });

  document.getElementById("kpi-anio-label").textContent = anio;

  const sedes = STATE.dataset.series.academias_sedes;
  const elSedes = document.getElementById("stat-academias-sedes");
  if (sedes && elSedes) elSedes.textContent = fmtValor(sedes.valores[anio], sedes.unidad);
}

/* -------------------------------------------------------------------------
   Selector de año para KPIs
   ------------------------------------------------------------------------- */
function populateAnioSelector() {
  const sel = document.getElementById("filter-anio-kpi");
  const AÑOS = window.CGES.AÑOS;
  sel.innerHTML = "";
  AÑOS.forEach(anio => {
    const opt = document.createElement("option");
    opt.value = anio;
    opt.textContent = anio > AÑO_ULTIMA_EDICION_OFICIAL ? `${anio} (no publicado)` : anio;
    if (anio === AÑO_ULTIMA_EDICION_OFICIAL) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", () => {
    STATE.anioKpi = parseInt(sel.value, 10);
    renderKPIs();
  });
}

function renderNotaCobertura() {
  const { series } = STATE.dataset;
  const ids = Object.keys(series);
  const con2025 = ids.filter(id => series[id].valores[2025] !== null).length;
  const nota = document.getElementById("nota-cobertura");
  nota.innerHTML = `<b>${ids.length}</b> series definidas a partir del Sheet · <b>${con2025}</b> con dato publicado para 2025 · <b>${ids.length - con2025}</b> sin dato (celdas "N/D", "N/A" o vacías, preservadas tal cual las dejó la auditoría).`;
}

/* -------------------------------------------------------------------------
   Arranque
   ------------------------------------------------------------------------- */
async function boot() {
  const overlay = document.getElementById("loading-overlay");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  try {
    const dataset = await window.CGES.loadDataset();
    STATE.dataset = dataset;

    if (dataset.source === "live") {
      statusDot.className = "status-dot";
      statusText.textContent = `Conectado en vivo al Google Sheet · última lectura: ${dataset.fetchedAt.toLocaleTimeString("es-MX")}`;
    } else if (dataset.source === "fallback") {
      statusDot.className = "status-dot warn";
      statusText.textContent = `Modo caché: no se pudo leer el Google Sheet en vivo (${dataset.error?.message || "error de red"}). Mostrando datos de respaldo.`;
    } else {
      throw dataset.error || new Error("Dataset vacío");
    }

    document.getElementById("badge-ultima-edicion").textContent =
      `CNSPE ${AÑO_ULTIMA_EDICION_OFICIAL} (datos con cierre ${AÑO_ULTIMA_EDICION_OFICIAL - 1})`;

    populateAnioSelector();
    renderKPIs();
    window.CGES.renderAllCharts(dataset);
    renderNotaCobertura();
  } catch (fatal) {
    statusDot.className = "status-dot err";
    statusText.textContent = "No fue posible cargar datos (ni en vivo ni de respaldo).";
    console.error(fatal);
  } finally {
    overlay.classList.add("hide");
    setTimeout(() => overlay.remove(), 500);
  }
}

document.addEventListener("DOMContentLoaded", boot);

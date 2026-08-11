/* =========================================================================
   data.js — Panorama Institucional CGES: CNSPE Jalisco vs. Nacional
   (Gestión y desempeño de la institución de seguridad pública estatal)
   -------------------------------------------------------------------------
   FUENTE: Google Sheet "CENSO NACIONAL DE SEGURIDAD PÚBLICA ESTATAL (CNSPE)"
   https://docs.google.com/spreadsheets/d/1uZSnJCKfI2ZHt5nEKKqmb8znstLcwmweghFJfUYe65o
   Hoja única ("Hoja 1", gid=0). El usuario audita y edita este Sheet
   directamente — este archivo NUNCA reinterpreta, corrige ni descarta
   valores; los toma tal cual estén, incluida cualquier celda "N/D" o "N/A".

   NATURALEZA DE ESTE DATASET (distinta a un dashboard de incidencia
   delictiva tipo TODOS/Vehiculos2):
   - No hay eventos individuales ni geolocalización: son ~60 indicadores
     institucionales (personal, presupuesto, infraestructura, cadetes,
     ciberseguridad, aseguramientos, enfrentamientos...), cada uno con
     comparativo Nacional vs. Jalisco, en una serie anual 2021-2026.
   - El Sheet NO tiene una fila de encabezados de columna tradicional: es
     un layout jerárquico armado a mano (bloque de título + subfilas), por
     lo que el parseo es por posición de fila/columna (ver SERIES_DEFS),
     no por nombre de columna como en los dashboards de eventos.
   - Cada año ocupa un PAR de columnas (Nacional=col izquierda del par,
     Jalisco=col derecha), excepto en indicadores donde Nacional y Jalisco
     vienen en FILAS separadas (ambas usando la col izquierda del par).

   Este módulo expone `window.CGES.loadDataset()`, que entrega un objeto
   { series, secciones, source, fetchedAt } listo para charts.js / index.html
   (fases siguientes). No dibuja nada ni asume estructura de HTML.
   ========================================================================= */

const APP_CONFIG = {
  SHEET_ID: "1uZSnJCKfI2ZHt5nEKKqmb8znstLcwmweghFJfUYe65o",
  GID: "0",
  FETCH_TIMEOUT_MS: 15000,
};

const AÑOS = [2021, 2022, 2023, 2024, 2025, 2026];

// Cada año ocupa un par de columnas del Sheet (0-based, A=0,B=1,C=2...).
// Columna izquierda = Nacional (o el único valor si el indicador no separa
// Nacional/Jalisco en la misma fila); columna derecha = Jalisco (solo
// aplica en filas de estilo "paired", ver SERIES_DEFS).
const COLS_POR_AÑO = {
  2021: [1, 2], 2022: [3, 4], 2023: [5, 6],
  2024: [7, 8], 2025: [9, 10], 2026: [11, 12],
};

/* -------------------------------------------------------------------------
   MAPA DE SERIES — una entrada por fila con datos del Sheet.
   fila: índice 0-based de fila (= fila de Sheets − 1). Ej. fila:3 = fila 4.
   estilo:
     'left'   -> la fila trae UN solo valor por año (columna izquierda del
                 par). "rol" indica de qué se trata (nacional / jalisco /
                 nacional_gn / etc.). Se usa cuando Nacional y Jalisco están
                 en filas separadas, o cuando el indicador no tiene
                 comparativo (p. ej. infraestructura, solo Jalisco).
     'paired' -> la fila trae DOS valores por año en la misma fila
                 (izquierda = Nacional, derecha = Jalisco). Se expanden
                 automáticamente en dos series: "<id>__nacional" y
                 "<id>__jalisco".
   ------------------------------------------------------------------------- */
const SERIES_DEFS = [
  // --- Estructura organizacional y recursos ---------------------------------
  { id: "personal_adscrito_total", grupo: "personal_adscrito", seccion: "estructura",
    grupoLabel: "Personal adscrito a las instituciones de seguridad pública estatal",
    etiqueta: "Nacional Total (GN + Estatales)", fila: 3, estilo: "left", rol: "nacional_total", unidad: "personas" },
  { id: "personal_adscrito_gn", grupo: "personal_adscrito", seccion: "estructura",
    grupoLabel: "Personal adscrito a las instituciones de seguridad pública estatal",
    etiqueta: "Nacional - Guardia Nacional", fila: 4, estilo: "left", rol: "nacional_gn", unidad: "personas" },
  { id: "personal_adscrito_estatales", grupo: "personal_adscrito", seccion: "estructura",
    grupoLabel: "Personal adscrito a las instituciones de seguridad pública estatal",
    etiqueta: "Nacional - Estatales", fila: 5, estilo: "left", rol: "nacional_estatales", unidad: "personas" },
  { id: "personal_adscrito_jalisco", grupo: "personal_adscrito", seccion: "estructura",
    grupoLabel: "Personal adscrito a las instituciones de seguridad pública estatal",
    etiqueta: "Jalisco", fila: 6, estilo: "left", rol: "jalisco", unidad: "personas" },

  { id: "tasa_preventiva_nacional", grupo: "tasa_preventiva", seccion: "estructura",
    grupoLabel: "Tasa de elementos de la policía preventiva por cada 1,000 hab.",
    etiqueta: "Nacional", fila: 8, estilo: "left", rol: "nacional", unidad: "tasa" },
  { id: "tasa_preventiva_jalisco", grupo: "tasa_preventiva", seccion: "estructura",
    grupoLabel: "Tasa de elementos de la policía preventiva por cada 1,000 hab.",
    etiqueta: "Jalisco", fila: 9, estilo: "left", rol: "jalisco", unidad: "tasa" },

  { id: "funcion_total", grupo: "personal_por_funcion", seccion: "estructura",
    grupoLabel: "Personal de las corporaciones policiales, por función", etiqueta: "Total",
    fila: 11, estilo: "paired", unidad: "personas" },
  { id: "funcion_transito", grupo: "personal_por_funcion", seccion: "estructura",
    grupoLabel: "Personal de las corporaciones policiales, por función",
    etiqueta: "Policía de tránsito, movilidad y seguridad vial", fila: 12, estilo: "paired", unidad: "personas" },
  { id: "funcion_prevencion", grupo: "personal_por_funcion", seccion: "estructura",
    grupoLabel: "Personal de las corporaciones policiales, por función", etiqueta: "Prevención",
    fila: 13, estilo: "paired", unidad: "personas" },
  { id: "funcion_proximidad", grupo: "personal_por_funcion", seccion: "estructura",
    grupoLabel: "Personal de las corporaciones policiales, por función", etiqueta: "Proximidad social",
    fila: 14, estilo: "paired", unidad: "personas" },
  { id: "funcion_reaccion", grupo: "personal_por_funcion", seccion: "estructura",
    grupoLabel: "Personal de las corporaciones policiales, por función", etiqueta: "Reacción",
    fila: 15, estilo: "paired", unidad: "personas" },
  { id: "funcion_investigacion", grupo: "personal_por_funcion", seccion: "estructura",
    grupoLabel: "Personal de las corporaciones policiales, por función", etiqueta: "Investigación",
    fila: 16, estilo: "paired", unidad: "personas" },

  { id: "cup_total", grupo: "cup", seccion: "estructura",
    grupoLabel: "Personal con Certificado Único Policial (CUP), por tipo de corporación", etiqueta: "Total",
    fila: 18, estilo: "paired", unidad: "personas" },
  { id: "cup_gn", grupo: "cup", seccion: "estructura",
    grupoLabel: "Personal con Certificado Único Policial (CUP), por tipo de corporación",
    etiqueta: "Guardia Nacional", fila: 19, estilo: "paired", unidad: "personas" },
  { id: "cup_preventiva", grupo: "cup", seccion: "estructura",
    grupoLabel: "Personal con Certificado Único Policial (CUP), por tipo de corporación",
    etiqueta: "Policía preventiva", fila: 20, estilo: "paired", unidad: "personas" },
  { id: "cup_transito", grupo: "cup", seccion: "estructura",
    grupoLabel: "Personal con Certificado Único Policial (CUP), por tipo de corporación",
    etiqueta: "Policía de tránsito", fila: 21, estilo: "paired", unidad: "personas" },
  { id: "cup_bancaria", grupo: "cup", seccion: "estructura",
    grupoLabel: "Personal con Certificado Único Policial (CUP), por tipo de corporación",
    etiqueta: "Policía bancaria, comercial y/o auxiliar", fila: 22, estilo: "paired", unidad: "personas" },
  { id: "cup_cibernetica", grupo: "cup", seccion: "estructura",
    grupoLabel: "Personal con Certificado Único Policial (CUP), por tipo de corporación",
    etiqueta: "Policía cibernética", fila: 23, estilo: "paired", unidad: "personas" },
  { id: "cup_otro", grupo: "cup", seccion: "estructura",
    grupoLabel: "Personal con Certificado Único Policial (CUP), por tipo de corporación",
    etiqueta: "Otro tipo de corporación policial", fila: 24, estilo: "paired", unidad: "personas" },
  { id: "cup_no_especificado", grupo: "cup", seccion: "estructura",
    grupoLabel: "Personal con Certificado Único Policial (CUP), por tipo de corporación",
    etiqueta: "No especificado", fila: 25, estilo: "paired", unidad: "personas" },

  { id: "fallecido_total", grupo: "personal_fallecido", seccion: "estructura",
    grupoLabel: "Personal fallecido, según causa de fallecimiento", etiqueta: "Total",
    fila: 27, estilo: "paired", unidad: "personas" },
  { id: "fallecido_naturales", grupo: "personal_fallecido", seccion: "estructura",
    grupoLabel: "Personal fallecido, según causa de fallecimiento", etiqueta: "Causas naturales",
    fila: 28, estilo: "paired", unidad: "personas" },
  { id: "fallecido_doloso", grupo: "personal_fallecido", seccion: "estructura",
    grupoLabel: "Personal fallecido, según causa de fallecimiento", etiqueta: "Homicidio Doloso",
    fila: 29, estilo: "paired", unidad: "personas" },
  { id: "fallecido_culposo", grupo: "personal_fallecido", seccion: "estructura",
    grupoLabel: "Personal fallecido, según causa de fallecimiento", etiqueta: "Homicidio Culposo",
    fila: 30, estilo: "paired", unidad: "personas" },
  { id: "fallecido_accidentes", grupo: "personal_fallecido", seccion: "estructura",
    grupoLabel: "Personal fallecido, según causa de fallecimiento", etiqueta: "Accidentes",
    fila: 31, estilo: "paired", unidad: "personas" },
  { id: "fallecido_suicidio", grupo: "personal_fallecido", seccion: "estructura",
    grupoLabel: "Personal fallecido, según causa de fallecimiento", etiqueta: "Suicidio",
    fila: 32, estilo: "paired", unidad: "personas" },
  { id: "fallecido_otras", grupo: "personal_fallecido", seccion: "estructura",
    grupoLabel: "Personal fallecido, según causa de fallecimiento", etiqueta: "Otras causas externas",
    fila: 33, estilo: "paired", unidad: "personas" },

  { id: "condicion_lesionados", grupo: "condicion_personal", seccion: "estructura",
    grupoLabel: "Personal según condición de lesión, desaparición y jubilación", etiqueta: "Lesionados",
    fila: 35, estilo: "paired", unidad: "personas" },
  { id: "condicion_desaparecidos", grupo: "condicion_personal", seccion: "estructura",
    grupoLabel: "Personal según condición de lesión, desaparición y jubilación", etiqueta: "Desaparecidos",
    fila: 36, estilo: "paired", unidad: "personas" },
  { id: "condicion_jubilados", grupo: "condicion_personal", seccion: "estructura",
    grupoLabel: "Personal según condición de lesión, desaparición y jubilación", etiqueta: "Jubilados",
    fila: 37, estilo: "paired", unidad: "personas" },
  { id: "condicion_renuncio", grupo: "condicion_personal", seccion: "estructura",
    grupoLabel: "Personal según condición de lesión, desaparición y jubilación", etiqueta: "Renunció",
    fila: 38, estilo: "paired", unidad: "personas" },

  { id: "presupuesto_nacional", grupo: "presupuesto", seccion: "estructura",
    grupoLabel: "Presupuesto ejercido (millones de pesos)", etiqueta: "Nacional",
    fila: 40, estilo: "left", rol: "nacional", unidad: "mdp" },
  { id: "presupuesto_jalisco", grupo: "presupuesto", seccion: "estructura",
    grupoLabel: "Presupuesto ejercido (millones de pesos)", etiqueta: "Jalisco",
    fila: 41, estilo: "left", rol: "jalisco", unidad: "mdp" },

  { id: "quejas_jalisco", grupo: "quejas_ciudadanas", seccion: "estructura",
    grupoLabel: "Quejas ciudadanas recibidas en Unidades de Asuntos Internos", etiqueta: "Jalisco",
    fila: 44, estilo: "left", rol: "jalisco", unidad: "quejas" },

  { id: "infra_comandancias", grupo: "infraestructura", seccion: "estructura",
    grupoLabel: "Infraestructura para la seguridad pública — Jalisco",
    etiqueta: "Comandancias, estaciones y subestaciones", fila: 46, estilo: "left", rol: "jalisco", unidad: "unidades" },
  { id: "infra_cuarteles", grupo: "infraestructura", seccion: "estructura",
    grupoLabel: "Infraestructura para la seguridad pública — Jalisco",
    etiqueta: "Cuarteles de policía", fila: 47, estilo: "left", rol: "jalisco", unidad: "unidades" },
  { id: "infra_modulos", grupo: "infraestructura", seccion: "estructura",
    grupoLabel: "Infraestructura para la seguridad pública — Jalisco",
    etiqueta: "Módulos y casetas de policía", fila: 48, estilo: "left", rol: "jalisco", unidad: "unidades" },
  { id: "infra_camaras", grupo: "infraestructura", seccion: "estructura",
    grupoLabel: "Infraestructura para la seguridad pública — Jalisco",
    etiqueta: "Cámaras de vigilancia", fila: 49, estilo: "left", rol: "jalisco", unidad: "unidades" },

  { id: "academias_sedes", grupo: "academias", seccion: "estructura",
    grupoLabel: "Academias o institutos de formación policial — Jalisco",
    etiqueta: "Sedes o planteles", fila: 52, estilo: "left", rol: "jalisco", unidad: "sedes" },

  { id: "cadetes_ingreso_total", grupo: "cadetes_ingreso", seccion: "estructura",
    grupoLabel: "Cadetes que ingresaron, según sexo", etiqueta: "Total", fila: 54, estilo: "paired", unidad: "personas" },
  { id: "cadetes_ingreso_hombres", grupo: "cadetes_ingreso", seccion: "estructura",
    grupoLabel: "Cadetes que ingresaron, según sexo", etiqueta: "Hombres", fila: 55, estilo: "paired", unidad: "personas" },
  { id: "cadetes_ingreso_mujeres", grupo: "cadetes_ingreso", seccion: "estructura",
    grupoLabel: "Cadetes que ingresaron, según sexo", etiqueta: "Mujeres", fila: 56, estilo: "paired", unidad: "personas" },

  { id: "cadetes_egreso_total", grupo: "cadetes_egreso", seccion: "estructura",
    grupoLabel: "Cadetes que egresaron, según sexo", etiqueta: "Total", fila: 58, estilo: "paired", unidad: "personas" },
  { id: "cadetes_egreso_hombres", grupo: "cadetes_egreso", seccion: "estructura",
    grupoLabel: "Cadetes que egresaron, según sexo", etiqueta: "Hombres", fila: 59, estilo: "paired", unidad: "personas" },
  { id: "cadetes_egreso_mujeres", grupo: "cadetes_egreso", seccion: "estructura",
    grupoLabel: "Cadetes que egresaron, según sexo", etiqueta: "Mujeres", fila: 60, estilo: "paired", unidad: "personas" },

  { id: "cadetes_desercion_total", grupo: "cadetes_desercion", seccion: "estructura",
    grupoLabel: "Cadetes que desertaron, según sexo", etiqueta: "Total", fila: 62, estilo: "paired", unidad: "personas" },
  { id: "cadetes_desercion_hombres", grupo: "cadetes_desercion", seccion: "estructura",
    grupoLabel: "Cadetes que desertaron, según sexo", etiqueta: "Hombres", fila: 63, estilo: "paired", unidad: "personas" },
  { id: "cadetes_desercion_mujeres", grupo: "cadetes_desercion", seccion: "estructura",
    grupoLabel: "Cadetes que desertaron, según sexo", etiqueta: "Mujeres", fila: 64, estilo: "paired", unidad: "personas" },

  // --- Ejercicio de la función de seguridad pública estatal ------------------
  { id: "llamadas_total", grupo: "llamadas", seccion: "ejercicio",
    grupoLabel: "Llamadas procedentes recibidas, por sistema telefónico de emergencia", etiqueta: "Total",
    fila: 67, estilo: "paired", unidad: "llamadas" },
  { id: "llamadas_911", grupo: "llamadas", seccion: "ejercicio",
    grupoLabel: "Llamadas procedentes recibidas, por sistema telefónico de emergencia", etiqueta: "Sistema 911",
    fila: 68, estilo: "paired", unidad: "llamadas" },
  { id: "llamadas_089", grupo: "llamadas", seccion: "ejercicio",
    grupoLabel: "Llamadas procedentes recibidas, por sistema telefónico de emergencia", etiqueta: "Sistema 089",
    fila: 69, estilo: "paired", unidad: "llamadas" },
  { id: "llamadas_otro", grupo: "llamadas", seccion: "ejercicio",
    grupoLabel: "Llamadas procedentes recibidas, por sistema telefónico de emergencia", etiqueta: "Otro sistema",
    fila: 70, estilo: "paired", unidad: "llamadas" },

  { id: "puestas_justicia_civica", grupo: "puestas_disposicion", seccion: "ejercicio",
    grupoLabel: "Puestas a disposición de personas, por autoridad", etiqueta: "Ante Juez Cívico u Oficial Calificador",
    fila: 72, estilo: "paired", unidad: "puestas" },
  { id: "puestas_ministerio_publico", grupo: "puestas_disposicion", seccion: "ejercicio",
    grupoLabel: "Puestas a disposición de personas, por autoridad", etiqueta: "Ante el Ministerio Público",
    fila: 73, estilo: "paired", unidad: "puestas" },
  { id: "puestas_objetos", grupo: "puestas_disposicion", seccion: "ejercicio",
    grupoLabel: "Puestas a disposición de personas, por autoridad", etiqueta: "Puestas a disposición de objetos",
    fila: 74, estilo: "paired", unidad: "puestas" },
  { id: "puestas_total_objetos_personas", grupo: "puestas_disposicion", seccion: "ejercicio",
    grupoLabel: "Puestas a disposición de personas, por autoridad",
    etiqueta: "Total (objetos y personas)", fila: 75, estilo: "paired", unidad: "puestas" },

  { id: "armas_jalisco", grupo: "armas_aseguradas", seccion: "ejercicio",
    grupoLabel: "Armas de fuego aseguradas — Jalisco", etiqueta: "Jalisco",
    fila: 77, estilo: "left", rol: "jalisco", unidad: "armas" },

  { id: "victimas_total", grupo: "victimas_atendidas", seccion: "ejercicio",
    grupoLabel: "Víctimas atendidas, según sexo", etiqueta: "Total", fila: 79, estilo: "paired", unidad: "personas" },

  { id: "boletas_infraccion", grupo: "boletas", seccion: "ejercicio",
    grupoLabel: "Boletas de infracción levantadas e imágenes detectadas",
    etiqueta: "Boletas de infracción levantadas", fila: 81, estilo: "paired", unidad: "boletas" },

  { id: "enfrentamientos_nacional", grupo: "enfrentamientos", seccion: "ejercicio",
    grupoLabel: "Enfrentamientos con elementos de seguridad pública estatal", etiqueta: "Nacional",
    fila: 83, estilo: "left", rol: "nacional", unidad: "eventos" },
  { id: "enfrentamientos_jalisco", grupo: "enfrentamientos", seccion: "ejercicio",
    grupoLabel: "Enfrentamientos con elementos de seguridad pública estatal", etiqueta: "Jalisco",
    fila: 84, estilo: "left", rol: "jalisco", unidad: "eventos" },

  { id: "civiles_lesionados", grupo: "civiles_armados", seccion: "ejercicio",
    grupoLabel: "Civiles armados involucrados en enfrentamientos", etiqueta: "Lesionados",
    fila: 86, estilo: "paired", unidad: "personas" },
  { id: "civiles_fallecidos", grupo: "civiles_armados", seccion: "ejercicio",
    grupoLabel: "Civiles armados involucrados en enfrentamientos", etiqueta: "Fallecidos",
    fila: 87, estilo: "paired", unidad: "personas" },
  { id: "civiles_detenidos", grupo: "civiles_armados", seccion: "ejercicio",
    grupoLabel: "Civiles armados involucrados en enfrentamientos", etiqueta: "Detenidos",
    fila: 88, estilo: "paired", unidad: "personas" },

  { id: "personal_enf_lesionados", grupo: "personal_en_enfrentamientos", seccion: "ejercicio",
    grupoLabel: "Personal de seguridad pública lesionado/fallecido en enfrentamientos", etiqueta: "Lesionados",
    fila: 90, estilo: "paired", unidad: "personas" },
  { id: "personal_enf_fallecidos", grupo: "personal_en_enfrentamientos", seccion: "ejercicio",
    grupoLabel: "Personal de seguridad pública lesionado/fallecido en enfrentamientos", etiqueta: "Fallecidos",
    fila: 91, estilo: "paired", unidad: "personas" },

  { id: "empresas_nacional", grupo: "empresas_seguridad_privada", seccion: "ejercicio",
    grupoLabel: "Empresas de seguridad privada registradas", etiqueta: "Nacional",
    fila: 93, estilo: "left", rol: "nacional", unidad: "empresas" },
  { id: "empresas_jalisco", grupo: "empresas_seguridad_privada", seccion: "ejercicio",
    grupoLabel: "Empresas de seguridad privada registradas", etiqueta: "Jalisco",
    fila: 94, estilo: "left", rol: "jalisco", unidad: "empresas" },
];

/* -------------------------------------------------------------------------
   1) FETCH DEL GOOGLE SHEET (gviz/tq) — misma convención que los demás
      dashboards CGES (nunca /export?format=csv, ver cges/data-mapping.md).
   ------------------------------------------------------------------------- */
function buildGvizUrl() {
  return `https://docs.google.com/spreadsheets/d/${APP_CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&gid=${APP_CONFIG.GID}`;
}

// Devuelve la tabla cruda como arreglo de arreglos (fila -> [valores]),
// usando el valor NUMÉRICO (.v) cuando gviz lo reconoce como tal, y el
// texto formateado (.f) para el resto (etiquetas, "N/D", "N/A", "$ ...").
// A diferencia de un dashboard de eventos (parseGvizResponse por columna),
// aquí NO hay fila de encabezados de columna real, así que se preserva la
// matriz completa por posición.
function parseGvizToMatrix(text) {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
  return parsed.table.rows.map(r =>
    (r.c || []).map(cell => {
      if (!cell) return null;
      if (typeof cell.v === "number") return cell.v;
      if (cell.v === null || cell.v === undefined) return cell.f ?? null;
      return cell.f !== undefined && cell.f !== null ? cell.f : cell.v;
    })
  );
}

async function fetchSheetMatrix() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG.FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(buildGvizUrl(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return parseGvizToMatrix(text);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/* -------------------------------------------------------------------------
   2) LECTURA DE CELDAS — sin reinterpretar el dato: "N/D"/"N/A"/vacío se
      preservan tal cual (null + bandera), nunca se convierten en 0.
   ------------------------------------------------------------------------- */
const ETIQUETAS_NO_DATO = new Set(["N/D", "N/A", "", null, undefined]);

function celda(matrix, fila, col) {
  const row = matrix[fila];
  if (!row) return { valor: null, crudo: null };
  const raw = row[col];
  if (ETIQUETAS_NO_DATO.has(raw)) return { valor: null, crudo: raw ?? null };
  if (typeof raw === "number") return { valor: raw, crudo: raw };
  // Texto tipo "$ 96,571.40" o "362,100" -> número. Si no se puede parsear,
  // se conserva el texto crudo y valor=null (mejor esfuerzo, no se inventa).
  const limpio = raw.toString().replace(/[^0-9.\-]/g, "");
  const n = limpio ? parseFloat(limpio) : NaN;
  return { valor: isNaN(n) ? null : n, crudo: raw };
}

/* -------------------------------------------------------------------------
   3) CONSTRUCCIÓN DEL DATASET a partir de SERIES_DEFS + la matriz cruda
   ------------------------------------------------------------------------- */
function construirDataset(matrix) {
  const series = {};

  function serieVacia(def, rol, etiquetaExtra) {
    return {
      id: etiquetaExtra ? `${def.id}__${rol}` : def.id,
      grupo: def.grupo,
      grupoLabel: def.grupoLabel,
      seccion: def.seccion,
      etiqueta: def.etiqueta,
      rol,
      unidad: def.unidad,
      filaSheet: def.fila + 1, // para depuración / trazabilidad (1-based, como en Sheets)
      valores: {},   // { 2021: numero|null, ... }
      crudos: {},    // valor de texto tal cual vino, para auditoría
    };
  }

  SERIES_DEFS.forEach(def => {
    if (def.estilo === "left") {
      const s = serieVacia(def, def.rol, false);
      AÑOS.forEach(año => {
        const [colIzq] = COLS_POR_AÑO[año];
        const { valor, crudo } = celda(matrix, def.fila, colIzq);
        s.valores[año] = valor;
        s.crudos[año] = crudo;
      });
      series[s.id] = s;
    } else if (def.estilo === "paired") {
      const sNac = serieVacia(def, "nacional", true);
      const sJal = serieVacia(def, "jalisco", true);
      AÑOS.forEach(año => {
        const [colIzq, colDer] = COLS_POR_AÑO[año];
        const nac = celda(matrix, def.fila, colIzq);
        const jal = celda(matrix, def.fila, colDer);
        sNac.valores[año] = nac.valor; sNac.crudos[año] = nac.crudo;
        sJal.valores[año] = jal.valor; sJal.crudos[año] = jal.crudo;
      });
      series[sNac.id] = sNac;
      series[sJal.id] = sJal;
    }
  });

  // Agrupación por sección/grupo, útil para armar el índice de secciones del
  // HTML (Fase 2) sin tener que recorrer SERIES_DEFS de nuevo ahí.
  const secciones = {};
  Object.values(series).forEach(s => {
    secciones[s.seccion] = secciones[s.seccion] || {};
    secciones[s.seccion][s.grupo] = secciones[s.seccion][s.grupo] || {
      grupoLabel: s.grupoLabel, seriesIds: [],
    };
    secciones[s.seccion][s.grupo].seriesIds.push(s.id);
  });

  return { series, secciones };
}

/* -------------------------------------------------------------------------
   4) CARGA PRINCIPAL — con respaldo local (fallback.json) si falla el
      fetch en vivo, mismo patrón que los demás dashboards CGES.
   ------------------------------------------------------------------------- */
async function loadDataset() {
  try {
    const matrix = await fetchSheetMatrix();
    if (!matrix.length) throw new Error("El Sheet respondió vacío");
    const dataset = construirDataset(matrix);
    return { ...dataset, source: "live", fetchedAt: new Date() };
  } catch (err) {
    console.warn("No se pudo leer el Google Sheet en vivo, usando datos de respaldo:", err);
    const fallback = await fetch("fallback.json").then(r => r.json()).catch(() => null);
    if (!fallback) return { series: {}, secciones: {}, source: "error", fetchedAt: null, error: err };
    return { ...fallback, source: "fallback", fetchedAt: null, error: err };
  }
}

if (typeof window !== "undefined") {
  window.CGES = window.CGES || {};
  Object.assign(window.CGES, {
    APP_CONFIG, AÑOS, COLS_POR_AÑO, SERIES_DEFS,
    loadDataset, construirDataset, parseGvizToMatrix,
  });
}

// Exportado también como módulo CommonJS para pruebas con Node (ver
// test/run_tests.js) — no afecta el uso normal en navegador.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { APP_CONFIG, AÑOS, COLS_POR_AÑO, SERIES_DEFS, construirDataset };
}

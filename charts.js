/* =========================================================================
   charts.js — Gráficas del Panorama Institucional CGES (Fase 3)
   -------------------------------------------------------------------------
   Dos arquetipos reutilizables cubren los 21 grupos de indicadores:

   1) SERIE TEMPORAL (buildSerieOption): línea/barra 2021-2026, con eje
      secundario cuando la magnitud Nacional vs. Jalisco lo amerita (ver
      SERIE_TEMPORAL_DEFS -> ejeDoble). 2026 se muestra igual que cualquier
      otro año (decisión editorial explícita del usuario, 11-ago-2026) —
      queda en blanco únicamente donde el Sheet todavía no tiene el dato.

   2) COMPOSICIÓN (buildComposicionOption): dos barras 100% apiladas
      (Nacional | Jalisco) en el año más reciente con dato completo,
      para grupos donde el indicador se reporta por categorías (función
      policial, causa de fallecimiento, sistema telefónico, etc.).

   Cada gráfica se acompaña de un <div class="insight"> con 1-2 líneas
   calculadas a partir del dato real (nunca texto genérico) — mismo
   estándar que exige la skill CGES/SPECIALIST para el banco de gráficas.
   No se dibuja nada si el dato no existe: se declara "Sin datos" en vez
   de inventar o interpolar (ver checklist de auditoría, SPECIALIST §4).
   ========================================================================= */

const ANIOS_CHART = [2021, 2022, 2023, 2024, 2025, 2026];

// Paleta sin naranja: el naranja es el color identitario de Movimiento
// Ciudadano (partido en el gobierno de Jalisco) — usarlo en un dashboard
// institucional de la CGES se presta a lectura política involuntaria.
// "jalisco" pasa a un dorado/mostaza, coherente con el acento secundario
// que la identidad visual de CGES ya contemplaba (skill cges, pendiente de
// HEX definitivo) — de paso resuelve ese pendiente.
const COLOR = {
  nacional: "#1B4F91", jalisco: "#C9A227",
  serie3: "#1FA35C", serie4: "#2E6DB4", serie5: "#D64545", serie6: "#6B4FA0", serie7: "#8A6D3B",
};
const PALETA_CATEGORICA = [COLOR.nacional, COLOR.jalisco, COLOR.serie3, COLOR.serie4, COLOR.serie5, COLOR.serie6, COLOR.serie7];

// unidad-aware: "tasa" conserva 1-2 decimales, "mdp" hasta 1, el resto (conteos
// de personas/empresas/eventos/etc.) se redondea a entero. Antes esta función
// siempre redondeaba, por lo que una tasa como 0.90 se leía "1" en el texto.
function fmtN(n, unidad) {
  if (n === null || n === undefined) return "s/d";
  if (unidad === "tasa") return n.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  if (unidad === "mdp") return n.toLocaleString("es-MX", { maximumFractionDigits: 1 });
  return Math.round(n).toLocaleString("es-MX");
}
function pct(n, dec = 1) {
  if (n === null || n === undefined || isNaN(n)) return "s/d";
  return n.toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + "%";
}

/* -------------------------------------------------------------------------
   ARQUETIPO 1 — SERIE TEMPORAL
   ------------------------------------------------------------------------- */
// nacionalId/jaliscoId: identifican explícitamente qué serie del grupo es
// Nacional y cuál es Jalisco, para el texto del insight (dos líneas propias,
// una por rol) y la % de participación. null cuando el rol no existe en el
// grupo (ej. "infraestructura", donde todo es Jalisco). Se declaran aparte
// de primario/secundario porque esos dos arreglos solo controlan el eje del
// gráfico (izquierdo/derecho), no el rol Nacional/Jalisco — confundirlos fue
// la causa del bug de "% nacional" en infraestructura.
const SERIE_TEMPORAL_DEFS = {
  personal_adscrito: {
    primario: ["personal_adscrito_total", "personal_adscrito_gn", "personal_adscrito_estatales"],
    secundario: ["personal_adscrito_jalisco"],
    nombres: { personal_adscrito_total: "Nacional Total (GN+Estatales)", personal_adscrito_gn: "Guardia Nacional",
      personal_adscrito_estatales: "Nacional - Estatales", personal_adscrito_jalisco: "Jalisco" },
    tipo: "line", unidadEje2: "personas",
    nacionalId: "personal_adscrito_total", jaliscoId: "personal_adscrito_jalisco",
  },
  tasa_preventiva: {
    primario: ["tasa_preventiva_nacional", "tasa_preventiva_jalisco"], secundario: [],
    nombres: { tasa_preventiva_nacional: "Nacional", tasa_preventiva_jalisco: "Jalisco" }, tipo: "line",
    nacionalId: "tasa_preventiva_nacional", jaliscoId: "tasa_preventiva_jalisco",
    // Una tasa por cada 1,000 hab. no es una cantidad sumable: "Jalisco
    // representó X% del total nacional" no tiene sentido para un ratio.
    // (Detectado en mi propia validación antes de entregar: al agregar
    // jaliscoId explícito, este grupo empezó a calcular ese % sin querer.)
    comparaNacional: false,
  },
  presupuesto: {
    primario: ["presupuesto_nacional"], secundario: ["presupuesto_jalisco"],
    nombres: { presupuesto_nacional: "Nacional", presupuesto_jalisco: "Jalisco" }, tipo: "line", unidadEje2: "mdp",
    nacionalId: "presupuesto_nacional", jaliscoId: "presupuesto_jalisco",
  },
  quejas_ciudadanas: {
    primario: ["quejas_jalisco"], secundario: [],
    nombres: { quejas_jalisco: "Jalisco" }, tipo: "bar",
    nacionalId: null, jaliscoId: "quejas_jalisco",
  },
  infraestructura: {
    primario: ["infra_comandancias", "infra_cuarteles", "infra_modulos"], secundario: ["infra_camaras"],
    nombres: { infra_comandancias: "Comandancias y subestaciones", infra_cuarteles: "Cuarteles",
      infra_modulos: "Módulos y casetas", infra_camaras: "Cámaras de vigilancia" },
    tipo: "line", unidadEje2: "cámaras",
    // Todas las series de este grupo son de Jalisco: el eje secundario solo
    // separa la escala de "cámaras" para que se pueda graficar, NO marca un
    // rol Nacional/Jalisco. Sin este flag, insightSerie() calculaba un
    // "% del total nacional" sin sentido (cámaras-Jalisco / comandancias-Jalisco).
    comparaNacional: false,
    nacionalId: null, jaliscoId: null,
  },
  armas_aseguradas: {
    primario: ["armas_jalisco"], secundario: [], nombres: { armas_jalisco: "Jalisco" }, tipo: "bar",
    nacionalId: null, jaliscoId: "armas_jalisco",
  },
  boletas: {
    primario: ["boletas_infraccion__nacional"], secundario: ["boletas_infraccion__jalisco"],
    nombres: { boletas_infraccion__nacional: "Nacional", boletas_infraccion__jalisco: "Jalisco" }, tipo: "line",
    nacionalId: "boletas_infraccion__nacional", jaliscoId: "boletas_infraccion__jalisco",
  },
  victimas_atendidas: {
    primario: ["victimas_total__nacional"], secundario: ["victimas_total__jalisco"],
    nombres: { victimas_total__nacional: "Nacional", victimas_total__jalisco: "Jalisco" }, tipo: "line",
    nacionalId: "victimas_total__nacional", jaliscoId: "victimas_total__jalisco",
  },
  enfrentamientos: {
    primario: ["enfrentamientos_nacional"], secundario: ["enfrentamientos_jalisco"],
    nombres: { enfrentamientos_nacional: "Nacional", enfrentamientos_jalisco: "Jalisco" }, tipo: "line",
    nacionalId: "enfrentamientos_nacional", jaliscoId: "enfrentamientos_jalisco",
  },
  empresas_seguridad_privada: {
    primario: ["empresas_nacional"], secundario: ["empresas_jalisco"],
    nombres: { empresas_nacional: "Nacional", empresas_jalisco: "Jalisco" }, tipo: "line",
    nacionalId: "empresas_nacional", jaliscoId: "empresas_jalisco",
  },
};

function buildSerieOption(def, series) {
  const todasLasIds = [...def.primario, ...def.secundario];
  const disponibles = todasLasIds.filter(id => series[id]);
  const legend = disponibles.map(id => def.nombres[id] || id);

  const ejeDoble = def.secundario.length > 0;

  // Los dos ejes se auto-escalaban de forma independiente: con magnitudes
  // muy distintas (Jalisco suele ser ~1/10 del Nacional) eso puede hacer que
  // ambas líneas parezcan "del mismo tamaño" y se lea como si Jalisco
  // estuviera a la par de lo nacional. Para evitar esa falsa interpretación,
  // el eje secundario recibe más aire (2.3x su propio máximo) para que su
  // línea quede siempre en la mitad inferior de la gráfica, y el primario
  // solo el margen normal de lectura (1.15x).
  let yAxis;
  if (ejeDoble) {
    const valsPrim = [], valsSec = [];
    disponibles.forEach(id => {
      const esSec = def.secundario.includes(id);
      ANIOS_CHART.forEach(a => {
        const v = series[id].valores[a];
        if (v !== null) (esSec ? valsSec : valsPrim).push(v);
      });
    });
    const maxPrim = valsPrim.length ? Math.max(...valsPrim) : null;
    const maxSec = valsSec.length ? Math.max(...valsSec) : null;
    yAxis = [
      { type: "value", name: "", min: 0, max: maxPrim !== null ? Math.ceil(maxPrim * 1.15) : undefined },
      { type: "value", name: def.unidadEje2 || "", position: "right", splitLine: { show: false },
        min: 0, max: maxSec !== null ? Math.ceil(maxSec * 2.3) : undefined },
    ];
  } else {
    yAxis = [{ type: "value" }];
  }

  const seriesOpt = disponibles.map((id, i) => {
    const s = series[id];
    const esSecundario = def.secundario.includes(id);
    const esBarra = def.tipo === "bar";
    return {
      name: def.nombres[id] || id,
      type: esBarra ? "bar" : "line",
      smooth: def.tipo === "line",
      yAxisIndex: esSecundario ? 1 : 0,
      color: PALETA_CATEGORICA[i % PALETA_CATEGORICA.length],
      data: ANIOS_CHART.map(a => s.valores[a] ?? null),
      connectNulls: false,
      // Gráficas de barra (quejas_ciudadanas, armas_aseguradas): valor total
      // visible arriba de cada barra, para no depender del hover.
      label: esBarra
        ? { show: true, position: "top", fontSize: 11, fontWeight: 700, color: "#1F2937", formatter: (p) => fmtN(p.value, s.unidad) }
        : { show: false },
    };
  });

  return {
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        if (!params.length) return "";
        const filas = params
          .filter(p => p.value !== null && p.value !== undefined)
          .map(p => `${p.marker} ${p.seriesName}: ${fmtN(p.value, series[disponibles[p.seriesIndex]]?.unidad)}`)
          .join("<br/>");
        return `<b>${params[0].axisValueLabel || params[0].name}</b><br/>${filas || "Sin datos"}`;
      },
    },
    legend: { data: legend, bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 30, left: 8, right: ejeDoble ? 8 : 8, bottom: 40, containLabel: true },
    xAxis: { type: "category", data: ANIOS_CHART.map(String) },
    yAxis,
    series: seriesOpt,
  };
}

// Insight de texto: una línea con la tendencia 2021->último año disponible
// de Nacional, otra de Jalisco (cuando el grupo tiene ambos roles), más el %
// que Jalisco representa del Nacional en el año más reciente compartido.
// Usa fmtN(valor, unidad) para no redondear tasas/mdp a entero.
function lineaTendencia(id, series, prefijo) {
  const s = series[id];
  if (!s) return null;
  const añosConDato = ANIOS_CHART.filter(a => s.valores[a] !== null);
  if (!añosConDato.length) return null;
  if (añosConDato.length < 2) {
    const unico = añosConDato[0];
    return `${prefijo}: único dato disponible ${fmtN(s.valores[unico], s.unidad)} en ${unico}.`;
  }
  const primero = añosConDato[0], ultimo = añosConDato[añosConDato.length - 1];
  const v0 = s.valores[primero], v1 = s.valores[ultimo];
  const variacion = v0 ? ((v1 - v0) / v0) * 100 : null;
  const dir = variacion === null ? "" : variacion > 0 ? "un incremento de" : variacion < 0 ? "una disminución de" : "sin variación —";
  return `${prefijo}: de ${fmtN(v0, s.unidad)} (${primero}) a ${fmtN(v1, s.unidad)} (${ultimo})` +
    (variacion !== null ? `, ${dir} ${pct(Math.abs(variacion))}.` : ".");
}

function insightSerie(def, series) {
  const partes = [];

  if (def.nacionalId) {
    const t = lineaTendencia(def.nacionalId, series, "Nacional");
    if (t) partes.push(t);
  }
  if (def.jaliscoId) {
    const t = lineaTendencia(def.jaliscoId, series, "Jalisco");
    if (t) partes.push(t);
  }
  // Grupos sin roles Nacional/Jalisco explícitos (ej. infraestructura): usar
  // la primera serie disponible del grupo, como antes.
  if (!def.nacionalId && !def.jaliscoId) {
    const primeraConDato = [...def.primario, ...def.secundario].find(id => series[id]);
    if (primeraConDato) {
      const t = lineaTendencia(primeraConDato, series, def.nombres[primeraConDato] || primeraConDato);
      if (t) partes.push(t);
    }
  }

  if (!partes.length) return "Sin datos suficientes para calcular una tendencia.";

  // Participación de Jalisco respecto al Nacional, solo si el grupo tiene
  // roles genuinamente distintos (Nacional vs. Jalisco). Grupos donde
  // primario/secundario solo separan escalas de graficación —todas sus
  // series son de Jalisco, ej. "infraestructura"— deben declararse con
  // `comparaNacional: false` para no calcular un % sin sentido.
  if (def.comparaNacional !== false && def.nacionalId && def.jaliscoId && series[def.nacionalId] && series[def.jaliscoId]) {
    const sNac = series[def.nacionalId], sJal = series[def.jaliscoId];
    const añoRef = [...ANIOS_CHART].reverse().find(a => sNac.valores[a] !== null && sJal.valores[a] !== null);
    if (añoRef) {
      const nac = sNac.valores[añoRef], jal = sJal.valores[añoRef];
      if (nac) partes.push(`En ${añoRef}, Jalisco representó ${pct((jal / nac) * 100)} del total nacional.`);
    }
  }

  return partes.join(" ");
}

/* -------------------------------------------------------------------------
   ARQUETIPO 2 — COMPOSICIÓN (100% apilado, Nacional | Jalisco, año más
   reciente con datos completos en ambas columnas)
   ------------------------------------------------------------------------- */
const COMPOSICION_DEFS = {
  personal_por_funcion: {
    categorias: ["funcion_prevencion", "funcion_proximidad", "funcion_reaccion", "funcion_investigacion", "funcion_transito"],
    etiquetas: { funcion_prevencion: "Prevención", funcion_proximidad: "Proximidad social", funcion_reaccion: "Reacción",
      funcion_investigacion: "Investigación", funcion_transito: "Tránsito, movilidad y seg. vial" },
  },
  cup: {
    categorias: ["cup_preventiva", "cup_transito", "cup_bancaria", "cup_cibernetica", "cup_otro", "cup_no_especificado"],
    etiquetas: { cup_preventiva: "Preventiva", cup_transito: "Tránsito", cup_bancaria: "Bancaria/comercial/auxiliar",
      cup_cibernetica: "Cibernética", cup_otro: "Otro tipo", cup_no_especificado: "No especificado" },
  },
  personal_fallecido: {
    categorias: ["fallecido_naturales", "fallecido_doloso", "fallecido_culposo", "fallecido_accidentes", "fallecido_suicidio", "fallecido_otras"],
    etiquetas: { fallecido_naturales: "Causas naturales", fallecido_doloso: "Homicidio doloso", fallecido_culposo: "Homicidio culposo",
      fallecido_accidentes: "Accidentes", fallecido_suicidio: "Suicidio", fallecido_otras: "Otras causas externas" },
  },
  condicion_personal: {
    categorias: ["condicion_lesionados", "condicion_desaparecidos", "condicion_jubilados", "condicion_renuncio"],
    etiquetas: { condicion_lesionados: "Lesionados", condicion_desaparecidos: "Desaparecidos",
      condicion_jubilados: "Jubilados", condicion_renuncio: "Renunció" },
  },
  llamadas: {
    categorias: ["llamadas_911", "llamadas_089", "llamadas_otro"],
    etiquetas: { llamadas_911: "Sistema 911", llamadas_089: "Sistema 089", llamadas_otro: "Otro sistema" },
  },
  puestas_disposicion: {
    categorias: ["puestas_justicia_civica", "puestas_ministerio_publico"],
    etiquetas: { puestas_justicia_civica: "Ante Juez Cívico", puestas_ministerio_publico: "Ante Ministerio Público" },
  },
  civiles_armados: {
    categorias: ["civiles_lesionados", "civiles_fallecidos", "civiles_detenidos"],
    etiquetas: { civiles_lesionados: "Lesionados", civiles_fallecidos: "Fallecidos", civiles_detenidos: "Detenidos" },
  },
  personal_en_enfrentamientos: {
    categorias: ["personal_enf_lesionados", "personal_enf_fallecidos"],
    etiquetas: { personal_enf_lesionados: "Lesionados", personal_enf_fallecidos: "Fallecidos" },
  },
  cadetes_ingreso: {
    categorias: ["cadetes_ingreso_hombres", "cadetes_ingreso_mujeres"],
    etiquetas: { cadetes_ingreso_hombres: "Hombres", cadetes_ingreso_mujeres: "Mujeres" },
  },
  cadetes_egreso: {
    categorias: ["cadetes_egreso_hombres", "cadetes_egreso_mujeres"],
    etiquetas: { cadetes_egreso_hombres: "Hombres", cadetes_egreso_mujeres: "Mujeres" },
  },
  cadetes_desercion: {
    categorias: ["cadetes_desercion_hombres", "cadetes_desercion_mujeres"],
    etiquetas: { cadetes_desercion_hombres: "Hombres", cadetes_desercion_mujeres: "Mujeres" },
  },
};

// Año más reciente en que HAY dato para al menos una categoría del rol dado
// (no se exige el desglose completo: algunas categorías, p. ej. "Tránsito"
// en Personal por función, casi nunca se reportan para Jalisco, y aun así
// el resto del desglose sigue siendo información válida y útil).
function mejorAñoComposicion(categorias, series, rol) {
  for (let i = ANIOS_CHART.length - 1; i >= 0; i--) {
    const a = ANIOS_CHART[i];
    const algunaConDato = categorias.some(cat => {
      const s = series[`${cat}__${rol}`];
      return s && s.valores[a] !== null;
    });
    if (algunaConDato) return a;
  }
  return null;
}

function buildComposicionOption(def, series) {
  const añoNac = mejorAñoComposicion(def.categorias, series, "nacional");
  const añoJal = mejorAñoComposicion(def.categorias, series, "jalisco");
  const etiquetasCat = def.categorias.map(c => def.etiquetas[c] || c);

  // Valores absolutos por categoría y columna (Nacional | Jalisco).
  const crudos = def.categorias.map(cat => {
    const sNac = series[`${cat}__nacional`], sJal = series[`${cat}__jalisco`];
    const vNac = añoNac && sNac ? sNac.valores[añoNac] : null;
    const vJal = añoJal && sJal ? sJal.valores[añoJal] : null;
    return [vNac, vJal];
  });

  // Totales por columna, para normalizar a 100% real. Jalisco suele ser
  // ~1/10 del Nacional en magnitud absoluta; apilar valores crudos hacía
  // que la barra de Jalisco se viera minúscula o invisible. Aquí cada
  // barra representa el 100% de SU PROPIA columna, para comparar
  // proporciones (no magnitudes) entre Nacional y Jalisco.
  const totalNac = crudos.reduce((acc, [vNac]) => acc + (vNac ?? 0), 0);
  const totalJal = crudos.reduce((acc, [, vJal]) => acc + (vJal ?? 0), 0);

  const seriesOpt = def.categorias.map((cat, i) => {
    const [vNac, vJal] = crudos[i];
    const pNac = vNac !== null && totalNac ? (vNac / totalNac) * 100 : null;
    const pJal = vJal !== null && totalJal ? (vJal / totalJal) * 100 : null;
    return {
      name: etiquetasCat[i],
      type: "bar",
      stack: "total",
      barWidth: "55%",
      color: PALETA_CATEGORICA[i % PALETA_CATEGORICA.length],
      data: [
        { value: pNac, crudo: vNac },
        { value: pJal, crudo: vJal },
      ],
      label: { show: false },
    };
  });

  // Serie invisible (altura 0) que solo sirve para mostrar el TOTAL real
  // de cada columna como etiqueta encima de la barra, sin tener que pasar
  // el cursor. No aparece en la leyenda ni en el tooltip.
  const totalSerie = {
    name: "__total",
    type: "bar",
    stack: "total",
    barWidth: "55%",
    data: [0, 0],
    itemStyle: { color: "transparent" },
    silent: true,
    clip: false,
    z: 10,
    tooltip: { show: false },
    label: {
      show: true,
      position: "top",
      fontWeight: 700,
      fontSize: 12,
      color: "#1F2937",
      formatter: (p) => fmtN(p.dataIndex === 0 ? totalNac : totalJal),
    },
  };

  return {
    tooltip: {
      // trigger:"axis" (antes "item"): al tocar/pasar el cursor sobre
      // CUALQUIER parte de una columna, muestra TODAS sus categorías de una
      // vez — incluidas las muy pequeñas para posicionar el cursor encima
      // en pantallas táctiles (móvil/tablet). "item" solo mostraba la que
      // estaba justo debajo del cursor.
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const visibles = params.filter(p => p.seriesName !== "__total");
        if (!visibles.length) return "";
        const filas = visibles.map(p => {
          const crudo = p.data && p.data.crudo;
          const valorTxt = crudo !== null && crudo !== undefined ? fmtN(crudo) : "s/d";
          const valorPct = typeof p.value === "number" ? p.value.toFixed(1) : "0.0";
          return `${p.marker} ${p.seriesName}: ${valorTxt} (${valorPct}%)`;
        }).join("<br/>");
        return `<b>${visibles[0].axisValueLabel}</b><br/>${filas}`;
      },
    },
    legend: { data: etiquetasCat, bottom: 0, textStyle: { fontSize: 11 } },
    // top:44 (antes 34) para dar más aire al label de total; en "Personal
    // fallecido, según causa" el total de Nacional no se veía en el PDF —
    // los datos y el % validan correctos (ver auditoría), así que el fix
    // es de margen/recorte de renderizado, no de cálculo.
    grid: { top: 44, left: 8, right: 8, bottom: 40, containLabel: true },
    xAxis: { type: "category", data: [`Nacional${añoNac ? " (" + añoNac + ")" : ""}`, `Jalisco${añoJal ? " (" + añoJal + ")" : ""}`] },
    yAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
    series: [...seriesOpt, totalSerie],
  };
}

function insightComposicion(def, series) {
  const añoJal = mejorAñoComposicion(def.categorias, series, "jalisco");
  if (!añoJal) return "Jalisco no tiene el desglose completo por categoría en ningún año disponible.";
  let max = null, maxVal = -Infinity, suma = 0, conDato = 0;
  def.categorias.forEach(cat => {
    const s = series[`${cat}__jalisco`];
    const v = s ? s.valores[añoJal] : null;
    if (v !== null) { suma += v; conDato++; if (v > maxVal) { maxVal = v; max = cat; } }
  });
  if (!max || suma === 0) return `Sin datos de Jalisco desglosados para ${añoJal}.`;
  const participacion = (maxVal / suma) * 100;
  const nota = conDato < def.categorias.length
    ? ` (${def.categorias.length - conDato} de ${def.categorias.length} categorías sin dato ese año, excluidas de la suma)`
    : "";
  return `En Jalisco (${añoJal}), "${def.etiquetas[max]}" concentra ${pct(participacion)} de los ${fmtN(suma)} casos con desglose disponible${nota}.`;
}

/* -------------------------------------------------------------------------
   RENDER — dispatcher por grupo + inserción del insight
   ------------------------------------------------------------------------- */
const INSTANCIAS_ECHARTS = [];

function insertarInsight(el, texto) {
  const div = document.createElement("div");
  div.className = "insight";
  div.style.marginTop = "10px";
  div.textContent = texto;
  el.insertAdjacentElement("afterend", div);
}

function renderGrupo(el, grupoId, series) {
  if (SERIE_TEMPORAL_DEFS[grupoId]) {
    const def = SERIE_TEMPORAL_DEFS[grupoId];
    const disponibles = [...def.primario, ...def.secundario].filter(id => series[id]);
    if (!disponibles.length) { el.innerHTML = '<div class="insight warn">Sin series disponibles para este grupo.</div>'; return; }
    const chart = echarts.init(el, null, { renderer: "svg" });
    chart.setOption(buildSerieOption(def, series));
    INSTANCIAS_ECHARTS.push(chart);
    insertarInsight(el, insightSerie(def, series));
  } else if (COMPOSICION_DEFS[grupoId]) {
    const def = COMPOSICION_DEFS[grupoId];
    const chart = echarts.init(el, null, { renderer: "svg" });
    chart.setOption(buildComposicionOption(def, series));
    INSTANCIAS_ECHARTS.push(chart);
    insertarInsight(el, insightComposicion(def, series));
  } else {
    el.innerHTML = `<div class="insight warn">Grupo "${grupoId}" sin definición de gráfica (Fase 3).</div>`;
  }
}

function renderAllCharts(dataset) {
  const { series } = dataset;
  document.querySelectorAll("[data-grupo]").forEach(el => {
    renderGrupo(el, el.dataset.grupo, series);
  });
  const onResize = () => INSTANCIAS_ECHARTS.forEach(c => c.resize());
  window.addEventListener("resize", onResize);
}

if (typeof window !== "undefined") {
  window.CGES = window.CGES || {};
  Object.assign(window.CGES, {
    ANIOS_CHART, SERIE_TEMPORAL_DEFS, COMPOSICION_DEFS,
    buildSerieOption, buildComposicionOption, insightSerie, insightComposicion,
    renderAllCharts,
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ANIOS_CHART, SERIE_TEMPORAL_DEFS, COMPOSICION_DEFS,
    buildSerieOption, buildComposicionOption, insightSerie, insightComposicion,
  };
}

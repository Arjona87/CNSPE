/**
 * reporte.js — Genera el Word "Resumen Ejecutivo" en el navegador, al hacer
 * clic en "Generar Reporte". Usa el mismo dataset ya cargado por data.js/
 * main.js (window.CGES.loadDataset), y el mismo membrete de la skill CGES
 * (membrete_header.png / membrete_footer.png, servidos junto al sitio).
 *
 * Nota (test, 12-ago-2026): a solicitud explícita, esta versión del botón
 * NO lleva firma personal — el pie solo dice "CGES/AA". Es distinto de la
 * plantilla oficial de fichas (que sí lleva firma) a propósito, por ahora.
 */
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  ImageRun, ExternalHyperlink, PageBreak, LevelFormat,
  Header, Footer, VerticalAlign,
} from "https://cdn.jsdelivr.net/npm/docx@9.6.1/+esm";

const NAVY = "1F3A7F";
const GOLD = "C9A227";
const GRAY = "4A4F57";
const LIGHT_GRAY_FILL = "F4F5F7";
const FONT_HEAD = "Montserrat";
const FONT_BODY = "Poppins";
const AÑO_REPORTE = 2026;

function fmtN(num, unidad) {
  if (num === null || num === undefined) return "s/d";
  if (unidad === "tasa") return num.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  if (unidad === "mdp") return "$" + num.toLocaleString("es-MX", { maximumFractionDigits: 1 }) + " mdp";
  return Math.round(num).toLocaleString("es-MX");
}
function fmtPct(num, dec = 1) {
  if (num === null || num === undefined || isNaN(num)) return "s/d";
  const signo = num > 0 ? "+" : "";
  return signo + num.toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + "%";
}
function ultimoAñoConDato(series, id, hasta = AÑO_REPORTE) {
  const s = series[id];
  if (!s) return null;
  for (let a = hasta; a >= 2021; a--) {
    if (s.valores[a] !== null) return { año: a, valor: s.valores[a] };
  }
  return null;
}

async function fetchImagenBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo cargar " + url);
  return await res.arrayBuffer();
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 220, after: 100 },
    border: level === HeadingLevel.HEADING_1
      ? { bottom: { color: GOLD, space: 4, style: BorderStyle.SINGLE, size: 8 } } : undefined,
    children: [new TextRun({ text, bold: true, color: NAVY, font: FONT_HEAD, size: level === HeadingLevel.HEADING_1 ? 24 : 20 })],
  });
}
function bullet(runsOrText) {
  const children = typeof runsOrText === "string"
    ? [new TextRun({ text: runsOrText, font: FONT_BODY, size: 19, color: "1B1F27" })] : runsOrText;
  return new Paragraph({ numbering: { reference: "bullets-cges", level: 0 }, spacing: { after: 70 }, children });
}
function bodyText(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, font: FONT_BODY, size: 19, color: "1B1F27", italics: !!opts.italics })] });
}
function b(text) { return new TextRun({ text, bold: true, font: FONT_BODY, size: 19, color: "1B1F27" }); }
function txt(text) { return new TextRun({ text, font: FONT_BODY, size: 19, color: "1B1F27" }); }
function link(text, url) {
  return new ExternalHyperlink({ link: url, children: [new TextRun({ text, font: FONT_BODY, size: 19, color: "1B4F91", underline: {} })] });
}
function celda(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), bold: !!opts.bold, font: FONT_BODY, size: opts.size || 17, color: opts.color || "1B1F27" })],
    })],
  });
}

const CIFRAS_CLAVE = [
  ["personal_adscrito_jalisco", "personal_adscrito_total", "Personal adscrito", "personas"],
  ["presupuesto_jalisco", "presupuesto_nacional", "Presupuesto ejercido", "mdp"],
  ["tasa_preventiva_jalisco", "tasa_preventiva_nacional", "Tasa policia preventiva /1,000 hab.", "tasa"],
  ["cup_total__jalisco", "cup_total__nacional", "Personal con Certificado Unico Policial", "personas"],
  ["enfrentamientos_jalisco", "enfrentamientos_nacional", "Enfrentamientos", "eventos"],
  ["empresas_jalisco", "empresas_nacional", "Empresas de seguridad privada", "empresas"],
];

function tablaCifrasClave(series) {
  const COL_W = [3400, 1900, 1900, 2160];
  const header = new TableRow({
    tableHeader: true,
    children: [
      celda("Indicador", { width: COL_W[0], bold: true, shade: NAVY, color: "FFFFFF" }),
      celda("Jalisco", { width: COL_W[1], bold: true, shade: NAVY, color: "FFFFFF", align: AlignmentType.CENTER }),
      celda("Nacional", { width: COL_W[2], bold: true, shade: NAVY, color: "FFFFFF", align: AlignmentType.CENTER }),
      celda("Participacion", { width: COL_W[3], bold: true, shade: NAVY, color: "FFFFFF", align: AlignmentType.CENTER }),
    ],
  });
  const filas = CIFRAS_CLAVE.map(([idJal, idNac, etiqueta, unidad], i) => {
    const jal = ultimoAñoConDato(series, idJal);
    const nac = ultimoAñoConDato(series, idNac);
    const jalTxt = jal ? `${fmtN(jal.valor, unidad)} (${jal.año})` : "s/d";
    const nacTxt = nac ? `${fmtN(nac.valor, unidad)} (${nac.año})` : "s/d";
    let partTxt = "-";
    if (unidad !== "tasa" && jal && nac && jal.año === nac.año && nac.valor) {
      partTxt = fmtPct((jal.valor / nac.valor) * 100, 1).replace("+", "");
    }
    return new TableRow({
      children: [
        celda(etiqueta, { width: COL_W[0], shade: i % 2 ? LIGHT_GRAY_FILL : "FFFFFF" }),
        celda(jalTxt, { width: COL_W[1], align: AlignmentType.CENTER, bold: true, shade: i % 2 ? LIGHT_GRAY_FILL : "FFFFFF" }),
        celda(nacTxt, { width: COL_W[2], align: AlignmentType.CENTER, shade: i % 2 ? LIGHT_GRAY_FILL : "FFFFFF" }),
        celda(partTxt, { width: COL_W[3], align: AlignmentType.CENTER, shade: i % 2 ? LIGHT_GRAY_FILL : "FFFFFF" }),
      ],
    });
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: COL_W, rows: [header, ...filas] });
}

export async function generarReporteWord(dataset) {
  const { series } = dataset;
  const [headerImg, footerImg, logoImg] = await Promise.all([
    fetchImagenBuffer("./membrete_header.png"),
    fetchImagenBuffer("./membrete_footer.png"),
    fetchImagenBuffer("./CGES_logo.png"),
  ]);

  const hoy = new Date();
  const fechaTxt = hoy.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const doc = new Document({
    numbering: { config: [{ reference: "bullets-cges", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 320, hanging: 220 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1000, bottom: 900, left: 1080, right: 1080 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "CGES/AA \u00b7 Panorama Institucional CNSPE", size: 14, color: "8A8F99", font: FONT_BODY })] })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            border: { top: { color: "D8DCE2", space: 4, style: BorderStyle.SINGLE, size: 4 } },
            spacing: { before: 60 },
            children: [new TextRun({ text: "CGES/AA \u00b7 Fuente: INEGI, Censo Nacional de Seguridad Publica Estatal (CNSPE) \u00b7 Documento de prueba, generado automaticamente", size: 13, color: "8A8F99", font: FONT_BODY })],
          })],
        }),
      },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new ImageRun({ type: "png", data: logoImg, transformation: { width: 200, height: 57 } })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "RESUMEN EJECUTIVO - PANORAMA INSTITUCIONAL CNSPE", bold: true, size: 30, color: NAVY, font: FONT_HEAD })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: `Jalisco vs. Nacional \u00b7 Serie 2021-${AÑO_REPORTE}`, bold: true, size: 22, color: "8A6D14", font: FONT_HEAD })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `CGES/AA \u00b7 Generado automaticamente el ${fechaTxt} \u00b7 DOCUMENTO DE PRUEBA`, size: 17, color: GRAY, font: FONT_BODY, italics: true })] }),

        heading("Cifras clave - Jalisco vs. Nacional"),
        bodyText(`Cada indicador muestra el ano mas reciente disponible en el Sheet (prioriza ${AÑO_REPORTE} cuando ya esta capturado).`),
        tablaCifrasClave(series),

        new Paragraph({ children: [new PageBreak()] }),
        heading("Fuente y metodologia"),
        new Paragraph({
          spacing: { after: 100 },
          children: [
            txt("Fuente primaria: INEGI, "),
            link("Censo Nacional de Seguridad Publica Estatal (CNSPE) 2025", "https://www.inegi.org.mx/programas/cnspe/2025/#tabulados"),
            txt(", via Google Sheet propio de la CGES. Detalle interactivo: "),
            link("arjona87.github.io/CNSPE", "https://arjona87.github.io/CNSPE/"),
            txt("."),
          ],
        }),
        bodyText("Este documento se genero automaticamente desde el dashboard, con los datos disponibles en el Sheet al momento de la descarga. Es una version de prueba.", { italics: true }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Resumen_Ejecutivo_CNSPE_${AÑO_REPORTE}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function initBotonReporte() {
  const btn = document.getElementById("btn-generar-reporte");
  if (!btn) return;
  btn.disabled = false;
  btn.title = "Descarga un resumen ejecutivo en Word con los datos actuales";
  btn.textContent = "Generar Reporte";
  btn.addEventListener("click", async () => {
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Generando...";
    try {
      const dataset = await window.CGES.loadDataset();
      await generarReporteWord(dataset);
    } catch (err) {
      console.error("Error generando el reporte:", err);
      alert("No se pudo generar el reporte. Revisa la consola para más detalle.");
    } finally {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBotonReporte);
} else {
  initBotonReporte();
}

#!/usr/bin/env node
// Writes the synthetic HL-1042 floor plan used in the storage checkpoint:
//   data/samples/HL-1042-floor-plan.pdf
//
// Dependency-free: the PDF is assembled by hand from vector drawing operators
// and the built-in Helvetica font, so the output is small and reproducible.
//   node data/generator/samples.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FLOOR_PLAN_PATH = join(ROOT, 'data', 'samples', 'HL-1042-floor-plan.pdf');

const PAGE_WIDTH = 792; // US Letter, landscape, in points
const PAGE_HEIGHT = 612;
const FOOT = 11; // drawing scale: points per foot
const ORIGIN = { x: 96, y: 170 };

const escapePdfText = (text) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function text(x, y, size, value, { font = 'F1', gray = 0 } = {}) {
  return `BT /${font} ${size} Tf ${gray} g ${x} ${y} Td (${escapePdfText(value)}) Tj ET`;
}

/** A room outline in feet from the plan origin, with a centered label and area. */
function room(xFt, yFt, wFt, hFt, label, { dashed = false, fill = null } = {}) {
  const x = ORIGIN.x + xFt * FOOT;
  const y = ORIGIN.y + yFt * FOOT;
  const w = wFt * FOOT;
  const h = hFt * FOOT;
  const ops = [];
  if (fill !== null) ops.push(`${fill} g ${x} ${y} ${w} ${h} re f`);
  ops.push(dashed ? '[6 4] 0 d' : '[] 0 d', '2 w 0 G', `${x} ${y} ${w} ${h} re S`, '[] 0 d');
  const cx = x + w / 2;
  const cy = y + h / 2;
  ops.push(text(cx - label.length * 3.1, cy + 4, 11, label, { font: 'F2' }));
  const area = `${wFt}' x ${hFt}'`;
  ops.push(text(cx - area.length * 2.5, cy - 10, 9, area, { gray: 0.3 }));
  return ops.join('\n');
}

function dimension(xFt, yFt, lengthFt, label) {
  const x1 = ORIGIN.x + xFt * FOOT;
  const x2 = x1 + lengthFt * FOOT;
  const y = ORIGIN.y + yFt * FOOT;
  return [
    '0.5 w 0.35 G',
    `${x1} ${y} m ${x2} ${y} l S`,
    `${x1} ${y - 4} m ${x1} ${y + 4} l S`,
    `${x2} ${y - 4} m ${x2} ${y + 4} l S`,
    text((x1 + x2) / 2 - label.length * 2.5, y + 4, 9, label, { gray: 0.35 }),
  ].join('\n');
}

function contentStream() {
  const ops = [];
  ops.push(text(48, 560, 18, 'Rivera residence: kitchen renovation and rear extension', { font: 'F2' }));
  ops.push(text(48, 540, 11, 'Ground floor plan, existing and proposed. Prepared by Northwind Builders for loan HL-1042.', { gray: 0.25 }));

  // Existing ground floor (feet).
  ops.push(room(0, 0, 14, 16, 'Living room'));
  ops.push(room(14, 0, 10, 16, 'Dining'));
  ops.push(room(24, 0, 14, 16, 'Kitchen (renovated)', { fill: 0.94 }));
  ops.push(room(0, 16, 10, 10, 'Bedroom'));
  ops.push(room(10, 16, 8, 10, 'Bath'));
  ops.push(room(18, 16, 20, 10, 'Hall and stairs'));
  // Proposed rear extension, dashed.
  ops.push(room(24, -10, 14, 10, 'Rear extension (proposed)', { dashed: true, fill: 0.97 }));

  ops.push(dimension(0, 27.5, 38, "38' overall"));
  ops.push(dimension(24, -11.5, 14, "14' extension"));

  // Legend.
  ops.push('2 w 0 G 560 420 m 600 420 l S');
  ops.push(text(608, 416, 9, 'Existing walls'));
  ops.push('[6 4] 0 d 2 w 0 G 560 400 m 600 400 l S [] 0 d');
  ops.push(text(608, 396, 9, 'Proposed walls'));
  ops.push(text(560, 376, 9, 'Shaded: renovation scope', { gray: 0.35 }));
  ops.push(text(560, 360, 9, 'Not to be used for construction.', { gray: 0.35 }));

  // Synthetic sample stamp in the open space beside the extension.
  const angle = (12 * Math.PI) / 180;
  const c = Math.cos(angle).toFixed(4);
  const s = Math.sin(angle).toFixed(4);
  ops.push(`BT /F2 24 Tf 0.78 0.16 0.16 rg ${c} ${s} -${s} ${c} 104 92 Tm (SYNTHETIC SAMPLE) Tj ET`);
  ops.push(`BT /F2 12 Tf 0.78 0.16 0.16 rg ${c} ${s} -${s} ${c} 116 74 Tm (Caldova Home Loans lab) Tj ET`);

  ops.push(text(48, 18, 9, 'Synthetic document for the Microsoft Ignite PREL40 lab. Fictional applicant and property; not a real plan.', { gray: 0.4 }));
  return ops.join('\n');
}

export function renderFloorPlanPdf() {
  const content = contentStream();
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Title (HL-1042 floor plan - synthetic sample) /Producer (PREL40 data generator) /CreationDate (D:20261020000000Z) >>',
  ];

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

function main() {
  mkdirSync(dirname(FLOOR_PLAN_PATH), { recursive: true });
  const pdf = renderFloorPlanPdf();
  writeFileSync(FLOOR_PLAN_PATH, pdf);
  console.log(`wrote ${FLOOR_PLAN_PATH.slice(ROOT.length + 1)} (${pdf.length} bytes)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { FLOOR_PLAN_PATH, renderFloorPlanPdf } from './samples.mjs';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const KITCHEN_PATH = join(FLOOR_PLAN_PATH, '..', 'HL-1042-kitchen-current.jpg');

describe('HL-1042 sample files', () => {
  it('commits the floor plan exactly as the generator renders it', () => {
    assert.deepEqual(readFileSync(FLOOR_PLAN_PATH), renderFloorPlanPdf(), 'run node data/generator/samples.mjs');
  });

  it('writes a well-formed single-page PDF with a correct cross-reference table', () => {
    const pdf = renderFloorPlanPdf().toString('latin1');
    assert.ok(pdf.startsWith('%PDF-1.4'));
    assert.ok(pdf.trimEnd().endsWith('%%EOF'));
    const startxref = Number(pdf.match(/startxref\n(\d+)\n%%EOF/)[1]);
    assert.ok(pdf.slice(startxref).startsWith('xref'));
    for (const match of pdf.matchAll(/^(\d{10}) 00000 n $/gm)) {
      assert.match(pdf.slice(Number(match[1])), /^\d+ 0 obj/);
    }
    assert.match(pdf, /AI generated sample/);
  });

  it('keeps both samples within the 5 MB upload limit', () => {
    for (const path of [FLOOR_PLAN_PATH, KITCHEN_PATH]) {
      const size = statSync(path).size;
      assert.ok(size > 0 && size < MAX_UPLOAD_BYTES, `${path} is ${size} bytes`);
    }
    const jpeg = readFileSync(KITCHEN_PATH);
    assert.equal(jpeg.readUInt16BE(0), 0xffd8, 'kitchen sample is a JPEG');
  });
});

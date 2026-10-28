import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/* 生成 PWA 图标（无第三方依赖，用内置 zlib 写 PNG） */

function crcTable() {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
}
const CRC_TABLE = crcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const GLYPHS = {
  J: ['11111', '00010', '00010', '00010', '00010', '10010', '01100'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
};

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const radius = Math.round(size * 0.22);
  const bg = [23, 26, 31, 255];
  const fg = [224, 164, 74, 255];

  function set(x, y, color) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = color[0];
    buf[i + 1] = color[1];
    buf[i + 2] = color[2];
    buf[i + 3] = color[3];
  }

  // 圆角矩形背景
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x < radius ? radius - x : x > size - radius ? x - (size - radius) : 0;
      const dy = y < radius ? radius - y : y > size - radius ? y - (size - radius) : 0;
      if (dx > 0 && dy > 0 && Math.hypot(dx, dy) > radius) continue;
      set(x, y, bg);
    }
  }

  // JS 像素字
  const cell = Math.floor(size * 0.075);
  const glyphW = 5 * cell;
  const gap = Math.round(cell * 1.4);
  const totalW = glyphW * 2 + gap;
  const startX = Math.round((size - totalW) / 2);
  const startY = Math.round((size - 7 * cell) / 2);
  ['J', 'S'].forEach((ch, gi) => {
    const rows = GLYPHS[ch];
    const ox = startX + gi * (glyphW + gap);
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] !== '1') continue;
        for (let py = 0; py < cell; py++) {
          for (let px = 0; px < cell; px++) {
            set(ox + rx * cell + px, startY + ry * cell + py, fg);
          }
        }
      }
    });
  });

  return encodePng(size, size, buf);
}

export function writeIcons(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'icon-192.png'), drawIcon(192));
  fs.writeFileSync(path.join(outDir, 'icon-512.png'), drawIcon(512));
}

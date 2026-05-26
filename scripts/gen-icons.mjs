// Generates square PNG icons with a piano-key motif on a dark background.
// No external deps: writes raw RGBA pixels via a tiny PNG encoder using zlib.

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public", "icons");
const rootDir = resolve(__dirname, "..", "public");
mkdirSync(outDir, { recursive: true });

function makePng(size, { padding = 0, drawKeys = true } = {}) {
  const w = size;
  const h = size;
  const px = new Uint8Array(w * h * 4);

  const bg = [0x0b, 0x0d, 0x12, 0xff];
  const panel = [0x16, 0x1b, 0x26, 0xff];
  const white = [0xf2, 0xf3, 0xf6, 0xff];
  const black = [0x0b, 0x0d, 0x12, 0xff];
  const accent = [0x6c, 0x8c, 0xff, 0xff];

  const setPx = (x, y, c) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    px[i] = c[0];
    px[i + 1] = c[1];
    px[i + 2] = c[2];
    px[i + 3] = c[3];
  };

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) setPx(x, y, bg);

  if (drawKeys) {
    const pad = Math.floor(size * (padding || 0.12));
    const innerX = pad;
    const innerY = Math.floor(size * 0.28);
    const innerW = w - pad * 2;
    const innerH = Math.floor(size * 0.5);

    for (let y = innerY - 4; y < innerY + innerH + 4; y++)
      for (let x = innerX - 4; x < innerX + innerW + 4; x++) setPx(x, y, panel);

    const whiteKeys = 7;
    const keyW = Math.floor(innerW / whiteKeys);
    for (let k = 0; k < whiteKeys; k++) {
      const kx = innerX + k * keyW;
      for (let y = innerY; y < innerY + innerH; y++)
        for (let x = kx + 1; x < kx + keyW - 1; x++) setPx(x, y, white);
    }

    const blackPattern = [0, 1, 3, 4, 5];
    const bkW = Math.floor(keyW * 0.6);
    const bkH = Math.floor(innerH * 0.6);
    for (const k of blackPattern) {
      const bx = innerX + (k + 1) * keyW - Math.floor(bkW / 2);
      for (let y = innerY; y < innerY + bkH; y++)
        for (let x = bx; x < bx + bkW; x++) setPx(x, y, black);
    }

    const stripeY = innerY - Math.floor(size * 0.05);
    for (let y = stripeY; y < stripeY + Math.max(2, Math.floor(size * 0.01)); y++)
      for (let x = innerX; x < innerX + innerW; x++) setPx(x, y, accent);
  }

  return encodePng(w, h, px);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.subarray(y * width * 4, (y + 1) * width * 4).forEach((v, i) => {
      raw[y * (width * 4 + 1) + 1 + i] = v;
    });
  }
  const idat = deflateSync(raw);

  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

let crcTable;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  return ~c;
}

writeFileSync(resolve(outDir, "icon-192.png"), makePng(192));
writeFileSync(resolve(outDir, "icon-512.png"), makePng(512));
writeFileSync(resolve(outDir, "maskable-512.png"), makePng(512, { padding: 0.2 }));
writeFileSync(resolve(rootDir, "apple-touch-icon.png"), makePng(180));

console.log("Icons written to", outDir);

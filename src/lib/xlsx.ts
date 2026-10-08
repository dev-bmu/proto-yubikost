// Isi template .xlsx Accurate tanpa library: header & sheet lain disalin apa adanya, hanya baris data sheet pertama
// yang diganti. ponytail: pembaca/penulis ZIP minimal (tanpa ZIP64/enkripsi) — cukup untuk template Accurate (< 100 KB).
import fs from "node:fs";
import zlib from "node:zlib";

export type Cell = string | number | null | undefined;
/** Satu baris data: nama kolom header (persis seperti baris 1 template, tanpa spasi tepi) → nilai. */
export type SheetRow = Record<string, Cell>;

type Entry = { name: string; method: number; time: number; date: number; crc: number; usize: number; data: Buffer };

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function readZip(buf: Buffer): Entry[] {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("Template xlsx rusak (EOCD tidak ditemukan)");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries: Entry[] = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Template xlsx rusak (central directory)");
    const nameLen = buf.readUInt16LE(p + 28);
    const local = buf.readUInt32LE(p + 42);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    entries.push({
      name: buf.toString("utf8", p + 46, p + 46 + nameLen),
      method: buf.readUInt16LE(p + 10),
      time: buf.readUInt16LE(p + 12),
      date: buf.readUInt16LE(p + 14),
      crc: buf.readUInt32LE(p + 16),
      usize: buf.readUInt32LE(p + 24),
      data: buf.subarray(start, start + buf.readUInt32LE(p + 20)),
    });
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return entries;
}

function writeZip(entries: Entry[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const head = (sig: number, size: number) => {
      const h = Buffer.alloc(size);
      h.writeUInt32LE(sig, 0);
      return h;
    };
    const local = head(0x04034b50, 30);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // nama file UTF-8
    local.writeUInt16LE(e.method, 8);
    local.writeUInt16LE(e.time, 10);
    local.writeUInt16LE(e.date, 12);
    local.writeUInt32LE(e.crc, 14);
    local.writeUInt32LE(e.data.length, 18);
    local.writeUInt32LE(e.usize, 22);
    local.writeUInt16LE(name.length, 26);
    chunks.push(local, name, e.data);

    const cen = head(0x02014b50, 46);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(e.method, 10);
    cen.writeUInt16LE(e.time, 12);
    cen.writeUInt16LE(e.date, 14);
    cen.writeUInt32LE(e.crc, 16);
    cen.writeUInt32LE(e.data.length, 20);
    cen.writeUInt32LE(e.usize, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, name);
    offset += 30 + name.length + e.data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, cd, end]);
}

const inflate = (e: Entry) => (e.method === 8 ? zlib.inflateRawSync(e.data) : Buffer.from(e.data)).toString("utf8");

const unescape = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const escape = (s: string) =>
  s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const colName = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const colIndex = (ref: string) => [...ref.replace(/\d+$/, "")].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/** Nama kolom header (baris 1) → indeks kolom. */
function headerColumns(sheetXml: string, sharedXml: string) {
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    unescape([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")),
  );
  const row1 = sheetXml.match(/<row [^>]*r="1"[^>]*>[\s\S]*?<\/row>/)?.[0];
  if (!row1) throw new Error("Template xlsx tanpa baris header");
  const cols = new Map<string, number>();
  for (const m of row1.matchAll(/<c r="([A-Z]+)1"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, ref, attrs, inner = ""] = m;
    const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
    const inline = inner.match(/<is>([\s\S]*?)<\/is>/)?.[1];
    const text = /t="s"/.test(attrs) && v !== undefined ? shared[Number(v)] : inline ? unescape(inline.replace(/<[^>]+>/g, "")) : v ? unescape(v) : "";
    if (text?.trim()) cols.set(text.trim().toUpperCase(), colIndex(ref));
  }
  return { row1, cols };
}

/**
 * Kembalikan isi .xlsx baru: template + `rows` mulai baris 2 di sheet pertama.
 * Kolom dicocokkan dengan teks header (tanpa beda huruf besar/kecil). Kolom tak dikenal → error (cegah salah ketik).
 */
export function fillTemplate(templatePath: string, rows: SheetRow[]): Buffer {
  const entries = readZip(fs.readFileSync(templatePath));
  const sheet = entries.find((e) => e.name === "xl/worksheets/sheet1.xml");
  const shared = entries.find((e) => e.name === "xl/sharedStrings.xml");
  if (!sheet) throw new Error("Template xlsx tanpa sheet1");
  const xml = inflate(sheet);
  const { row1, cols } = headerColumns(xml, shared ? inflate(shared) : "");

  let lastCol = Math.max(...cols.values());
  const body = rows
    .map((row, i) => {
      const r = i + 2;
      const cells = Object.entries(row)
        .filter(([, v]) => v !== "" && v !== null && v !== undefined)
        .map(([key, v]) => {
          const c = cols.get(key.trim().toUpperCase());
          if (c === undefined) throw new Error(`Kolom "${key}" tidak ada di template ${templatePath}`);
          return [c, v] as const;
        })
        .sort((a, b) => a[0] - b[0])
        .map(([c, v]) => {
          lastCol = Math.max(lastCol, c);
          const ref = `${colName(c)}${r}`;
          return typeof v === "number"
            ? `<c r="${ref}"><v>${v}</v></c>`
            : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escape(String(v))}</t></is></c>`;
        })
        .join("");
      return `<row r="${r}">${cells}</row>`;
    })
    .join("");

  const out = xml
    .replace(/<sheetData>[\s\S]*<\/sheetData>|<sheetData\/>/, `<sheetData>${row1}${body}</sheetData>`)
    .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:${colName(lastCol)}${rows.length + 1}"/>`)
    .replace(/<mergeCells[\s\S]*?<\/mergeCells>/, "");
  const raw = Buffer.from(out, "utf8");
  Object.assign(sheet, { method: 8, crc: crc32(raw), usize: raw.length, data: zlib.deflateRawSync(raw) });
  return writeZip(entries);
}

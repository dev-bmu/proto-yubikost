// Salin data/seed/*.tsv -> data/*.tsv dan isi ulang storage privat (KTP, bukti transfer) dari spesimen.
import { cpSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const seed = join(root, "data", "seed");
for (const f of readdirSync(seed).filter((f) => f.endsWith(".tsv"))) cpSync(join(seed, f), join(root, "data", f));
for (const [dir, src] of [["ktp", "seed-ktp"], ["bukti", "seed-bukti"]]) {
  rmSync(join(root, "storage", dir), { recursive: true, force: true });
  cpSync(join(root, "data", src), join(root, "storage", dir), { recursive: true });
}
rmSync(join(root, "storage", "media"), { recursive: true, force: true }); // foto upload admin
console.log("Data dummy direset dari data/seed.");

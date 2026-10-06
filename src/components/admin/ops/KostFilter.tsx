// Filter gedung via GET (?kost=) — jalan tanpa JS; next/form menavigasi di klien bila JS aktif.
// children = field GET tambahan (mis. Periode) dalam baris filter yang sama.
import type { ReactNode } from "react";
import Form from "next/form";
import { Select } from "@/components/Field";
import { button } from "@/components/ui";
import type { Kost } from "@/lib/db";

export function KostFilter({ action, kosts, value, allowAll = false, children }: {
  action: string; kosts: Pick<Kost, "id" | "name">[]; value: string; allowAll?: boolean; children?: ReactNode;
}) {
  return (
    <Form action={action} className="flex flex-wrap items-end gap-2 mb-6">
      <Select label="Gedung kost" name="kost" defaultValue={value} className="w-full sm:w-72">
        {allowAll && <option value="">Semua Kost</option>}
        {kosts.map((k) => (
          <option key={k.id} value={k.id}>{k.name}</option>
        ))}
      </Select>
      {children}
      <button type="submit" className={button("neutral", "md")}>Tampilkan</button>
    </Form>
  );
}

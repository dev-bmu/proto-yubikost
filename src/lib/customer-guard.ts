// Guard Dashboard Customer (PRD §8.1, v1.1): login → wajib ganti sandi → penghuni wajib biodata.
import { redirect } from "next/navigation";
import { customerContext } from "./queries";
import { currentMember } from "./session";

export async function customerGuard(path: string, opts: { allowNoProfile?: boolean; allowMustChange?: boolean } = {}) {
  const member = await currentMember();
  if (!member) redirect(`/?auth=masuk&next=${encodeURIComponent(path)}`);
  if (member.mustChangePassword && !opts.allowMustChange) redirect(`/dashboard/akun?next=${encodeURIComponent(path)}`);
  const ctx = customerContext(member.id);
  if (!ctx) redirect("/?auth=masuk");
  if (ctx.resident && !ctx.profile && !opts.allowNoProfile) redirect("/dashboard/biodata");
  return ctx;
}

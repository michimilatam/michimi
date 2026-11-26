"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ClaimButton({ code, next }: { code: string; next: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function claim() {
    setBusy(true); setErr(null);
    const { data, error } = await supabaseBrowser().rpc("claim_store", { p_code: code });
    if (error) { setErr(error.message); setBusy(false); return; }
    router.push(next ?? `/tienda/${data}`);
  }
  return (
    <div className="space-y-2">
      <button onClick={claim} disabled={busy} className="btn-primary">{busy ? "Activando…" : "Reclamar mi tienda"}</button>
      {err && <p className="text-sm text-bad">{err}</p>}
    </div>
  );
}

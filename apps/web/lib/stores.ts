import type { SupabaseClient } from "@supabase/supabase-js";

export type MyStore = { id: string; slug: string; name: string; role: "dueño" | "miembro" };

/** Comercios donde el usuario es dueño o miembro. */
export async function myStores(supabase: SupabaseClient, userId: string): Promise<MyStore[]> {
  const { data } = await supabase.from("store_members").select("role, store:stores(id,slug,name,deleted_at)").eq("user_id", userId);
  return ((data ?? []) as unknown as { role: MyStore["role"]; store: { id: string; slug: string; name: string; deleted_at: string | null } | null }[])
    .filter((r) => r.store && !r.store.deleted_at)
    .map((r) => ({ id: r.store!.id, slug: r.store!.slug, name: r.store!.name, role: r.role }));
}

import type { Metadata } from "next";
import { currentCountry } from "@/lib/country";
import { PublicarForm } from "./PublicarForm";

export const metadata: Metadata = { title: "Publicar" };

export default async function Publicar({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const sp = await searchParams;
  return <PublicarForm initialCountry={await currentCountry()} initialKind={sp.tipo === "servicio" ? "servicio" : "producto"} />;
}

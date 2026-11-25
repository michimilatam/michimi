import type { Metadata } from "next";
import { currentCountry } from "@/lib/country";
import { PublicarForm } from "./PublicarForm";

export const metadata: Metadata = { title: "Publicar" };

export default async function Publicar() {
  return <PublicarForm initialCountry={await currentCountry()} />;
}

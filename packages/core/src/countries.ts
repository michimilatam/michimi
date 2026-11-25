import type { CurrencyCode } from "./money";

/**
 * Countries Michimi can operate in. Each market offers its local currency + USD.
 * Paraguay is the default market. `regionLabel` is what each country calls its
 * first-level division (departamento, provincia, estado, región).
 */
export const COUNTRIES = {
  PY: {
    name: "Paraguay", local: "PYG", phonePrefix: "+595", locale: "es-PY", regionLabel: "Departamento",
    regions: ["Asunción", "Central", "Alto Paraná", "Itapúa", "Caaguazú", "San Pedro", "Cordillera", "Paraguarí", "Guairá", "Caazapá", "Misiones", "Ñeembucú", "Concepción", "Amambay", "Canindeyú", "Presidente Hayes", "Boquerón", "Alto Paraguay"],
  },
  AR: {
    name: "Argentina", local: "ARS", phonePrefix: "+54", locale: "es-AR", regionLabel: "Provincia",
    regions: ["Ciudad Autónoma de Buenos Aires", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"],
  },
  BR: {
    name: "Brasil", local: "BRL", phonePrefix: "+55", locale: "pt-BR", regionLabel: "Estado",
    regions: ["Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"],
  },
  UY: {
    name: "Uruguay", local: "UYU", phonePrefix: "+598", locale: "es-UY", regionLabel: "Departamento",
    regions: ["Montevideo", "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja", "Maldonado", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres"],
  },
  BO: {
    name: "Bolivia", local: "BOB", phonePrefix: "+591", locale: "es-BO", regionLabel: "Departamento",
    regions: ["La Paz", "Santa Cruz", "Cochabamba", "Chuquisaca", "Oruro", "Potosí", "Tarija", "Beni", "Pando"],
  },
  CL: {
    name: "Chile", local: "CLP", phonePrefix: "+56", locale: "es-CL", regionLabel: "Región",
    regions: ["Metropolitana de Santiago", "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso", "O'Higgins", "Maule", "Ñuble", "Biobío", "La Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes"],
  },
  PE: {
    name: "Perú", local: "PEN", phonePrefix: "+51", locale: "es-PE", regionLabel: "Departamento",
    regions: ["Lima", "Callao", "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Loreto", "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali"],
  },
  CO: {
    name: "Colombia", local: "COP", phonePrefix: "+57", locale: "es-CO", regionLabel: "Departamento",
    regions: ["Bogotá D.C.", "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá", "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada"],
  },
  MX: {
    name: "México", local: "MXN", phonePrefix: "+52", locale: "es-MX", regionLabel: "Estado",
    regions: ["Ciudad de México", "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"],
  },
} as const satisfies Record<string, { name: string; local: CurrencyCode; phonePrefix: string; locale: string; regionLabel: string; regions: readonly string[] }>;

export type CountryCode = keyof typeof COUNTRIES;
export const DEFAULT_COUNTRY: CountryCode = "PY";
export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];
export const COUNTRY_COOKIE = "michimi_pais";

export function isCountry(code: string | undefined | null): code is CountryCode {
  return !!code && code in COUNTRIES;
}

/** "PY" → "🇵🇾" (regional indicator symbols). */
export function flag(country: CountryCode): string {
  return String.fromCodePoint(...[...country].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Currencies a listing may use in a given country: local first, then USD. */
export function currenciesFor(country: CountryCode): CurrencyCode[] {
  return [COUNTRIES[country].local, "USD"];
}

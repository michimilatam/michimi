/**
 * Detector de patrones de estafa en mensajes del chat.
 * No bloquea: devuelve avisos para mostrar al que recibe (y confirmar al que envía).
 */
export type RiskFlag = "codigo" | "link" | "telefono" | "pago_adelantado" | "fuera_plataforma" | "datos_sensibles";

export const RISK_LABEL: Record<RiskFlag, string> = {
  codigo: "Pide o comparte un código. Nunca compartas códigos que te lleguen por SMS o WhatsApp: así roban cuentas.",
  link: "Tiene un link. No ingreses datos ni pagues desde links que te manden por chat.",
  telefono: "Comparte un teléfono. Si la operación sigue fuera de Michimi, perdés el respaldo y la reputación.",
  pago_adelantado: "Habla de pagar por adelantado o una seña. No pagues antes de ver el producto o el trabajo.",
  fuera_plataforma: "Propone seguir por fuera de Michimi. Es la forma más común de estafa.",
  datos_sensibles: "Pide datos de tarjeta, cuenta o claves. Michimi nunca te los pide.",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const RULES: [RiskFlag, RegExp][] = [
  ["codigo", /\b(codigo|cod\.?|pin|token|clave de verificacion|verificacion)\b[^\n]{0,40}\b(\d{4,8}|llego|llega|mandame|pasame|enviame|me (pasas|envias|mandas|das))\b|\b(pasame|mandame|enviame|dame)\b[^\n]{0,25}\b(codigo|cod\.?)\b/],
  ["link", /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|xyz|top|link|ly|me|app|site|online|info|py)\b(\/|\b))/],
  ["telefono", /(\+?595[\s-]?9\d{2}|\b09\d{2})[\s-]?\d{3}[\s-]?\d{3}\b|\+?\d[\d\s-]{8,}\d/],
  ["pago_adelantado", /\b(pago|pagar|pagas|transferi|deposita|giro|sena|adelanto|anticipo)\b[^\n]{0,30}\b(adelantad[oa]|antes|primero|ahora mismo|para reservar|para separar)\b|\b(western union|moneygram|giros tigo|billetera)\b/],
  ["fuera_plataforma", /\b(whats?app|wsp|wpp|telegram|escribime al|hablemos por|fuera de (la )?(app|plataforma|michimi)|mi numero|mi cel)\b/],
  ["datos_sensibles", /\b(numero de tarjeta|tarjeta de credito|cvv|cvc|vencimiento de (la|tu) tarjeta|contrasena|password|clave (del|de tu) (banco|homebanking)|usuario (del|de tu) banco)\b/],
];

export function riskFlags(text: string): RiskFlag[] {
  const t = norm(text);
  return RULES.filter(([, re]) => re.test(t)).map(([f]) => f);
}

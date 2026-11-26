import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Lo llama la base de datos (pg_net) cuando hay un mensaje nuevo.
 * Recibe las suscripciones del destinatario y el texto; firma y envía cada push.
 * Protegido con un secreto compartido (PUSH_SECRET).
 */
export async function POST(req: Request) {
  const { env } = getCloudflareContext() as unknown as { env: Record<string, string | undefined> };
  if (!env.PUSH_SECRET || req.headers.get("x-push-secret") !== env.PUSH_SECRET) return new Response("no", { status: 401 });
  const { subs, title, body, url, tag } = (await req.json()) as {
    subs: { endpoint: string; p256dh: string; auth: string }[]; title: string; body: string; url: string; tag?: string;
  };
  const vapid = { subject: "mailto:michimi.latam@gmail.com", publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, privateKey: env.VAPID_PRIVATE_KEY! };
  const gone: string[] = [];
  await Promise.all((subs ?? []).map(async (s) => {
    const sub: PushSubscription = { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      const payload = await buildPushPayload({ data: JSON.stringify({ title, body, url, tag }), options: { ttl: 86400, urgency: "high" } }, sub, vapid);
      const r = await fetch(s.endpoint, payload);
      if (r.status === 404 || r.status === 410) gone.push(s.endpoint);
    } catch { /* una suscripción rota no frena las demás */ }
  }));
  return Response.json({ sent: (subs?.length ?? 0) - gone.length, gone });
}

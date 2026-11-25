# Michimi

Marketplace C2C para comprar y vender entre personas en Latinoamérica. El mercado por defecto es Paraguay, con precios en guaraníes (₲) o dólares (US$).
Hay un solo repo para tres cosas: la web **www.michimi.com**, la app de **Android** y la app de **iPhone**.

> Comprá y vendé entre personas, con la confianza de una plataforma que está de tu lado.

## Qué hay en la v1

| Funcionalidad | Web | App |
|---|---|---|
| Registro e ingreso con **Google**, o con enlace por email | ✓ | ✓ |
| Publicación guiada: mínimo 3 fotos, campos obligatorios por categoría, defectos y accesorios | ✓ | ✓ |
| Precio en moneda local + USD, validado por país | ✓ | ✓ |
| Búsqueda de texto completo en español, filtros por categoría, estado y moneda | ✓ | ✓ |
| Chat en tiempo real con **ofertas formales**, contraofertas y vencimiento a 24 h | ✓ | ✓ |
| Aviso cuando alguien quiere sacar la charla de la plataforma (teléfonos, códigos SMS) | ✓ | ✓ |
| Aceptar una oferta **reserva el producto** y abre un expediente de operación | ✓ | ✓ |
| **Entrega con PIN**: el comprador da el código y el vendedor lo ingresa | ✓ | ✓ |
| **Calificación bilateral**: el comprador califica al vendedor y el vendedor al comprador | ✓ | ✓ |
| Perfil con **reputación separada** como vendedor y como comprador | ✓ | ✓ |

### Cómo funciona la calificación
1. Solo pueden calificar las dos partes de una operación **completada con PIN**. Una reseña sin operación detrás no se puede cargar.
2. Cada parte califica una sola vez, con un puntaje de 1 a 5, criterios concretos y un comentario opcional.
3. **Doble ciego**: tu calificación queda oculta hasta que la otra parte también califique o pasen 14 días. Así nadie puede calificar por revancha.
4. El puntaje mostrado es un **promedio bayesiano**: un 5★ suelto no le gana a 80 operaciones con 4,8★.
5. Distintivos posibles: *Nuevo*, *Confiable*, *Destacado* o *En observación*.

La regla vive dos veces: en `packages/core/src/reputation.ts` (legible y testeada) y en la base (`supabase/migrations`, donde no se puede saltar).

## Estructura

```
apps/web        Next.js 16 (App Router) + Tailwind 4  →  www.michimi.com
apps/mobile     Expo SDK 58 + Expo Router             →  Android / iOS
packages/core   Dominio compartido: dinero, países, publicación, reputación, operación
supabase/       Esquema Postgres, RLS, RPCs y configuración de Google
```

## Herramientas (todas con plan gratuito)

| Necesidad | Elegida | Alternativa gratuita |
|---|---|---|
| Base de datos, usuarios, fotos, chat en tiempo real | Supabase Free | PocketBase en una VPS gratuita |
| Login con Google | Google Cloud OAuth (gratis) | — |
| Web | Next.js | — |
| App móvil | Expo / React Native | Flutter |
| Hosting web | Cloudflare Workers Free + OpenNext | Vercel Hobby (solo uso no comercial) |
| Builds de la app | EAS Build Free (cupo mensual) | Build local con Android Studio / Xcode |
| Gestor de paquetes | pnpm | — |
| Tests | Vitest | — |

**Lo que no es gratis y no depende del código:** publicar en Google Play cuesta USD 25 una sola vez, y publicar en el App Store requiere la cuenta Apple Developer (USD 99 por año). El dominio michimi.com también tiene su costo de renovación.

## Puesta en marcha

```bash
# 1. Dependencias (requiere Node 20+)
corepack enable && pnpm install

# 2. Supabase: crear proyecto gratis en supabase.com, luego
npx supabase link --project-ref TU_REF
npx supabase db push               # aplica supabase/migrations

# 3. Variables
cp apps/web/.env.example apps/web/.env.local       # URL + anon key
cp apps/mobile/.env.example apps/mobile/.env

# 4. Correr
pnpm dev:web          # http://localhost:3000
pnpm dev:mobile       # escaneá el QR con Expo Go
pnpm test             # tests del dominio
```

### Publicar la web en Cloudflare (gratis)
```bash
cd apps/web
npx wrangler login                 # cuenta gratuita de Cloudflare
# .env.local con NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (se incrustan en el build)
pnpm deploy                        # build OpenNext + deploy a Workers
```
`wrangler.jsonc` ya apunta a `www.michimi.com` y `michimi.com`. Para eso, el dominio tiene que estar en tu cuenta de Cloudflare: Add a site, y después cambiar los nameservers donde compraste el dominio.

### Activar Google
1. En Google Cloud Console → APIs y servicios → Credenciales, creá un **ID de cliente OAuth** de tipo *Aplicación web*.
2. En URI de redireccionamiento autorizados, poné `https://TU_REF.supabase.co/auth/v1/callback`.
3. En Supabase → Authentication → Providers → Google, pegá el Client ID y el Secret.
4. En Supabase → Authentication → URL Configuration, agregá en Redirect URLs:
   `https://www.michimi.com/auth/callback`, `http://localhost:3000/auth/callback`, `michimi://auth/callback`, `exp://**`.

## Próximos pasos (roadmap del documento de producto)
- Verificación de teléfono (Supabase Phone Auth: el SMS tiene costo).
- Reportes y panel de moderación (la tabla `reports` ya existe).
- Favoritos y alertas de búsqueda (las tablas ya existen, falta la UI).
- Limitar los intentos de PIN y generarlo con `pgcrypto` en lugar de `random()`.
- Etapa 2: pago protegido con una pasarela local regulada (Bancard o Pagopar).

## Documentos
- [PRODUCT.md](PRODUCT.md): a quién sirve y qué promete.
- [DESIGN.md](DESIGN.md): tokens y reglas visuales.
- [CONTEXT.md](CONTEXT.md): glosario del dominio.
- [docs/fuentes-analizadas.md](docs/fuentes-analizadas.md): Spree, Bagisto y BeikeShop.

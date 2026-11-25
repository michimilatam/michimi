# DESIGN.md — Michimi

Michimi es una superficie para **operar**: la gente busca, compara, negocia y cierra. Por eso la ambición se muestra como precisión y calma, no como decoración. Las fotos del producto son las protagonistas; la interfaz se queda atrás.

## Tokens
| Token | Valor | Uso |
|---|---|---|
| ink | `#111111` | Texto, header, botones secundarios activos |
| ink-soft | `#4a4a45` | Texto de apoyo (contraste AA sobre paper) |
| paper | `#fafaf7` | Fondo general. Es claro para que las fotos se vean fieles |
| card | `#ffffff` | Tarjetas y campos |
| line | `#e7e6df` | Bordes y separadores |
| lima | `#c6f432` | **Solo para acción principal** (Vender, Ofertar, Aceptar) y para el PIN. Nunca decorativo |
| ok / warn / bad | `#1f7a4d` / `#a65a00` / `#b42318` | Reputación y alertas de seguridad |

Tipografía: **Outfit** (la del logo). Los precios llevan `tabular-nums` y siempre van por `formatMoney()`.

## Reglas
1. Una sola acción en lima por pantalla.
2. El texto sobre lima es siempre `ink` (el contraste blanco sobre lima no pasa AA).
3. El precio es lo más grande de la tarjeta, después de la foto.
4. Comprador y vendedor muestran **siempre dos reputaciones separadas**, nunca un número mezclado.
5. Las advertencias de seguridad usan `warn`, en una línea y con una acción concreta ("Revisalo antes de dar tu PIN"). Sin alarmismo.
6. Los estados vacíos dicen qué hacer a continuación ("Sé el primero en publicar").
7. Táctil: los objetivos miden al menos 44 px. Foco visible con un anillo `ink` de 3 px.
8. Español rioplatense/paraguayo con voseo ("Publicá", "Revisá").

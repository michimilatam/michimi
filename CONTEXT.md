# CONTEXT.md — glosario del dominio

Usá estos términos tal cual en el código, la UI y las conversaciones.

| Término | Significado | Evitar |
|---|---|---|
| **Publicación** (`listing`) | Un producto ofrecido por un vendedor | aviso, anuncio, post |
| **Vendedor / Comprador** | El *rol* de una persona en una operación concreta. Una misma cuenta es ambos | usuario, cliente |
| **Conversación** | Chat entre un comprador y el vendedor sobre una publicación (una por par) | hilo |
| **Oferta** | Propuesta formal de precio con vencimiento. Puede contraofertarse | mensaje de precio |
| **Operación** (`operation`) | El expediente que nace al aceptar una oferta: reserva, PIN, cierre o cancelación | pedido, orden, transacción |
| **Reserva** | Estado de la publicación mientras hay una operación abierta | — |
| **PIN de entrega** | Código de 6 dígitos que solo ve el comprador. Lo entrega al recibir el producto | código de seguridad |
| **Calificación** (`rating`) | Puntaje de 1 a 5 que una parte da a la otra tras una operación completada | reseña, review |
| **Reputación** | Resumen de las calificaciones de una persona **por rol** (vendedor/comprador) | — |
| **Doble ciego** | Una calificación se publica recién cuando ambos calificaron o pasaron 14 días | — |
| **Monto** | Entero en la unidad mínima de la moneda (PYG = guaraní, USD = centavo) | precio float |

## Módulos profundos (packages/core)
- `money`: única forma de formatear o interpretar montos. Nunca se usan floats.
- `listing`: validación del borrador, compartida por la web y la app.
- `reputation`: reglas de calificación y puntaje bayesiano.
- `operation`: estados del ciclo de vida.

La base de datos aplica las mismas reglas con triggers y RPCs. Es la seam autoritativa.

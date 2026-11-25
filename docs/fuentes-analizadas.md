# Fuentes analizadas

Revisión hecha el 25/11/2026 sobre los repos públicos, leyendo su LICENSE y su README.

| Repo | Stack | Licencia | Modelo | ¿Sirve como base para Michimi? |
|---|---|---|---|---|
| spree/spree | Ruby on Rails + Next.js storefront | BSD-3-Clause (libre, permite uso comercial) | Comercio B2C/B2B headless: tienda → cliente | **No como base.** Sí como referencia de modelo de catálogo y de checkout para la etapa 2 |
| bagisto/bagisto | Laravel + Vue | MIT | E-commerce. Multi-vendedor como módulo aparte (el README lo enlaza en la web de Webkul, no viene en el repo) | **No.** Es otro stack (PHP), y el multi-vendedor apunta a tiendas, no a particulares |
| beikeshop/beikeshop | Laravel | **Propietaria**: prohíbe vender o alquilar el sistema o sus derivados sin autorización escrita y exige conservar el copyright | E-commerce B2C | **Descartado.** La licencia es incompatible con un producto comercial |

## Por qué ninguna sirve como base
Las tres resuelven el caso de **una tienda que le vende a clientes**: catálogo, stock, carrito y checkout. Michimi resuelve **personas que negocian entre sí**: una publicación única sin stock, una oferta con contraoferta, una reserva, la entrega en persona y una reputación de dos lados. Adaptar cualquiera de las tres implica desarmar más de lo que se aprovecha, y además obliga a cambiar de stack (Ruby o PHP en lugar de TypeScript compartido entre la web y la app).

## Qué sí se tomó como idea
- Spree: separar los montos en unidades mínimas por moneda y modelar la *operación* como entidad propia, distinta de la publicación.
- Bagisto: estados de moderación de publicaciones (para el panel administrativo de la etapa siguiente).

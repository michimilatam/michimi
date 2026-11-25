/**
 * Árbol de categorías de Michimi (2 niveles, inspirado en eBay y adaptado a C2C en LatAm).
 * Los slugs de categoría y subcategoría se guardan en la base: NO renombrarlos una vez
 * publicados; para cambiar el texto visible, editar solo `label`.
 * Excluido a propósito: armas, alcohol, medicamentos, animales vivos y entradas.
 */

export function slugify(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const tree = {
  celulares: { label: "Celulares y telefonía", fields: ["marca", "modelo", "bateria_pct"], subs: ["Celulares y smartphones", "Smartwatches y wearables", "Accesorios para celulares", "Fundas y protectores", "Cargadores y cables", "Repuestos de celulares", "Teléfonos fijos e inalámbricos"] },
  computacion: { label: "Computación", fields: ["marca", "modelo"], subs: ["Notebooks", "PC de escritorio", "Monitores", "Tablets y lectores", "Componentes de PC", "Teclados, mouse y periféricos", "Impresoras y escáneres", "Redes y wifi", "Almacenamiento y discos"] },
  electronica: { label: "Electrónica, audio y video", fields: ["marca", "modelo"], subs: ["Televisores", "Audio y parlantes", "Auriculares", "Cámaras y fotografía", "Drones", "Proyectores", "Home theater", "Accesorios de audio y video"] },
  consolas: { label: "Consolas y videojuegos", fields: ["marca", "modelo"], subs: ["Consolas", "Videojuegos", "Joysticks y accesorios", "Juegos de PC", "Retro y coleccionables"] },
  electrodomesticos: { label: "Electrodomésticos", fields: ["marca", "modelo"], subs: ["Heladeras y freezers", "Lavarropas y secarropas", "Aires acondicionados y ventiladores", "Cocinas y hornos", "Microondas", "Pequeños electrodomésticos de cocina", "Aspiradoras y limpieza", "Calefacción"] },
  muebles: { label: "Hogar, muebles y jardín", fields: ["medidas"], subs: ["Living y comedor", "Dormitorio", "Cocina y vajilla", "Baño", "Decoración", "Iluminación", "Colchones y textiles", "Jardín y exterior", "Piletas y accesorios"] },
  herramientas: { label: "Herramientas y construcción", fields: ["marca", "modelo"], subs: ["Herramientas eléctricas", "Herramientas manuales", "Generadores y compresores", "Materiales de construcción", "Pinturas", "Plomería", "Electricidad", "Escaleras y andamios"] },
  vehiculos: { label: "Autos, motos y náutica", fields: ["marca", "modelo", "anio", "kilometraje"], subs: ["Autos", "Camionetas y SUV", "Motos", "Cuatriciclos", "Náutica", "Camiones y maquinaria pesada"] },
  repuestos: { label: "Repuestos y accesorios para vehículos", fields: ["marca", "modelo"], subs: ["Repuestos de autos", "Repuestos de motos", "Neumáticos y llantas", "Audio y multimedia para autos", "Accesorios exteriores", "Accesorios interiores", "Herramientas para vehículos"] },
  moda: { label: "Ropa y calzado", fields: ["marca", "talle"], subs: ["Ropa de mujer", "Ropa de hombre", "Calzado de mujer", "Calzado de hombre", "Ropa deportiva", "Carteras, bolsos y mochilas", "Accesorios de moda"] },
  joyas: { label: "Joyas y relojes", fields: ["marca", "material"], subs: ["Relojes", "Anillos", "Collares y cadenas", "Aros", "Pulseras", "Bijouterie", "Lentes de sol"] },
  belleza: { label: "Salud y belleza", fields: ["marca"], subs: ["Perfumes", "Maquillaje", "Cuidado de la piel", "Cuidado del cabello", "Afeitado y depilación", "Manicura y pedicura", "Equipamiento de salud"] },
  bebes: { label: "Bebés y niños", fields: ["marca", "talle"], subs: ["Ropa de bebé", "Ropa de niños", "Cochecitos y sillas de auto", "Cunas y muebles infantiles", "Lactancia y alimentación", "Juguetes para bebés", "Seguridad infantil"] },
  juguetes: { label: "Juguetes y juegos", fields: ["marca"], subs: ["Juegos de mesa", "Muñecas y figuras de acción", "Bloques y armables", "Vehículos de juguete", "Peluches", "Rompecabezas", "Juguetes al aire libre"] },
  deportes: { label: "Deportes y fitness", fields: ["marca", "talle"], subs: ["Bicicletas", "Fitness y gimnasio", "Fútbol", "Tenis y pádel", "Camping y pesca", "Natación y playa", "Patines, skate y scooters", "Deportes de combate"] },
  instrumentos: { label: "Instrumentos musicales", fields: ["marca", "modelo"], subs: ["Guitarras y bajos", "Teclados y pianos", "Baterías y percusión", "Instrumentos de viento", "Amplificadores", "Audio profesional y DJ", "Accesorios musicales"] },
  libros: { label: "Libros, música y películas", fields: ["autor"], subs: ["Libros", "Libros de estudio", "Revistas y cómics", "Vinilos", "CDs", "Películas y series"] },
  coleccionables: { label: "Arte y coleccionables", fields: [], subs: ["Arte y cuadros", "Antigüedades", "Monedas y billetes", "Estampillas", "Cartas coleccionables", "Figuras y memorabilia", "Artículos firmados"] },
  mascotas: { label: "Mascotas (accesorios)", fields: ["marca"], subs: ["Perros", "Gatos", "Peces y acuarios", "Aves", "Camas y casas", "Transportadoras y paseo"] },
  negocios: { label: "Negocios, oficina e industria", fields: ["marca", "modelo"], subs: ["Equipamiento gastronómico", "Equipamiento comercial", "Mobiliario de oficina", "Insumos de oficina", "Maquinaria industrial", "Agro y ganadería"] },
  alimentos: { label: "Alimentos y bebidas", fields: [], subs: ["Panificados y repostería", "Comidas caseras y viandas", "Bebidas", "Productos regionales y artesanales", "Orgánicos y saludables", "Dulces, mermeladas y conservas", "Carnes, quesos y fiambres", "Frutas, verduras y huevos", "Otros alimentos"] },
  servicios: { label: "Servicios y clases", fields: [], subs: ["Electricistas", "Plomería y gas", "Albañilería y construcción", "Pintura", "Carpintería y muebles a medida", "Herrería y soldadura", "Aire acondicionado y refrigeración", "Reparaciones", "Reparación de electrodomésticos", "Reparación de celulares y computadoras", "Cerrajería", "Jardinería y paisajismo", "Limpieza del hogar y oficinas", "Fumigación y control de plagas", "Piscinas", "Mudanzas y fletes", "Mecánica y servicios para vehículos", "Clases particulares", "Idiomas", "Música e instrumentos", "Entrenamiento personal y deportes", "Belleza, peluquería y estética", "Salud y bienestar", "Cuidado de niños y adultos mayores", "Mascotas: paseo, peluquería y cuidado", "Eventos", "Fotografía y video", "Diseño gráfico y web", "Desarrollo de software e informática", "Marketing y redes sociales", "Contabilidad e impuestos", "Asesoría legal y trámites", "Traducción y redacción", "Costura y arreglos de ropa", "Otros servicios"] },
  otros: { label: "Otros", fields: [], subs: ["Otros"] },
} as const;

export type CategorySlug = keyof typeof tree;
export interface Subcategory { slug: string; label: string }
export interface Category { label: string; fields: readonly string[]; subs: readonly Subcategory[] }

export const CATEGORIES: Record<CategorySlug, Category> = Object.fromEntries(
  Object.entries(tree).map(([k, v]) => [k, { label: v.label, fields: v.fields, subs: v.subs.map((label) => ({ slug: slugify(label), label })) }]),
) as unknown as Record<CategorySlug, Category>;

export const CATEGORY_SLUGS = Object.keys(tree) as CategorySlug[];

export function subcategoryLabel(cat: string | null | undefined, sub: string | null | undefined): string | null {
  if (!cat || !sub || !(cat in CATEGORIES)) return null;
  return CATEGORIES[cat as CategorySlug].subs.find((s) => s.slug === sub)?.label ?? null;
}

/** Etiquetas de los campos de detalle opcionales. */
export const FIELD_LABEL: Record<string, string> = {
  marca: "Marca", modelo: "Modelo", bateria_pct: "Salud de batería (%)", medidas: "Medidas (alto × ancho × prof.)",
  anio: "Año", kilometraje: "Kilometraje", talle: "Talle", material: "Material", autor: "Autor / artista",
};

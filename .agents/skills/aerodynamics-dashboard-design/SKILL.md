---
name: aerodynamics-dashboard-design
description: Sistema de diseño visual para la app de gestión de la residencia de alumnos (cliente "Aerodynamics"). Úsalo siempre que construyas o modifiques UI (páginas, componentes, dashboards) de este proyecto, para mantener colores, tipografía y layout consistentes y evitar el típico look genérico de dashboard SaaS.
disable-model-invocation: false
---

# Aerodynamics — Sistema de diseño de la app de residencia

## Contexto
- Producto: app interna de **control y gestión** de una residencia de estudiantes (no es una web de marketing).
- Usuarios: **alumnos** (reservas, avisos, pagos, incidencias de mantenimiento) y **personal de la residencia** (ocupación, incidencias, gestión de reservas y residentes).
- Tono: moderno y premium — preciso y con confianza, ni juguetón ni corporativo-aburrido.
- Marca: **Aerodynamics**. La idea de movimiento/precisión se transmite a través de paleta, tipografía y un detalle recurrente — nunca con iconos literales de aviones o hélices.

## Tokens de diseño

### Color — paleta "Velocity"
| Token | Hex | Uso |
|---|---|---|
| base-100 | `#F5F6F8` | Fondo general de la app |
| base-200 | `#E8EAEE` | Tarjetas, paneles |
| base-300 | `#D2D6DC` | Bordes, separadores |
| base-content | `#1A1D23` | Texto principal |
| primary | `#FF4D1C` | Acción principal únicamente (naranja "postcombustión") — botones CTA, nav activo. Úsalo con moderación. |
| secondary | `#2B3445` | Sidebar, cabeceras, botones secundarios (grafito acero) |
| accent | `#00B8D9` | Enlaces, highlights informativos, filtros activos (cian "estela") |
| success | `#1FAE69` | Estado confirmado / pagado / disponible |
| warning | `#F5A623` | Estado pendiente / requiere atención |
| error | `#E5484D` | Estado vencido / incidencia |

Por qué: evita el típico dashboard "blanco + un azul SaaS + sombras por todos lados". Grafito + naranja + cian transmite precisión de ingeniería sin ser literal.

### Tipografía
- **Títulos/display:** Clash Display (alternativa: Space Grotesk) — geométrica, con un punto técnico, en pesos contenidos.
- **Cuerpo:** Inter — legibilidad alta en tablas densas y formularios.
- **Datos/utilidad** (números de habitación, fechas, IDs, importes, cifras de tabla): **JetBrains Mono**, con numerales tabulares siempre que aparezca una cifra. Este es el toque distintivo: cada número de la app se lee como un instrumento de cabina.

### Layout
- Sidebar fija (color secondary) con navegación **separada por rol**: "Mi residencia" (alumno) vs "Gestión" (personal). Nunca mezclar ambos menús para un mismo usuario logueado.
- Área de contenido sobre base-100/200, espaciado generoso, tablas con cabecera fija (sticky).
- Estados siempre como `badge` de DaisyUI con color semántico (success/warning/error) **y texto**, nunca solo color — por accesibilidad.

### Elemento de firma
Líneas horizontales de 1px con degradado suave en los extremos (como una línea de flujo de aire) usadas como separador en sidebar y estados vacíos — el único motivo recurrente que conecta con "Aerodynamics" sin iconografía literal. Úsalo una vez por zona de pantalla, no en todas partes.

## Reglas de redacción de UI (específicas de dashboard)
- Botones: voz activa que nombra el resultado — "Reservar habitación", no "Enviar". Si el botón dice "Reservar", la pantalla/toast siguiente debe decir "Reservado" — mismo verbo en todo el flujo.
- Estados vacíos: indican qué hacer a continuación, no solo "no hay datos" — ej. "Aún no tienes incidencias registradas. Repórtala desde el botón de arriba."
- Errores: explican qué pasó y cómo solucionarlo, sin disculpas — "El pago no se procesó. Revisa los datos de la tarjeta e inténtalo de nuevo."
- Copy de alumno vs personal: las pantallas de personal pueden usar etiquetas más densas y técnicas (IDs, timestamps); las de alumnos, palabras cotidianas y directas.

## Qué evitar
- El look genérico de dashboard SaaS (blanco + un azul + sombras everywhere).
- Iconografía literal de aviación — la referencia a la marca vive en la paleta, los numerales mono y la línea de flujo, no en clipart de aviones.
- Abusar del naranja primary — resérvalo para la acción más importante de cada pantalla.

# WebP Studio v3.3

Tercera versión del optimizador de imágenes por lotes.

## Cambios principales

- Motor con Web Worker + OffscreenCanvas cuando el navegador lo soporta.
- Fallback automático a Canvas normal.
- Vista previa automática al cambiar configuración.
- Comparador visual tipo Squoosh.
- Rotación 90° izquierda/derecha.
- Zoom y ajuste automático.
- Conversión por lotes.
- Formatos de salida: WebP, JPEG y PNG.
- Presets de calidad.
- Presets personalizados guardados en localStorage.
- Renombrado por lote con nombre base y numeración automática.
- Redimensionamiento por ancho y alto máximos.
- Mantener proporción.
- Evitar ampliar imágenes pequeñas.
- Fondo transparente/blanco/negro.
- Eliminación de metadatos al recodificar.
- Descarga individual.
- Descarga ZIP.
- PWA/offline.
- Sin PHP, MySQL ni servicios externos.

## Instalación Laragon

Copia la carpeta:

    webp-studio-v3.3

dentro de:

    D:\laragon\www\

Luego abre:

    http://webp-studio-v3.3.test:8080

si Apache está usando el puerto 8080.

## Recomendación

Usa Chrome o Edge recientes para obtener Web Worker + OffscreenCanvas.

## Nota sobre AVIF

Esta versión no anuncia AVIF porque el soporte de codificación AVIF desde Canvas/OffscreenCanvas no es uniforme. Para una v4 conviene integrar un codec WASM real (por ejemplo libavif/Squoosh codecs) para garantizar AVIF.


## Renombrado por lote v3.2
- Mantener nombre original.
- Usar nombre base común.
- Buscar y reemplazar texto del nombre original.
- Prefijo y sufijo.
- Numeración automática opcional.
- Número inicial y cantidad de dígitos configurables.
- Vista previa del nombre final.
- Se aplica a descarga individual y ZIP.
- Se guarda dentro de presets personalizados.


## Novedades v3.3
- Botón Ayuda con guía de uso y cierre mediante Escape.
- Versión completa visible en cabecera, título y aplicación instalada.
- Visor limitado al espacio disponible y apertura ajustada; miniaturas sin recortes.
- Comparador alineado y porcentaje de zoom real.
- Pegar imágenes con Ctrl+V / Cmd+V o botón Pegar imagen.
- Copiar original o resultado convertido al portapapeles como PNG.
- Caché offline actualizada para evitar cargar recursos de versiones anteriores.

## Actualizar e iniciar
Extrae el ZIP. Sustituye los archivos de la aplicación por los de esta carpeta, incluido index.html (el archivo recibido como index(1).html se ha normalizado). Abre index.html desde tu servidor local o hosting. Si ves la versión anterior, recarga con Ctrl+F5. Conserva el mismo dominio para mantener los presets.

Los botones Copiar/Pegar requieren HTTPS o localhost y permisos del navegador. En un dominio local HTTP de Laragon, prueba Ctrl+V o selecciona el archivo. Copiar utiliza PNG para compatibilidad; Descargar conserva el formato elegido. No se importan enlaces de texto.

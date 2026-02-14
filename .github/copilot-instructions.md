<!-- Copilot / AI agent instructions for "Mi Primer Proyecto" -->
# Copilot instructions — Mi Primer Proyecto

Resumen rápido
- Proyecto: Single-page static app (no backend). UI in `index.html`, behavior in `app.js`.
- Data persistence: `localStorage` under key `usuariosKB` (array of user objects).

Qué debe saber un agente para ser productivo

- Arquitectura y flujo de datos:
  - `index.html` contiene la UI (3 pantallas: `pantalla1`, `pantalla2`, `pantalla3`).
  - `app.js` mantiene dos principales piezas de estado en memoria: `baseDeDatos` (persistido en `localStorage`) y `usuarioActual` (temporal hasta push).
  - Flujo: el usuario elige rol → `irAPaso2(rol)` → completa datos → `finalizarRegistro()` añade a `baseDeDatos` y persiste → `mostrarMatches()` filtra por `edificio`, `fecha` y `horario`.

- Puntos críticos y restricciones descubiertas en el código:
  - El matching exige coincidencia exacta en `fecha` y `horario` (string equality). Evitar cambios de formato de fecha sin actualizar la comparación.
  - `establecerFechaMinima()` fija `min` en `regFecha`; tests o cambios de fecha deben respetar ISO yyyy-mm-dd.
  - El DOM se manipula por IDs (ej. `regNombre`, `regFecha`, `listaResultados`). Nunca renombrar un ID sin actualizar `app.js`.

- Convenciones de este repo
  - Texto y labels están en español — mantén nuevas cadenas en español.
  - Estilos embebidos en `index.html` (no hay SASS/Build). Cambios de CSS se hacen directamente ahí.
  - No hay empaquetador ni dependencias externas; tratar como proyecto estático simple.

Comandos / flujo de desarrollo
- No hay build/test automatizado. Para probar localmente usar un servidor estático o VSCode Live Server.
  - Rápido con Python (desde la carpeta del proyecto):
    ```bash
    python -m http.server 8000
    # luego abrir http://localhost:8000
    ```
  - O usar la extensión Live Server en VS Code.

Debug y verificación
- Abrir DevTools → Consola para errores JS; `console.log` está permitido durante diagnóstico.
- Revisar `localStorage` (Application tab) bajo la clave `usuariosKB` para ver/editar datos de prueba.

Patrones y anti-patrones a respetar
- Código imperativo y global: `app.js` usa funciones globales; si refactorizas a módulos, mantén la misma interfaz (funciones globales llamadas desde `onclick`).
- Evitar usar librerías nuevas sin una razón clara: este repo está intencionalmente pequeño y sin dependencias.

Ejemplos concretos (copiar/usar)
- Filtrado de matches (mantener la lógica de igualdad de fecha):
  ```js
  const matches = baseDeDatos.filter(p => 
    p.edificio === edificioBusqueda && 
    p.rol !== usuarioActual.rol && 
    p.fecha === usuarioActual.fecha &&
    p.horario === usuarioActual.horario
  );
  ```
- Persistencia: `localStorage.setItem('usuariosKB', JSON.stringify(baseDeDatos))` — siempre serializar/parsear.

Qué no inventar (líneas rojas)
- No cambiar formatos de fecha ni localStorage key (`usuariosKB`) sin coordinar cambios en todas las funciones.
- No asumir presencia de un backend o tests automatizados; cualquier cambio que requiera servidor debe documentarse.

Dónde mirar primero
- `index.html` — estructura de pantallas y IDs.
- `app.js` — lógica de UI, persistencia y matching.
- `README.md` — contexto del autor (sin instrucciones de build).

Si necesitas más contexto
- Pide al autor/maintainer qué formato de teléfono (celular) esperan para `wa.me` links; actualmente `app.js` pasa `m.celular` directamente.

---
Por favor revisa y dime si quieres que:
- incluya ejemplos de tests manuales o scripts de servidor estático, o
- norme una pequeña convención para el formato de teléfonos y fechas.

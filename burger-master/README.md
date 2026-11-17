# Burger Master

Juego web educativo para aprender de memoria las 42 hamburguesas del documento **BUILD HAMBURGUESAS COLOMBIA**: sus ingredientes, cantidades y orden de montaje.

## Cómo usarlo

Abre `index.html` en cualquier navegador, con doble clic. No necesita servidor, instalación ni conexión a internet. El progreso se guarda en el LocalStorage del navegador.

Si quieres publicarlo, sirve la carpeta `burger-master/` como sitio estático.

## Contenido

| Sección | Qué hace |
|---|---|
| **Jugar** | Partida rápida (todos los modos mezclados) o un modo concreto. Partidas de 5, 8 o 12 preguntas. |
| Modo 1 · Construye la hamburguesa | Montar capa por capa. Se validan el ingrediente, la cantidad y el orden. |
| Modo 2 · ¿Qué le falta? | Capas ocultas: elegir qué va en cada hueco. |
| Modo 3 · Identifica la hamburguesa | Ver una combinación y elegir el nombre entre opciones parecidas. |
| Modo 4 · Memoria contrarreloj | Memorizar unos segundos y reconstruir de memoria con cronómetro. La rapidez da bonus. |
| Modo 5 · Detective de errores | Marcar capas incorrectas, fuera de orden o faltantes. |
| **Aprender** | Una ficha por hamburguesa: ilustración, orden de montaje con el texto original, notas del documento y diferencias con las más parecidas. Se pueden marcar como aprendidas. |
| **Entrenamiento personalizado** | Practicar solo las no dominadas, las 10 más difíciles, las marcadas como aprendidas, una familia o una selección propia. |
| **Examen final** | Rápido (15 preguntas) o completo (las 42 hamburguesas). Todos los modos, en dificultad Normal; se aprueba con 80%. |
| **Mi progreso** | Nivel, XP, precisión por modo, medallas, hamburguesas más difíciles, errores más comunes y dominio de cada hamburguesa. |

**Puntuación.** Cada acierto da XP según el modo y la dificultad (×1, ×1,5 o ×2). Las rachas dan un bonus de +10% por cada acierto seguido, hasta +100%. Las respuestas parciales reciben crédito parcial y los fallos restan poco. Hay 5 niveles: Aprendiz → Ayudante de cocina → Cocinero → Experto en hamburguesas → Maestro McDonald's. La dificultad Normal se desbloquea en el nivel 2 y la Difícil en el nivel 3. Hay 17 medallas.

**Repetición espaciada.** Usa un sistema Leitner de 6 cajas. Un fallo devuelve la hamburguesa a las primeras cajas, donde aparece más a menudo. Un acierto la sube de caja, así que aparece menos. El % de dominio es una media móvil de los resultados. Una hamburguesa cuenta como *dominada* con ≥80% de dominio y caja ≥3. Marcarla como aprendida no basta: hay que acertarla en los retos.

## Estructura

```
index.html              entrada
css/styles.css          estilos (responsive)
data/burgers.js         DATOS: ingredientes, 42 hamburguesas, notas (separados de la lógica)
img/ingredients/        fotos de ingredientes extraídas del propio documento
js/util.js              utilidades, comparación de recetas, distractores
js/store.js             persistencia (LocalStorage)
js/srs.js               repetición espaciada, dominio, registro de errores
js/scoring.js           XP, niveles, dificultades, medallas
js/audio.js             sonidos sintetizados (se pueden silenciar)
js/ui.js                navegación, efectos, ilustraciones
js/modes/*.js           los 5 modos de juego
js/session.js           motor de partidas y resumen
js/screens.js           menú, aprender, entrenamiento, examen, progreso, notas
tools/                  extracción y verificación de datos
```

## Datos y verificación

`data/burgers.js` se generó a partir del PDF con `tools/extract.py`. Cada línea del documento se asigna a un ingrediente y una cantidad mediante reglas explícitas. Si una línea no encaja en ninguna regla, el script falla, así que nunca se descarta ni se inventa información. Cada capa conserva su texto original.

Para comprobar los datos contra el documento:

```
pdftotext -layout BUILD-HAMBURGUESAS-COLOMBIA.pdf build.txt
node tools/verify-data.js build.txt
```

El script comprueba que los títulos y las 42 recetas coinciden línea por línea, y en el mismo orden, con el PDF. También verifica que no haya combinaciones repetidas y que todas las imágenes existan.

Las ambigüedades del documento y cómo se resolvieron se pueden ver en la app, en **Menú → Notas sobre los datos**, y en `dataNotes` dentro de `data/burgers.js`.

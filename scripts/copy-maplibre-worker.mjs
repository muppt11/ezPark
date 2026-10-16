// MapLibre loads its web worker relative to its own module URL, which breaks once the
// library is bundled. Serve the worker as a static file instead (see ParkingMap.tsx).
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/maplibre", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre/maplibre-gl-worker.mjs");

// mapConfig.js - Configuration MapLibre

// Configuration de la carte
export const MAP_CONFIG = {
  center: [2.3522, 48.8566],  // Paris centre (longitude, latitude)
  zoom: 12,
  minZoom: 10,
  maxZoom: 18,
  pitch: 0,
  bearing: 0,
  // Limites de Paris (empêche de sortir de la ville)
  maxBounds: [
    [2.2241, 48.8155], // Sud-Ouest
    [2.4698, 48.9021]  // Nord-Est
  ]
};

// Style par défaut (OpenFreeMap, gratuit, sans token)
// export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';



export const MAP_STYLE =
'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Styles alternatifs gratuits
export const FREE_STYLES = {
  // Style OpenStreetMap classique
  osm: 'https://tiles.openfreemap.org/tiles/e908f7bd-ff09-47ca-b1b5-1ef2b833cd78',
  // Style "Carto" (clair et lisible)
  carto: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  // Style minimaliste
  minimalist: 'https://api.maptiler.com/maps/basic/style.json?key=free'
};
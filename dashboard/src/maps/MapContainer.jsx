import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
const PARIS_CENTER = [2.3522, 48.8566];

const KPI_CONFIG = {
  transport: {
    field: 'transport_score',
    label: 'Score transport (/100)',
    colors: [0,'#fee0d2', 30,'#fc9272', 60,'#ef4444', 100,'#991b1b'],
    legend: [['#991b1b','Elevé (≥60)'],['#ef4444','Moyen (30)'],['#fc9272','Faible (10)'],['#94a3b8','N/D']],
  },
  cyclable: {
    field: 'cyclable_score',
    label: 'Score cyclable (/100)',
    colors: [0,'#ecfdf5', 20,'#6ee7b7', 50,'#10b981', 100,'#064e3b'],
    legend: [['#064e3b','Elevé (≥50)'],['#10b981','Moyen (20)'],['#6ee7b7','Faible (5)'],['#94a3b8','N/D']],
  },
  marche: {
    field: 'marche_score',
    label: 'Score marché (/100)',
    colors: [0,'#fffbeb', 20,'#fcd34d', 50,'#f59e0b', 100,'#b45309'],
    legend: [['#b45309','Elevé (≥50)'],['#f59e0b','Moyen (20)'],['#fcd34d','Faible (5)'],['#94a3b8','N/D']],
  },
  connectivite: {
    field: 'connectivite_score',
    label: 'Score connectivité (/100)',
    colors: [0,'#eff6ff', 30,'#93c5fd', 60,'#3b82f6', 100,'#1e3a8a'],
    legend: [['#1e3a8a','Elevé (≥60)'],['#3b82f6','Moyen (30)'],['#93c5fd','Faible (5)'],['#94a3b8','N/D']],
  },
};

function colorExpr(field, colors) {
  return [
    'case',
    ['!=', ['get', field], null],
    ['interpolate', ['linear'], ['get', field], ...colors],
    '#94a3b8',
  ];
}

// Calcule la bounding box d'un FeatureCollection
function getBounds(geojson) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const f of (geojson.features || [])) {
    if (!f.geometry) continue;
    let coords = [];
    if (f.geometry.type === 'LineString') {
      coords = f.geometry.coordinates || [];
    } else if (f.geometry.type === 'MultiLineString') {
      coords = (f.geometry.coordinates || []).reduce((acc, c) => acc.concat(c), []);
    } else if (f.geometry.type === 'Polygon') {
      coords = (f.geometry.coordinates || []).reduce((acc, c) => acc.concat(c), []);
    }
    for (const coord of coords) {
      if (!Array.isArray(coord) || coord.length < 2) continue;
      const lon = coord[0], lat = coord[1];
      if (typeof lon !== 'number' || typeof lat !== 'number') continue;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  if (!isFinite(minLon)) return null;
  return [[minLon, minLat], [maxLon, maxLat]];
}

const MapContainer = ({
  streetsData,
  activeKPI = 'transport',
  selectedStreetId = null,
  onFeatureClick,
  fitToData = false,
  centerOn = null,
}) => {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const popupRef     = useRef(null);
  const [ready, setReady] = useState(false);

  // ── Init carte ──────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: PARIS_CENTER,
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl(), 'bottom-right');

    popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '280px' });

    map.on('load', () => setReady(true));
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Ajout / mise à jour des rues ────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !streetsData) return;

    const cfg = KPI_CONFIG[activeKPI] || KPI_CONFIG.transport;
    const paint = colorExpr(cfg.field, cfg.colors);

    if (map.getSource('streets')) {
      map.getSource('streets').setData(streetsData);
      map.setPaintProperty('streets-line', 'line-color', paint);
      // Zoom sur les données si filtre actif
      if (fitToData && streetsData.features?.length) {
        const bounds = getBounds(streetsData);
        if (bounds) map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 600 });
      }
      return;
    }

    // Première création des layers
    map.addSource('streets', { type: 'geojson', data: streetsData });

    // Layer normal
    map.addLayer({
      id: 'streets-line',
      type: 'line',
      source: 'streets',
      paint: {
        'line-color': paint,
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 15, 2.5],
        'line-opacity': 0.85,
      },
    });

    // Layer surbrillance (rue cliquée)
    map.addLayer({
      id: 'streets-highlight',
      type: 'line',
      source: 'streets',
      filter: ['==', ['get', 'street_id'], -1], // aucune rue par défaut
      paint: {
        'line-color': '#ffffff',
        'line-width': 6,
        'line-opacity': 1,
      },
    });
    map.addLayer({
      id: 'streets-highlight-inner',
      type: 'line',
      source: 'streets',
      filter: ['==', ['get', 'street_id'], -1],
      paint: {
        'line-color': '#facc15',
        'line-width': 3,
        'line-opacity': 1,
      },
    });

    // Clic sur une rue
    map.on('click', 'streets-line', (e) => {
      const p = e.features[0].properties;

      const rows = [
        ['Transport',    p.transport_score,    '/100'],
        ['Cyclable',     p.cyclable_score,     '/100'],
        ['Marché',       p.marche_score,       '/100'],
        ['Connectivité', p.connectivite_score, '/100'],
      ].filter(([, v]) => v != null).map(([label, v, unit]) =>
        `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px">
           <span style="color:#64748b">${label}</span>
           <b>${Number(v).toFixed(1)}${unit}</b>
         </div>`
      ).join('');

      popupRef.current
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="padding:12px;font-family:sans-serif">
            <strong style="font-size:14px;display:block;margin-bottom:6px">${p.name || 'Rue sans nom'}</strong>
            <div style="font-size:12px;color:#94a3b8;margin-bottom:10px">
              ${p.arrondissement ? p.arrondissement + 'e arr.' : ''}
              ${p.length_km ? '· ' + Number(p.length_km).toFixed(2) + ' km' : ''}
            </div>
            ${rows || '<span style="font-size:13px;color:#94a3b8">Aucun score disponible</span>'}
          </div>
        `)
        .addTo(map);

      if (onFeatureClick) onFeatureClick(e.features[0]);
    });

    map.on('mouseenter', 'streets-line', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'streets-line', () => { map.getCanvas().style.cursor = ''; });

    // Zoom initial si données filtrées
    if (fitToData && streetsData.features?.length) {
      const bounds = getBounds(streetsData);
      if (bounds) map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 600 });
    }
  }, [ready, streetsData, fitToData, onFeatureClick]);

  // ── Mise à jour couleurs KPI ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !map.getLayer('streets-line')) return;
    const cfg = KPI_CONFIG[activeKPI] || KPI_CONFIG.transport;
    map.setPaintProperty('streets-line', 'line-color', colorExpr(cfg.field, cfg.colors));
  }, [ready, activeKPI]);

  // ── Mise à jour surbrillance rue sélectionnée ───────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !map.getLayer('streets-highlight')) return;
    const filter = selectedStreetId != null
      ? ['==', ['get', 'street_id'], selectedStreetId]
      : ['==', ['get', 'street_id'], -1];
    map.setFilter('streets-highlight', filter);
    map.setFilter('streets-highlight-inner', filter);
  }, [ready, selectedStreetId]);

  // ── Centrer la carte sur une rue (depuis la recherche) ───────
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !centerOn) return;
    map.flyTo({ center: [centerOn.lng, centerOn.lat], zoom: Math.max(map.getZoom(), 15), duration: 700 });
  }, [ready, centerOn]);

  const cfg = KPI_CONFIG[activeKPI] || KPI_CONFIG.transport;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {ready && (
        <div style={{
          position: 'absolute', bottom: '32px', left: '12px',
          background: 'white', borderRadius: '8px', padding: '10px 14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '12px', zIndex: 10,
        }}>
          <div style={{ fontWeight: 600, marginBottom: '6px', color: '#1e293b' }}>{cfg.label}</div>
          {cfg.legend.map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <div style={{ width: '20px', height: '3px', background: color, borderRadius: '2px', flexShrink: 0 }} />
              <span style={{ color: '#475569' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MapContainer;

const path = require('path');
const fs = require('fs');
const cache = require('../cache');

// Centroids approximatifs des arrondissements parisiens pour l'assignation spatiale
const ARR_CENTROIDS = {
  1:  { lon: 2.3452, lat: 48.8601 },
  2:  { lon: 2.3487, lat: 48.8668 },
  3:  { lon: 2.3579, lat: 48.8626 },
  4:  { lon: 2.3527, lat: 48.8533 },
  5:  { lon: 2.3514, lat: 48.8491 },
  6:  { lon: 2.3355, lat: 48.8494 },
  7:  { lon: 2.3130, lat: 48.8567 },
  8:  { lon: 2.3082, lat: 48.8750 },
  9:  { lon: 2.3393, lat: 48.8761 },
  10: { lon: 2.3586, lat: 48.8759 },
  11: { lon: 2.3786, lat: 48.8591 },
  12: { lon: 2.3955, lat: 48.8400 },
  13: { lon: 2.3643, lat: 48.8295 },
  14: { lon: 2.3258, lat: 48.8333 },
  15: { lon: 2.2923, lat: 48.8419 },
  16: { lon: 2.2665, lat: 48.8620 },
  17: { lon: 2.3110, lat: 48.8882 },
  18: { lon: 2.3459, lat: 48.8916 },
  19: { lon: 2.3824, lat: 48.8826 },
  20: { lon: 2.3973, lat: 48.8640 },
};

// Normalise un nom de rue : supprime accents + préfixes (Rue, Avenue, etc.)
function normalizeName(s) {
  if (!s) return '';
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const prefixes = [
    'AVENUE DE LA ','AVENUE DE L ','AVENUE DU ','AVENUE DES ','AVENUE DE ','AVENUE D ','AVENUE ',
    'BOULEVARD DE LA ','BOULEVARD DE L ','BOULEVARD DU ','BOULEVARD DES ','BOULEVARD DE ','BOULEVARD D ','BOULEVARD ',
    'RUE DE LA ','RUE DE L ','RUE DU ','RUE DES ','RUE DE ','RUE D ','RUE ',
    'IMPASSE DE LA ','IMPASSE DE ','IMPASSE DU ','IMPASSE ',
    'ALLEE DE LA ','ALLEE DE ','ALLEE DU ','ALLEE ',
    'PLACE DE LA ','PLACE DE ','PLACE DU ','PLACE ',
    'PASSAGE DE ','PASSAGE DU ','PASSAGE ',
    'VILLA DE ','VILLA ','VOIE ','CHEMIN DE ','CHEMIN ',
  ];
  for (const p of prefixes) {
    if (s.startsWith(p)) return s.slice(p.length).trim();
  }
  return s;
}

function nearestArrondissement(lon, lat) {
  let minDist = Infinity;
  let nearest = 1;
  for (const [arr, c] of Object.entries(ARR_CENTROIDS)) {
    const d = (lon - c.lon) ** 2 + (lat - c.lat) ** 2;
    if (d < minDist) {
      minDist = d;
      nearest = parseInt(arr);
    }
  }
  return nearest;
}

let STREETS = null;
let STREETS_INDEX = null;

function loadStreets() {
  if (STREETS) return;
  try {
    const voiesPath = path.join(__dirname, '..', '..', 'data', 'intermediate', 'voies_clean.geojson');
    const kpiPath = path.join(__dirname, '..', '..', 'data', 'gold', 'kpi_transport_accessibilite.json');

    const geojson = JSON.parse(fs.readFileSync(voiesPath, 'utf-8'));
    const kpiData = JSON.parse(fs.readFileSync(kpiPath, 'utf-8'));

    // Index transport KPI par nom de rue (majuscules)
    const transportByName = {};
    // Pont street_id → nom (transport couvre les 6593 rues, même ID que marché/connectivité)
    const transportByStreetId = {};
    for (const r of kpiData.records || []) {
      if (r.nom) transportByName[r.nom.toUpperCase()] = r;
      if (r.street_id != null && r.nom) transportByStreetId[r.street_id] = r.nom;
    }

    // Index cyclable KPI par nom normalisé
    const cyclablePath = path.join(__dirname, '..', '..', 'data', 'gold', 'kpi_cyclable.json');
    const cyclableData = JSON.parse(fs.readFileSync(cyclablePath, 'utf-8'));
    const cyclableByNorm = {};
    for (const r of cyclableData.records || []) {
      if (r.nom_normalise) cyclableByNorm[r.nom_normalise] = r;
    }

    // Index marché KPI par nom normalisé (via pont street_id → nom du transport)
    const marchePath = path.join(__dirname, '..', '..', 'data', 'gold', 'kpi_marche.json');
    const marcheData = JSON.parse(fs.readFileSync(marchePath, 'utf-8'));
    const marcheByNorm = {};
    for (const r of marcheData.records || []) {
      const nom = transportByStreetId[r.street_id];
      if (nom) {
        const normNom = normalizeName(nom);
        if (normNom) marcheByNorm[normNom] = r;
      }
    }

    // Index connectivité KPI par nom normalisé (via pont street_id → nom du transport)
    const connectivitePath = path.join(__dirname, '..', '..', 'data', 'gold', 'kpi_connectivite.json');
    const connectiviteData = JSON.parse(fs.readFileSync(connectivitePath, 'utf-8'));
    const connectiviteByNorm = {};
    for (const r of connectiviteData.records || []) {
      const nom = transportByStreetId[r.street_id];
      if (nom) {
        const normNom = normalizeName(nom);
        if (normNom) connectiviteByNorm[normNom] = r;
      }
    }

    STREETS = geojson.features.map((feat, idx) => {
      const props = feat.properties;
      const lon = props.centroid_lon;
      const lat = props.centroid_lat;
      const arr = (lon && lat) ? nearestArrondissement(lon, lat) : null;
      const transport = props.nom ? transportByName[props.nom.toUpperCase()] : null;
      const normNom = normalizeName(props.nom || '');
      const cyclable = normNom ? cyclableByNorm[normNom] : null;
      const marche = normNom ? marcheByNorm[normNom] : null;
      const connectivite = normNom ? connectiviteByNorm[normNom] : null;

      return {
        type: 'Feature',
        geometry: feat.geometry,
        properties: {
          street_id: idx,
          name: props.nom || null,
          arrondissement: arr,
          length_km: props.length_km || null,
          transport_score: transport ? transport.score_final : null,
          transport_class: transport ? transport.classe_accessibilite : null,
          cyclable_score: cyclable ? cyclable.score : null,
          marche_score: marche ? marche.score : null,
          connectivite_score: connectivite ? connectivite.kpi_connectivite : null,
        },
      };
    });

    STREETS_INDEX = {};
    for (const feat of STREETS) {
      STREETS_INDEX[feat.properties.street_id] = feat;
    }

    console.log(`[STREETS] ${STREETS.length} rues chargées depuis voies_clean.geojson`);
  } catch (err) {
    console.error('[STREETS] Erreur de chargement:', err.message);
    STREETS = [];
    STREETS_INDEX = {};
  }
}

loadStreets();

// GET /api/rues?arrondissement=X&min_length=Y&limit=Z&name=Q
const getAllRues = (req, res) => {
  try {
    const { arrondissement, min_length, limit = '500', name } = req.query;
    const cacheKey = `rues_${arrondissement || 'all'}_${min_length || '0'}_${limit}_${name || ''}`;

    let data = cache.get(cacheKey);
    if (!data) {
      let features = STREETS;

      if (arrondissement) {
        const arr = parseInt(arrondissement);
        features = features.filter(f => f.properties.arrondissement === arr);
      }
      if (min_length) {
        const minLen = parseFloat(min_length);
        features = features.filter(f => f.properties.length_km && f.properties.length_km >= minLen);
      }
      if (name) {
        const q = name.toUpperCase();
        features = features.filter(f => f.properties.name && f.properties.name.toUpperCase().includes(q));
      }

      const limitNum = Math.min(parseInt(limit) || 500, 2000);
      if (features.length > limitNum) {
        features = features.slice(0, limitNum);
      }

      data = {
        type: 'FeatureCollection',
        features,
        meta: { total: features.length },
      };
      // Ne pas mettre en cache les recherches par nom (trop variées)
      if (!name) cache.set(cacheKey, data, 3600);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/rues/search?name=X
const searchRues = (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ success: false, error: 'Le paramètre name est requis' });

    const query = name.toUpperCase();
    const results = STREETS
      .filter(f => f.properties.name && f.properties.name.toUpperCase().includes(query))
      .slice(0, 50)
      .map(f => ({
        street_id: f.properties.street_id,
        name: f.properties.name,
        arrondissement: f.properties.arrondissement,
        length_km: f.properties.length_km,
      }));

    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/rues/arrondissement/:id
const getRuesByArrondissement = (req, res) => {
  try {
    const arr = parseInt(req.params.id);
    if (isNaN(arr) || arr < 1 || arr > 20) {
      return res.status(400).json({ success: false, error: 'ID arrondissement invalide (1-20)' });
    }

    const cacheKey = `rues_arr_${arr}`;
    let data = cache.get(cacheKey);

    if (!data) {
      const features = STREETS.filter(f => f.properties.arrondissement === arr);
      data = {
        type: 'FeatureCollection',
        features,
        meta: { arrondissement: arr, total: features.length },
      };
      cache.set(cacheKey, data, 3600);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/rues/:id
const getRueById = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const feat = STREETS_INDEX[id];

    if (!feat) {
      return res.status(404).json({ success: false, error: 'Rue non trouvée' });
    }

    res.json({
      street_id: feat.properties.street_id,
      name: feat.properties.name,
      arrondissement: feat.properties.arrondissement,
      length_m: feat.properties.length_km ? feat.properties.length_km * 1000 : null,
      transport_score: feat.properties.transport_score,
      transport_class: feat.properties.transport_class,
      geometry: feat.geometry,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getAllRues, getRueById, searchRues, getRuesByArrondissement };

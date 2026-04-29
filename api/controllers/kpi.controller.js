const cache = require('../cache');

// Données réelles Paris 2023 (DVF + INSEE)
const PARIS_KPI = [
  { arrondissement: 1,  nom: '1er arrondissement',  prix_m2_median: 12710, logements_sociaux_pct: 6.5,  population: 15714,  surface_km2: 1.83 },
  { arrondissement: 2,  nom: '2e arrondissement',   prix_m2_median: 12660, logements_sociaux_pct: 5.2,  population: 21087,  surface_km2: 0.99 },
  { arrondissement: 3,  nom: '3e arrondissement',   prix_m2_median: 12700, logements_sociaux_pct: 7.8,  population: 33436,  surface_km2: 1.17 },
  { arrondissement: 4,  nom: '4e arrondissement',   prix_m2_median: 13370, logements_sociaux_pct: 9.1,  population: 27769,  surface_km2: 1.60 },
  { arrondissement: 5,  nom: '5e arrondissement',   prix_m2_median: 13060, logements_sociaux_pct: 8.3,  population: 57092,  surface_km2: 2.54 },
  { arrondissement: 6,  nom: '6e arrondissement',   prix_m2_median: 14990, logements_sociaux_pct: 3.2,  population: 40807,  surface_km2: 2.15 },
  { arrondissement: 7,  nom: '7e arrondissement',   prix_m2_median: 14850, logements_sociaux_pct: 4.1,  population: 51367,  surface_km2: 4.09 },
  { arrondissement: 8,  nom: '8e arrondissement',   prix_m2_median: 12870, logements_sociaux_pct: 5.8,  population: 35261,  surface_km2: 3.88 },
  { arrondissement: 9,  nom: '9e arrondissement',   prix_m2_median: 11990, logements_sociaux_pct: 7.5,  population: 59061,  surface_km2: 2.18 },
  { arrondissement: 10, nom: '10e arrondissement',  prix_m2_median: 11040, logements_sociaux_pct: 12.3, population: 88488,  surface_km2: 2.89 },
  { arrondissement: 11, nom: '11e arrondissement',  prix_m2_median: 11300, logements_sociaux_pct: 14.1, population: 147092, surface_km2: 3.67 },
  { arrondissement: 12, nom: '12e arrondissement',  prix_m2_median: 10360, logements_sociaux_pct: 16.8, population: 142115, surface_km2: 16.32 },
  { arrondissement: 13, nom: '13e arrondissement',  prix_m2_median: 9990,  logements_sociaux_pct: 20.2, population: 181483, surface_km2: 7.15 },
  { arrondissement: 14, nom: '14e arrondissement',  prix_m2_median: 11280, logements_sociaux_pct: 14.5, population: 135881, surface_km2: 5.62 },
  { arrondissement: 15, nom: '15e arrondissement',  prix_m2_median: 11480, logements_sociaux_pct: 16.1, population: 232335, surface_km2: 8.50 },
  { arrondissement: 16, nom: '16e arrondissement',  prix_m2_median: 12180, logements_sociaux_pct: 8.2,  population: 164855, surface_km2: 16.30 },
  { arrondissement: 17, nom: '17e arrondissement',  prix_m2_median: 11560, logements_sociaux_pct: 11.4, population: 164460, surface_km2: 5.64 },
  { arrondissement: 18, nom: '18e arrondissement',  prix_m2_median: 9730,  logements_sociaux_pct: 25.1, population: 196288, surface_km2: 6.01 },
  { arrondissement: 19, nom: '19e arrondissement',  prix_m2_median: 8690,  logements_sociaux_pct: 30.2, population: 184837, surface_km2: 6.79 },
  { arrondissement: 20, nom: '20e arrondissement',  prix_m2_median: 9090,  logements_sociaux_pct: 24.8, population: 195770, surface_km2: 5.98 },
];

// Historique prix m² par arrondissement (2019-2024)
const PRIX_M2_HISTORY = {
  1:  [11200, 11600, 12000, 12200, 12500, 12710],
  2:  [11100, 11500, 11900, 12100, 12400, 12660],
  3:  [11000, 11400, 11900, 12000, 12400, 12700],
  4:  [11800, 12200, 12600, 12900, 13100, 13370],
  5:  [11400, 11900, 12200, 12500, 12800, 13060],
  6:  [13200, 13700, 14100, 14400, 14700, 14990],
  7:  [13100, 13600, 14000, 14300, 14600, 14850],
  8:  [11300, 11700, 12100, 12400, 12600, 12870],
  9:  [10500, 10900, 11200, 11500, 11700, 11990],
  10: [9700,  10100, 10400, 10700, 10900, 11040],
  11: [9900,  10300, 10600, 10900, 11100, 11300],
  12: [9100,  9500,  9800,  10100, 10200, 10360],
  13: [8800,  9100,  9400,  9700,  9900,  9990],
  14: [9900,  10300, 10600, 10900, 11100, 11280],
  15: [10100, 10500, 10800, 11100, 11300, 11480],
  16: [10700, 11100, 11400, 11700, 11900, 12180],
  17: [10200, 10600, 10900, 11100, 11400, 11560],
  18: [8500,  8800,  9100,  9400,  9600,  9730],
  19: [7600,  7900,  8100,  8400,  8600,  8690],
  20: [7900,  8200,  8500,  8700,  8900,  9090],
};

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024];

const TIMELINE_GLOBAL = {
  prix_m2:              [9820,  10200, 10550, 10850, 11100, 11300],
  prix_m2_median:       [9820,  10200, 10550, 10850, 11100, 11300],
  logements_sociaux_pct:[16.5,  17.0,  17.5,  18.0,  18.3,  18.5],
  logements_sociaux:    [16.5,  17.0,  17.5,  18.0,  18.3,  18.5],
  wifi_density:         [180,   210,   230,   250,   265,   275],
  antennes_count:       [1500,  1700,  1900,  2050,  2120,  2170],
};

const KPI_FIELD_MAP = {
  prix_m2: 'prix_m2_median',
  prix_m2_median: 'prix_m2_median',
  logements_sociaux: 'logements_sociaux_pct',
  logements_sociaux_pct: 'logements_sociaux_pct',
  population: 'population',
};

// GET /api/kpi
const getGlobalKPI = (req, res) => {
  const cacheKey = 'kpi_global_v3';
  let data = cache.get(cacheKey);

  if (!data) {
    const avgPrix = Math.round(PARIS_KPI.reduce((s, a) => s + a.prix_m2_median, 0) / 20);
    const avgSocial = Number((PARIS_KPI.reduce((s, a) => s + a.logements_sociaux_pct, 0) / 20).toFixed(1));

    data = {
      prix_m2_median: avgPrix,
      logements_sociaux_pct: avgSocial,
      wifi_count: 280,           // réel: somme wifi_hotspots_count (connectivite)
      antennes_count: 1563,      // réel: somme mobile_antennas_count (connectivite)
      score_transport_moyen: 7.86,
      score_cyclable_moyen: 4.39,   // sur 100
      score_marche_moyen: 30.55,
      score_connectivite_moyen: 47.04,
      rues_cyclables: 3906,
      rues_avec_marche: 79,
      population_totale: PARIS_KPI.reduce((s, a) => s + a.population, 0),
      nb_arrondissements: 20,
    };
    cache.set(cacheKey, data, 86400);
  }

  res.json(data);
};

// GET /api/kpi/transport
const getTransportStats = (req, res) => {
  res.json({
    success: true,
    kpi: 'transport',
    label: 'Accessibilité transport',
    stats: {
      nb_rues: 6593,
      score_moyen: 7.86,
      score_median: 6.44,
      score_min: 0,
      score_max: 100,
      distribution: {
        'Très faible': 6217,
        'Faible': 346,
        'Moyenne': 26,
        'Élevée': 2,
        'Très élevée': 2,
      },
    },
    source: 'kpi_transport.parquet',
  });
};

// GET /api/kpi/cyclable
const getCyclableStats = (req, res) => {
  res.json({
    success: true,
    kpi: 'cyclable',
    label: 'Cyclabilité',
    stats: {
      nb_rues: 3906,
      score_moyen: 4.39,
    },
    source: 'kpi_cyclable.parquet',
  });
};

// GET /api/kpi/marche
const getMarcheStats = (req, res) => {
  res.json({
    success: true,
    kpi: 'marche',
    label: 'Accessibilité marchés',
    stats: {
      nb_rues_avec_marche: 79,
      score_moyen: 30.55,
    },
    source: 'kpi_marche.parquet',
  });
};

// GET /api/kpi/connectivite
const getConnectiviteStats = (req, res) => {
  res.json({
    success: true,
    kpi: 'connectivite',
    label: 'Connectivité (WiFi + Antennes)',
    stats: {
      nb_rues: 1810,
      score_moyen: 47.04,
      total_wifi_hotspots: 280,
      total_antennes_mobiles: 1563,
    },
    source: 'kpi_connectivite_rue.parquet',
  });
};

// GET /api/kpi/arrondissement?arrondissement=X&year=Y
const getByArrondissement = (req, res) => {
  const arr = parseInt(req.query.arrondissement);
  if (isNaN(arr) || arr < 1 || arr > 20) {
    return res.status(400).json({ error: 'arrondissement doit être entre 1 et 20' });
  }

  const kpi = PARIS_KPI.find(a => a.arrondissement === arr);
  let prixM2 = kpi.prix_m2_median;

  const year = req.query.year ? parseInt(req.query.year) : null;
  if (year && YEARS.includes(year)) {
    prixM2 = PRIX_M2_HISTORY[arr][YEARS.indexOf(year)];
  }

  res.json({
    success: true,
    data: {
      arrondissement: arr,
      nom: kpi.nom,
      prix_m2_median: prixM2,
      logements_sociaux_pct: kpi.logements_sociaux_pct,
      population: kpi.population,
      surface_km2: kpi.surface_km2,
      densite: Math.round(kpi.population / kpi.surface_km2),
    },
  });
};

// GET /api/kpi/compare?arr1=X&arr2=Y&kpi=Z
// Réponse attendue par le frontend : { arr1, arr2, arr1_value, arr2_value, kpi }
const compare = (req, res) => {
  const arr1 = parseInt(req.query.arr1);
  const arr2 = parseInt(req.query.arr2);
  const kpiName = req.query.kpi || 'prix_m2';

  if (isNaN(arr1) || isNaN(arr2) || arr1 < 1 || arr1 > 20 || arr2 < 1 || arr2 > 20) {
    return res.status(400).json({ error: 'arr1 et arr2 doivent être entre 1 et 20' });
  }

  const d1 = PARIS_KPI.find(a => a.arrondissement === arr1);
  const d2 = PARIS_KPI.find(a => a.arrondissement === arr2);
  const field = KPI_FIELD_MAP[kpiName] || 'prix_m2_median';

  res.json({
    arr1: arr1,
    arr2: arr2,
    kpi: kpiName,
    arr1_value: d1[field],
    arr2_value: d2[field],
    difference: d2[field] - d1[field],
    difference_pct: Number(((d2[field] - d1[field]) / d1[field] * 100).toFixed(1)),
  });
};

// GET /api/kpi/timeline?kpi=X&arrondissement=Y
// Réponse attendue par le frontend : { years: [...], values: [...] }
const getTimeline = (req, res) => {
  const kpiName = req.query.kpi || 'prix_m2';
  const arr = req.query.arrondissement ? parseInt(req.query.arrondissement) : null;

  let values;
  if ((kpiName === 'prix_m2' || kpiName === 'prix_m2_median') && arr && arr >= 1 && arr <= 20) {
    values = PRIX_M2_HISTORY[arr];
  } else {
    values = TIMELINE_GLOBAL[kpiName] || TIMELINE_GLOBAL.prix_m2;
  }

  res.json({ years: YEARS, values });
};

// GET /api/kpi/ranking?kpi=prix_m2&order=desc
const getRanking = (req, res) => {
  const kpiName = req.query.kpi || 'prix_m2';
  const order = req.query.order || 'desc';
  const field = KPI_FIELD_MAP[kpiName] || 'prix_m2_median';

  const sorted = [...PARIS_KPI]
    .sort((a, b) => order === 'desc' ? b[field] - a[field] : a[field] - b[field])
    .map((a, i) => ({ rang: i + 1, arrondissement: a.arrondissement, nom: a.nom, valeur: a[field] }));

  res.json({ success: true, kpi: kpiName, data: sorted });
};

module.exports = {
  getGlobalKPI, getByArrondissement, compare, getTimeline, getRanking,
  getTransportStats, getCyclableStats, getMarcheStats, getConnectiviteStats,
};

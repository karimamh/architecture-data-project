/**
 * Contrôleur de comparaison
 * Gère la comparaison entre arrondissements sur différents KPIs
 */

const cache = require('../cache');

// Données mockées par arrondissement pour différents KPIs
const getArrondissementData = (id) => {
  return {
    id: id,
    prix_m2: Math.floor(8000 + Math.random() * 12000),
    logements_sociaux: Number((5 + Math.random() * 35).toFixed(1)),
    wifi_count: Math.floor(Math.random() * 60),
    antennes_count: Math.floor(Math.random() * 250),
    velib_stations: Math.floor(Math.random() * 40),
    restaurants: Math.floor(Math.random() * 400),
    espaces_verts: Math.floor(Math.random() * 30),
    ecoles: Math.floor(Math.random() * 50)
  };
};

/**
 * @desc    Comparer deux arrondissements sur un KPI spécifique
 * @route   GET /api/compare?arr1=1&arr2=12&kpi=prix_m2
 * @access  Public
 */
const compare = async (req, res) => {
  try {
    const { arr1, arr2, kpi = 'prix_m2' } = req.query;

    if (!arr1 || !arr2) {
      return res.status(400).json({
        success: false,
        error: 'Les paramètres arr1 et arr2 sont requis',
        timestamp: new Date().toISOString()
      });
    }

    const id1 = parseInt(arr1);
    const id2 = parseInt(arr2);

    if (isNaN(id1) || isNaN(id2) || id1 < 1 || id1 > 20 || id2 < 1 || id2 > 20) {
      return res.status(400).json({
        success: false,
        error: 'IDs invalides. Utilisez des numéros entre 1 et 20.',
        timestamp: new Date().toISOString()
      });
    }

    const cacheKey = `compare_${id1}_${id2}_${kpi}`;
    let data = cache.get(cacheKey);

    if (!data) {
      const data1 = getArrondissementData(id1);
      const data2 = getArrondissementData(id2);

      const value1 = data1[kpi];
      const value2 = data2[kpi];
      const diff = value2 - value1;
      const diffPct = ((diff / value1) * 100).toFixed(1);

      const kpiLabels = {
        prix_m2: 'Prix au m²',
        logements_sociaux: 'Logements sociaux',
        wifi_count: 'Hotspots Wi-Fi',
        antennes_count: 'Antennes mobiles',
        velib_stations: 'Stations Vélib',
        restaurants: 'Restaurants',
        espaces_verts: 'Espaces verts',
        ecoles: 'Écoles'
      };

      data = {
        success: true,
        comparison: {
          arr1: { id: id1, value: value1 },
          arr2: { id: id2, value: value2 },
          kpi: { name: kpi, label: kpiLabels[kpi] || kpi },
          difference: Math.abs(diff),
          difference_pct: Math.abs(diffPct),
          winner: value2 > value1 ? `arrondissement ${id2}` : `arrondissement ${id1}`,
          interpretation: value2 > value1
            ? `Le ${id2}ème arrondissement a un ${kpiLabels[kpi]} ${Math.abs(diffPct)}% plus élevé que le ${id1}ème`
            : `Le ${id1}ème arrondissement a un ${kpiLabels[kpi]} ${Math.abs(diffPct)}% plus élevé que le ${id2}ème`
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
      cache.set(cacheKey, data);
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * @desc    Comparer deux arrondissements sur tous les KPIs
 * @route   GET /api/compare/multi?arr1=1&arr2=12
 * @access  Public
 */
const compareMultiple = async (req, res) => {
  try {
    const { arr1, arr2 } = req.query;

    if (!arr1 || !arr2) {
      return res.status(400).json({
        success: false,
        error: 'Les paramètres arr1 et arr2 sont requis',
        timestamp: new Date().toISOString()
      });
    }

    const id1 = parseInt(arr1);
    const id2 = parseInt(arr2);

    const cacheKey = `compare_multi_${id1}_${id2}`;
    let data = cache.get(cacheKey);

    if (!data) {
      const data1 = getArrondissementData(id1);
      const data2 = getArrondissementData(id2);

      const kpis = ['prix_m2', 'logements_sociaux', 'wifi_count', 'antennes_count', 'velib_stations', 'restaurants'];
      const comparison = {};

      for (const kpi of kpis) {
        const value1 = data1[kpi];
        const value2 = data2[kpi];
        const diffPct = ((value2 - value1) / value1 * 100).toFixed(1);
        
        comparison[kpi] = {
          arr1: value1,
          arr2: value2,
          difference_pct: Math.abs(diffPct),
          advantage: value2 > value1 ? 'arr2' : 'arr1'
        };
      }

      data = {
        success: true,
        arr1: id1,
        arr2: id2,
        comparison,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
      cache.set(cacheKey, data);
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * @desc    Obtenir le classement des arrondissements pour un KPI
 * @route   GET /api/compare/ranking?kpi=prix_m2&limit=10
 * @access  Public
 */
const getRanking = async (req, res) => {
  try {
    const { kpi = 'prix_m2', limit = 10 } = req.query;
    const limitNum = parseInt(limit);

    const cacheKey = `ranking_${kpi}_${limitNum}`;
    let data = cache.get(cacheKey);

    if (!data) {
      const rankings = [];
      
      for (let i = 1; i <= 20; i++) {
        const arrData = getArrondissementData(i);
        rankings.push({
          id: i,
          nom: `${i}ème`,
          valeur: arrData[kpi]
        });
      }

      rankings.sort((a, b) => b.valeur - a.valeur);
      const topRankings = rankings.slice(0, limitNum).map((item, index) => ({
        rang: index + 1,
        ...item
      }));

      data = {
        success: true,
        kpi,
        rankings: topRankings,
        metadata: {
          total: rankings.length,
          timestamp: new Date().toISOString()
        }
      };
      cache.set(cacheKey, data);
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  compare,
  compareMultiple,
  getRanking
};
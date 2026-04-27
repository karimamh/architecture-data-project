/**
 * Contrôleur de timeline
 * Gère l'évolution temporelle des indicateurs
 */

const cache = require('../cache');

// Années disponibles
const YEARS = [2019, 2020, 2021, 2022, 2023, 2024];

// Données historiques par KPI (moyenne Paris)
const HISTORICAL_DATA = {
  prix_m2: [9500, 9800, 10200, 10800, 11200, 11800],
  logements_sociaux: [15.2, 15.8, 16.5, 17.2, 18.0, 18.5],
  wifi_count: [180, 210, 240, 260, 270, 275],
  antennes_count: [1500, 1700, 1900, 2050, 2120, 2170]
};

const KPI_LABELS = {
  prix_m2: { label: 'Prix au m²', unit: '€', higher_is_better: false },
  logements_sociaux: { label: 'Logements sociaux', unit: '%', higher_is_better: true },
  wifi_count: { label: 'Hotspots Wi-Fi', unit: 'nb', higher_is_better: true },
  antennes_count: { label: 'Antennes mobiles', unit: 'nb', higher_is_better: true }
};

/**
 * Génère des données pour un arrondissement spécifique
 */
const getArrondissementData = (kpi, arrondissementId) => {
  const baseValues = [...HISTORICAL_DATA[kpi]];
  // Variation aléatoire entre -20% et +20% pour simuler les différences entre arrondissements
  const variation = 0.8 + (arrondissementId / 20) * 0.4;
  return baseValues.map(v => Math.floor(v * variation));
};

/**
 * @desc    Récupérer la timeline d'un KPI
 * @route   GET /api/timeline?kpi=prix_m2&arrondissement=1
 * @access  Public
 */
const getTimeline = async (req, res) => {
  try {
    const { kpi = 'prix_m2', arrondissement = null } = req.query;

    if (!HISTORICAL_DATA[kpi]) {
      return res.status(400).json({
        success: false,
        error: `KPI invalide. Utilisez: ${Object.keys(HISTORICAL_DATA).join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const cacheKey = `timeline_${kpi}_${arrondissement || 'paris'}`;
    let data = cache.get(cacheKey);

    if (!data) {
      let values;
      let label;

      if (arrondissement) {
        const arrId = parseInt(arrondissement);
        values = getArrondissementData(kpi, arrId);
        label = `${arrId}ème arrondissement`;
      } else {
        values = [...HISTORICAL_DATA[kpi]];
        label = 'Paris (moyenne)';
      }

      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      const totalVariation = ((lastValue - firstValue) / firstValue * 100).toFixed(1);
      const average = values.reduce((a, b) => a + b, 0) / values.length;

      // Calcul des variations annuelles
      const annualVariations = [];
      for (let i = 1; i < values.length; i++) {
        const variation = ((values[i] - values[i-1]) / values[i-1] * 100).toFixed(1);
        annualVariations.push({
          annee: YEARS[i],
          valeur: values[i],
          variation_pct: parseFloat(variation)
        });
      }

      data = {
        success: true,
        kpi: {
          name: kpi,
          label: KPI_LABELS[kpi].label,
          unit: KPI_LABELS[kpi].unit
        },
        arrondissement: label,
        timeline: {
          years: YEARS,
          values
        },
        summary: {
          start_value: firstValue,
          end_value: lastValue,
          total_variation_pct: parseFloat(totalVariation),
          average: parseFloat(average.toFixed(1)),
          trend: totalVariation > 0 ? 'croissance' : 'décroissance',
          max: Math.max(...values),
          min: Math.min(...values)
        },
        annual_variations: annualVariations,
        metadata: {
          source: 'DVF / Paris Data',
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
 * @desc    Comparer deux années sur un KPI
 * @route   GET /api/timeline/compare?year1=2020&year2=2024&kpi=prix_m2&arrondissement=1
 * @access  Public
 */
const compareYears = async (req, res) => {
  try {
    const { year1 = 2020, year2 = 2024, kpi = 'prix_m2', arrondissement = null } = req.query;

    if (!HISTORICAL_DATA[kpi]) {
      return res.status(400).json({
        success: false,
        error: `KPI invalide. Utilisez: ${Object.keys(HISTORICAL_DATA).join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const y1 = parseInt(year1);
    const y2 = parseInt(year2);

    if (!YEARS.includes(y1) || !YEARS.includes(y2)) {
      return res.status(400).json({
        success: false,
        error: `Années invalides. Utilisez: ${YEARS.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const cacheKey = `timeline_compare_${y1}_${y2}_${kpi}_${arrondissement || 'paris'}`;
    let data = cache.get(cacheKey);

    if (!data) {
      let values;
      if (arrondissement) {
        values = getArrondissementData(kpi, parseInt(arrondissement));
      } else {
        values = [...HISTORICAL_DATA[kpi]];
      }

      const idx1 = YEARS.indexOf(y1);
      const idx2 = YEARS.indexOf(y2);
      const value1 = values[idx1];
      const value2 = values[idx2];
      const variation = ((value2 - value1) / value1 * 100).toFixed(1);

      const interpretation = variation > 0
        ? `Augmentation de ${Math.abs(variation)}% entre ${y1} et ${y2}`
        : `Diminution de ${Math.abs(variation)}% entre ${y1} et ${y2}`;

      data = {
        success: true,
        kpi: {
          name: kpi,
          label: KPI_LABELS[kpi].label,
          unit: KPI_LABELS[kpi].unit
        },
        year1: { annee: y1, valeur: value1 },
        year2: { annee: y2, valeur: value2 },
        variation_pct: parseFloat(variation),
        interpretation,
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
 * @desc    Récupérer tous les KPIs en timeline
 * @route   GET /api/timeline/all
 * @access  Public
 */
const getAllTimelines = async (req, res) => {
  try {
    const { arrondissement = null } = req.query;
    const cacheKey = `timeline_all_${arrondissement || 'paris'}`;
    let data = cache.get(cacheKey);

    if (!data) {
      const results = {};

      for (const kpi of Object.keys(HISTORICAL_DATA)) {
        let values;
        if (arrondissement) {
          values = getArrondissementData(kpi, parseInt(arrondissement));
        } else {
          values = [...HISTORICAL_DATA[kpi]];
        }

        results[kpi] = {
          label: KPI_LABELS[kpi].label,
          unit: KPI_LABELS[kpi].unit,
          years: YEARS,
          values
        };
      }

      data = {
        success: true,
        arrondissement: arrondissement ? `${arrondissement}ème` : 'Paris (moyenne)',
        data: results,
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

module.exports = {
  getTimeline,
  compareYears,
  getAllTimelines
};
/**
 * Contrôleur Pollution (qualité de l'air, indices)
 * À compléter avec les données AirParif
 */

// Données mockées
const POLLUTION_DATA = {
  1: { pm10: 25, pm25: 15, no2: 40, indice: 4, qualite: 'Moyen' },
  4: { pm10: 28, pm25: 18, no2: 45, indice: 5, qualite: 'Médiocre' },
  7: { pm10: 22, pm25: 12, no2: 35, indice: 3, qualite: 'Bon' },
  8: { pm10: 30, pm25: 20, no2: 50, indice: 5, qualite: 'Médiocre' },
  15: { pm10: 20, pm25: 10, no2: 30, indice: 2, qualite: 'Très bon' }
};

/**
 * GET /api/pollution/:arrondissement
 */
exports.getPollutionByArrondissement = (req, res) => {
  try {
    const arrondissement = parseInt(req.params.arrondissement);
    const data = POLLUTION_DATA[arrondissement] || {
      pm10: 25,
      pm25: 15,
      no2: 40,
      indice: 4,
      qualite: 'Moyen'
    };

    res.json({
      success: true,
      data: {
        arrondissement,
        ...data
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/pollution/ranking
 */
exports.getPollutionRanking = (req, res) => {
  try {
    const ranking = Object.entries(POLLUTION_DATA)
      .map(([arr, data]) => ({
        arrondissement: parseInt(arr),
        indice: data.indice,
        qualite: data.qualite
      }))
      .sort((a, b) => a.indice - b.indice);

    res.json({ success: true, ranking });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
/**
 * Contrôleur Transport (métro, vélib, bus)
 * À compléter avec les données RATP / Vélib
 */

// Données mockées
const METRO_STATIONS = [
  { id: 1, nom: 'Hôtel de Ville', ligne: '1', arrondissement: 4, lon: 2.3522, lat: 48.8566 },
  { id: 2, nom: 'Champs-Élysées', ligne: '1', arrondissement: 8, lon: 2.3100, lat: 48.8700 },
  { id: 3, nom: 'Montparnasse', ligne: '4', arrondissement: 15, lon: 2.3351, lat: 48.8414 }
];

const VELIB_STATIONS = [
  { id: 1, nom: 'Station 1', arrondissement: 4, lon: 2.3522, lat: 48.8566, velos: 15 },
  { id: 2, nom: 'Station 2', arrondissement: 8, lon: 2.3100, lat: 48.8700, velos: 8 }
];

/**
 * GET /api/transport/metro
 */
exports.getMetroStations = (req, res) => {
  try {
    const { arrondissement, ligne } = req.query;
    let result = [...METRO_STATIONS];

    if (arrondissement) {
      result = result.filter(m => m.arrondissement === parseInt(arrondissement));
    }
    if (ligne) {
      result = result.filter(m => m.ligne === ligne);
    }

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/transport/velib
 */
exports.getVelibStations = (req, res) => {
  try {
    const { arrondissement } = req.query;
    let result = [...VELIB_STATIONS];

    if (arrondissement) {
      result = result.filter(v => v.arrondissement === parseInt(arrondissement));
    }

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/transport/score/:arrondissement
 */
exports.getTransportScore = (req, res) => {
  try {
    const arrondissement = parseInt(req.params.arrondissement);
    const metroCount = METRO_STATIONS.filter(m => m.arrondissement === arrondissement).length;
    const velibCount = VELIB_STATIONS.filter(v => v.arrondissement === arrondissement).length;
    
    const score = Math.min(100, (metroCount * 20) + (velibCount * 10));

    res.json({
      success: true,
      data: {
        arrondissement,
        metro_stations: metroCount,
        velib_stations: velibCount,
        score
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
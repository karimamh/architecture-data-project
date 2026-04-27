/**
 * Contrôleur de connectivité
 * Gère les données Wi-Fi et antennes mobiles
 */

const cache = require('../cache');

// Données Wi-Fi mockées (GeoJSON format)
const WIFI_HOTSPOTS = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
      properties: { id: 1, nom: 'Hôtel de Ville', adresse: 'Place de l\'Hôtel de Ville', arrondissement: 4, nb_bornes: 12, etat: 'actif' }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.2945, 48.8584] },
      properties: { id: 2, nom: 'Tour Eiffel', adresse: 'Champ de Mars', arrondissement: 7, nb_bornes: 8, etat: 'actif' }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3264, 48.8702] },
      properties: { id: 3, nom: 'Opéra Garnier', adresse: 'Place de l\'Opéra', arrondissement: 9, nb_bornes: 6, etat: 'actif' }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3351, 48.8414] },
      properties: { id: 4, nom: 'Gare Montparnasse', adresse: '17 Boulevard de Vaugirard', arrondissement: 15, nb_bornes: 10, etat: 'actif' }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3735, 48.8449] },
      properties: { id: 5, nom: 'Gare de Lyon', adresse: 'Place Louis Armand', arrondissement: 12, nb_bornes: 8, etat: 'actif' }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.2755, 48.8861] },
      properties: { id: 6, nom: 'Porte de Clignancourt', adresse: 'Boulevard Ornano', arrondissement: 18, nb_bornes: 4, etat: 'actif' }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3881, 48.8358] },
      properties: { id: 7, nom: 'Bibliothèque François Mitterrand', adresse: 'Quai François Mauriac', arrondissement: 13, nb_bornes: 15, etat: 'actif' }
    }
  ]
};

// Données antennes mockées
const ANTENNES = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3400, 48.8600] },
      properties: { id: 1, operateur: 'Orange', technologie: '5G', arrondissement: 1, mise_en_service: 2021 }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3100, 48.8750] },
      properties: { id: 2, operateur: 'Free', technologie: '5G', arrondissement: 8, mise_en_service: 2022 }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3000, 48.8400] },
      properties: { id: 3, operateur: 'Bouygues', technologie: '4G', arrondissement: 15, mise_en_service: 2019 }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3800, 48.8500] },
      properties: { id: 4, operateur: 'SFR', technologie: '5G', arrondissement: 12, mise_en_service: 2021 }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3500, 48.8900] },
      properties: { id: 5, operateur: 'Orange', technologie: '4G', arrondissement: 18, mise_en_service: 2018 }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3300, 48.8450] },
      properties: { id: 6, operateur: 'Free', technologie: '5G', arrondissement: 14, mise_en_service: 2023 }
    }
  ]
};

/* -------------------------------------------------------------------------- */
/*                               WIFI CONTROLLERS                             */
/* -------------------------------------------------------------------------- */

const getWifiHotspots = async (req, res) => {
  try {
    const { arrondissement, limit = 100 } = req.query;
    const cacheKey = `wifi_all_${arrondissement || 'all'}_${limit}`;
    let data = cache.get(cacheKey);

    if (!data) {
      let features = [...WIFI_HOTSPOTS.features];

      if (arrondissement) {
        features = features.filter(f => f.properties.arrondissement === parseInt(arrondissement));
      }

      if (limit && features.length > parseInt(limit)) {
        features = features.slice(0, parseInt(limit));
      }

      data = {
        success: true,
        count: features.length,
        data: {
          type: 'FeatureCollection',
          features
        },
        metadata: {
          source: 'Paris Data',
          license: 'Open License',
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

const getWifiById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const feature = WIFI_HOTSPOTS.features.find(f => f.properties.id === id);

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: 'Hotspot Wi-Fi non trouvé',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: feature,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

const getWifiStats = async (req, res) => {
  try {
    const cacheKey = 'wifi_stats';
    let data = cache.get(cacheKey);

    if (!data) {
      const total = WIFI_HOTSPOTS.features.length;
      const totalBornes = WIFI_HOTSPOTS.features.reduce((sum, f) => sum + f.properties.nb_bornes, 0);
      const parArrondissement = {};
      const parEtat = { actif: 0, inactif: 0 };

      WIFI_HOTSPOTS.features.forEach(f => {
        const arr = f.properties.arrondissement;
        parArrondissement[arr] = (parArrondissement[arr] || 0) + 1;
        parEtat[f.properties.etat] = (parEtat[f.properties.etat] || 0) + 1;
      });

      data = {
        success: true,
        data: {
          total_hotspots: total,
          total_bornes: totalBornes,
          moyenne_bornes_par_hotspot: Number((totalBornes / total).toFixed(1)),
          par_arrondissement: parArrondissement,
          par_etat: parEtat
        },
        metadata: {
          source: 'Paris Data',
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

/* -------------------------------------------------------------------------- */
/*                             ANTENNES CONTROLLERS                           */
/* -------------------------------------------------------------------------- */

const getAntennes = async (req, res) => {
  try {
    const { operateur, technologie, arrondissement } = req.query;
    const cacheKey = `antennes_${operateur || 'all'}_${technologie || 'all'}_${arrondissement || 'all'}`;
    let data = cache.get(cacheKey);

    if (!data) {
      let features = [...ANTENNES.features];

      if (operateur) {
        features = features.filter(f => f.properties.operateur === operateur);
      }
      if (technologie) {
        features = features.filter(f => f.properties.technologie === technologie);
      }
      if (arrondissement) {
        features = features.filter(f => f.properties.arrondissement === parseInt(arrondissement));
      }

      data = {
        success: true,
        count: features.length,
        data: {
          type: 'FeatureCollection',
          features
        },
        metadata: {
          source: 'ANFR',
          license: 'Open Data',
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

const getAntennesStats = async (req, res) => {
  try {
    const cacheKey = 'antennes_stats';
    let data = cache.get(cacheKey);

    if (!data) {
      const parOperateur = {};
      const parTechnologie = {};
      const parArrondissement = {};

      ANTENNES.features.forEach(f => {
        const op = f.properties.operateur;
        const tech = f.properties.technologie;
        const arr = f.properties.arrondissement;

        parOperateur[op] = (parOperateur[op] || 0) + 1;
        parTechnologie[tech] = (parTechnologie[tech] || 0) + 1;
        parArrondissement[arr] = (parArrondissement[arr] || 0) + 1;
      });

      data = {
        success: true,
        data: {
          total_antennes: ANTENNES.features.length,
          par_operateur: parOperateur,
          par_technologie: parTechnologie,
          par_arrondissement: parArrondissement,
          couverture_5g: ANTENNES.features.filter(f => f.properties.technologie === '5G').length,
          couverture_4g: ANTENNES.features.filter(f => f.properties.technologie === '4G').length
        },
        metadata: {
          source: 'ANFR',
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

/* -------------------------------------------------------------------------- */
/*                           EXPORTS ALIGNÉS AVEC ROUTES                      */
/* -------------------------------------------------------------------------- */

// Alias pour correspondre EXACTEMENT aux routes Express
const getAllWifi = getWifiHotspots;
const getWifiGeoJSON = getWifiHotspots;

const getAllAntennes = getAntennes;
const getAntennesGeoJSON = getAntennes;

module.exports = {
  getAllWifi,
  getWifiHotspots,
  getWifiById,
  getWifiGeoJSON,
  getWifiStats,
  getAllAntennes,
  getAntennes,
  getAntennesGeoJSON,
  getAntennesStats
};

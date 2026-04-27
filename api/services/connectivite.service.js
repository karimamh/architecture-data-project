/**
 * Service Connectivité
 * Logique métier pour Wi-Fi et antennes
 */

const cache = require('../cache');

// Données mockées
const WIFI_HOTSPOTS = [
  { id: 1, nom: 'Hôtel de Ville', arrondissement: 4, lon: 2.3522, lat: 48.8566, nb_bornes: 12 },
  { id: 2, nom: 'Tour Eiffel', arrondissement: 7, lon: 2.2945, lat: 48.8584, nb_bornes: 8 },
  { id: 3, nom: 'Opéra Garnier', arrondissement: 9, lon: 2.3264, lat: 48.8702, nb_bornes: 6 },
  { id: 4, nom: 'Gare Montparnasse', arrondissement: 15, lon: 2.3351, lat: 48.8414, nb_bornes: 10 },
  { id: 5, nom: 'Gare de Lyon', arrondissement: 12, lon: 2.3735, lat: 48.8449, nb_bornes: 8 }
];

const ANTENNES = [
  { id: 1, operateur: 'Orange', technologie: '5G', arrondissement: 1, lon: 2.3400, lat: 48.8600 },
  { id: 2, operateur: 'Free', technologie: '5G', arrondissement: 8, lon: 2.3100, lat: 48.8750 },
  { id: 3, operateur: 'Bouygues', technologie: '4G', arrondissement: 15, lon: 2.3000, lat: 48.8400 },
  { id: 4, operateur: 'SFR', technologie: '5G', arrondissement: 12, lon: 2.3800, lat: 48.8500 }
];

class ConnectiviteService {
  async getAllWifi(filters = {}) {
    let result = [...WIFI_HOTSPOTS];
    
    if (filters.arrondissement) {
      result = result.filter(w => w.arrondissement === filters.arrondissement);
    }
    if (filters.limit) {
      result = result.slice(0, filters.limit);
    }
    
    return result;
  }

  async getWifiStats() {
    const cacheKey = 'wifi_stats';
    let stats = cache.get(cacheKey);
    
    if (!stats) {
      const total = WIFI_HOTSPOTS.length;
      const totalBornes = WIFI_HOTSPOTS.reduce((sum, w) => sum + w.nb_bornes, 0);
      
      stats = {
        total_hotspots: total,
        total_bornes: totalBornes,
        moyenne_bornes: Number((totalBornes / total).toFixed(1))
      };
      cache.set(cacheKey, stats);
    }
    
    return stats;
  }

  async getAllAntennes(filters = {}) {
    let result = [...ANTENNES];
    
    if (filters.operateur) {
      result = result.filter(a => a.operateur === filters.operateur);
    }
    if (filters.technologie) {
      result = result.filter(a => a.technologie === filters.technologie);
    }
    
    return result;
  }

  async getAntennesStats() {
    const stats = {
      total: ANTENNES.length,
      par_operateur: {},
      par_technologie: {}
    };
    
    ANTENNES.forEach(a => {
      stats.par_operateur[a.operateur] = (stats.par_operateur[a.operateur] || 0) + 1;
      stats.par_technologie[a.technologie] = (stats.par_technologie[a.technologie] || 0) + 1;
    });
    
    return stats;
  }

  async getCoverageScore(arrondissement) {
    const wifiCount = WIFI_HOTSPOTS.filter(w => w.arrondissement === arrondissement).length;
    const antennesCount = ANTENNES.filter(a => a.arrondissement === arrondissement).length;
    
    const wifiScore = Math.min(100, (wifiCount / 10) * 100);
    const antennesScore = Math.min(100, (antennesCount / 20) * 100);
    
    return {
      arrondissement,
      wifi_score: Math.floor(wifiScore),
      antennes_score: Math.floor(antennesScore),
      global_score: Math.floor((wifiScore + antennesScore) / 2)
    };
  }
}

module.exports = new ConnectiviteService();
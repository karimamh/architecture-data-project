/**
 * Service Pollution
 * À compléter avec les données AirParif
 */

class PollutionService {
  async getPollutionByArrondissement(arrondissement) {
    // À implémenter
    return {
      arrondissement,
      pm10: 25,
      pm25: 15,
      no2: 40,
      indice: 4,
      qualite: 'Moyen'
    };
  }
}

module.exports = new PollutionService();
/**
 * Service Arrondissement
 * Logique métier pour les arrondissements
 */

const Arrondissement = require('../models/arrondissement.model');
const cache = require('../cache');

// Données mockées (à remplacer par base de données)
const arrondissementsData = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  numero: i + 1,
  nom: `${i + 1}ème arrondissement`,
  prix_m2_median: Math.floor(9000 + Math.random() * 13000),
  logements_sociaux_pct: Number((10 + Math.random() * 30).toFixed(1)),
  wifi_count: Math.floor(Math.random() * 60),
  antennes_count: Math.floor(Math.random() * 250),
  surface_km2: Number((1 + Math.random() * 3.5).toFixed(2)),
  population: Math.floor(20000 + Math.random() * 90000),
  monuments: []
}));

class ArrondissementService {
  constructor() {
    this.arrondissements = arrondissementsData.map(a => new Arrondissement(a));
  }

  async getAll(filters = {}) {
    const cacheKey = 'arrondissements_all';
    let result = cache.get(cacheKey);
    
    if (!result) {
      result = this.arrondissements.map(a => a.toJSON());
      cache.set(cacheKey, result);
    }

    // Appliquer les filtres
    if (filters.minPrice) {
      result = result.filter(a => a.prix_m2_median >= filters.minPrice);
    }
    if (filters.maxPrice) {
      result = result.filter(a => a.prix_m2_median <= filters.maxPrice);
    }
    if (filters.limit) {
      result = result.slice(0, filters.limit);
    }

    return result;
  }

  async getById(id) {
    const cacheKey = `arrondissement_${id}`;
    let result = cache.get(cacheKey);
    
    if (!result) {
      const arr = this.arrondissements.find(a => a.id === id);
      result = arr ? arr.toJSON() : null;
      if (result) cache.set(cacheKey, result);
    }
    
    return result;
  }

  async getStats() {
    const arrs = this.arrondissements;
    const total = arrs.length;
    
    return {
      total_arrondissements: total,
      prix_m2_moyen: Math.floor(arrs.reduce((a, b) => a + b.prix_m2_median, 0) / total),
      logements_sociaux_moyen: Number((arrs.reduce((a, b) => a + b.logements_sociaux_pct, 0) / total).toFixed(1)),
      total_wifi: arrs.reduce((a, b) => a + b.wifi_count, 0),
      total_antennes: arrs.reduce((a, b) => a + b.antennes_count, 0),
      population_totale: arrs.reduce((a, b) => a + b.population, 0),
      surface_totale: Number(arrs.reduce((a, b) => a + b.surface_km2, 0).toFixed(2))
    };
  }

  async getTopExpensive(limit = 5) {
    return [...this.arrondissements]
      .sort((a, b) => b.prix_m2_median - a.prix_m2_median)
      .slice(0, limit)
      .map(a => a.toJSON());
  }
}

module.exports = new ArrondissementService();
/**
 * Modèle Arrondissement
 * Définit la structure et les méthodes pour les arrondissements
 */

class Arrondissement {
  constructor(data) {
    this.id = data.id;
    this.numero = data.numero;
    this.nom = data.nom;
    this.prix_m2_median = data.prix_m2_median;
    this.logements_sociaux_pct = data.logements_sociaux_pct;
    this.wifi_count = data.wifi_count;
    this.antennes_count = data.antennes_count;
    this.surface_km2 = data.surface_km2;
    this.population = data.population;
    this.monuments = data.monuments || [];
  }

  // Getter pour la densité
  get densite() {
    return Math.floor(this.population / this.surface_km2);
  }

  // Getter pour le score global (calculé)
  get scoreGlobal() {
    const prixScore = Math.max(0, Math.min(100, (this.prix_m2_median - 5000) / 200));
    const socialScore = this.logements_sociaux_pct;
    const wifiScore = (this.wifi_count / 50) * 100;
    return Math.floor((prixScore + socialScore + wifiScore) / 3);
  }

  // Convertir en objet JSON
  toJSON() {
    return {
      id: this.id,
      numero: this.numero,
      nom: this.nom,
      prix_m2_median: this.prix_m2_median,
      logements_sociaux_pct: this.logements_sociaux_pct,
      wifi_count: this.wifi_count,
      antennes_count: this.antennes_count,
      surface_km2: this.surface_km2,
      population: this.population,
      densite: this.densite,
      monuments: this.monuments,
      score_global: this.scoreGlobal
    };
  }

  // Créer un arrondissement par défaut
  static default(id) {
    return new Arrondissement({
      id: id,
      numero: id,
      nom: `${id}ème arrondissement`,
      prix_m2_median: 10000,
      logements_sociaux_pct: 20,
      wifi_count: 20,
      antennes_count: 100,
      surface_km2: 2,
      population: 50000,
      monuments: []
    });
  }

  // Valider les données
  static validate(data) {
    const errors = [];
    
    if (!data.numero || data.numero < 1 || data.numero > 20) {
      errors.push('numero doit être entre 1 et 20');
    }
    if (data.prix_m2_median && data.prix_m2_median < 0) {
      errors.push('prix_m2_median ne peut pas être négatif');
    }
    if (data.logements_sociaux_pct && (data.logements_sociaux_pct < 0 || data.logements_sociaux_pct > 100)) {
      errors.push('logements_sociaux_pct doit être entre 0 et 100');
    }
    
    return { valid: errors.length === 0, errors };
  }
}

module.exports = Arrondissement;
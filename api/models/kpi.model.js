/**
 * Modèle KPI (Key Performance Indicators)
 * Définit les indicateurs clés et leurs métriques
 */

class KPIModel {
  constructor(data = {}) {
    this.prix_m2_median = data.prix_m2_median || null;
    this.logements_sociaux_pct = data.logements_sociaux_pct || null;
    this.wifi_count = data.wifi_count || null;
    this.antennes_count = data.antennes_count || null;
    this.prix_variation = data.prix_variation || null;
    this.sociaux_variation = data.sociaux_variation || null;
  }

  // KPI pour Paris global
  static parisGlobal() {
    return new KPIModel({
      prix_m2_median: 10500,
      logements_sociaux_pct: 18.5,
      wifi_count: 275,
      antennes_count: 2170,
      prix_variation: '+5.2',
      sociaux_variation: '+1.8'
    });
  }

  // KPI pour un arrondissement spécifique
  static parArrondissement(numero) {
    // Simulation de données (à remplacer par données réelles)
    const basePrice = 9000 + Math.random() * 13000;
    const baseSocial = 10 + Math.random() * 30;
    
    return new KPIModel({
      prix_m2_median: Math.floor(basePrice),
      logements_sociaux_pct: Number(baseSocial.toFixed(1)),
      wifi_count: Math.floor(Math.random() * 60),
      antennes_count: Math.floor(Math.random() * 250),
      prix_variation: `${(Math.random() * 10 - 2).toFixed(1)}`,
      sociaux_variation: `${(Math.random() * 5 + 1).toFixed(1)}`
    });
  }

  // Comparer deux KPI
  static compare(kpi1, kpi2, metric = 'prix_m2_median') {
    const value1 = kpi1[metric];
    const value2 = kpi2[metric];
    
    if (value1 === null || value2 === null) {
      return null;
    }
    
    const difference = value2 - value1;
    const differencePercent = ((difference / value1) * 100).toFixed(1);
    
    return {
      metric,
      value1,
      value2,
      difference: Math.abs(difference),
      difference_percent: Math.abs(differencePercent),
      winner: value2 > value1 ? 'kpi2' : 'kpi1'
    };
  }

  // Calculer un score composite (0-100)
  getCompositeScore() {
    let score = 0;
    let count = 0;
    
    if (this.prix_m2_median) {
      // Plus le prix est élevé, plus le score est bas (moins accessible)
      const prixScore = Math.max(0, Math.min(100, (20000 - this.prix_m2_median) / 200));
      score += prixScore;
      count++;
    }
    
    if (this.logements_sociaux_pct) {
      // Plus de logements sociaux = meilleur score
      score += this.logements_sociaux_pct * 2;
      count++;
    }
    
    if (this.wifi_count) {
      score += (this.wifi_count / 275) * 100;
      count++;
    }
    
    if (this.antennes_count) {
      score += (this.antennes_count / 2170) * 100;
      count++;
    }
    
    return count > 0 ? Math.floor(score / count) : 50;
  }

  // Convertir en objet JSON
  toJSON() {
    return {
      prix_m2_median: this.prix_m2_median,
      logements_sociaux_pct: this.logements_sociaux_pct,
      wifi_count: this.wifi_count,
      antennes_count: this.antennes_count,
      prix_variation: this.prix_variation,
      sociaux_variation: this.sociaux_variation,
      composite_score: this.getCompositeScore()
    };
  }
}

module.exports = KPIModel;
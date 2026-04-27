/**
 * Normalization - Fonctions de normalisation des données
 * Pour standardiser les valeurs entre 0 et 1 ou calculer des scores
 */

/**
 * Normalisation Min-Max (entre 0 et 1)
 * @param {number[]} values - Tableau de valeurs
 * @returns {number[]} Valeurs normalisées
 */
function minMaxScaling(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  if (max === min) {
    return values.map(() => 0.5);
  }
  
  return values.map(v => (v - min) / (max - min));
}

/**
 * Normalisation Min-Max avec échelle personnalisée
 * @param {number[]} values - Tableau de valeurs
 * @param {number} newMin - Nouvelle valeur minimum
 * @param {number} newMax - Nouvelle valeur maximum
 * @returns {number[]} Valeurs normalisées
 */
function minMaxScalingCustom(values, newMin = 0, newMax = 100) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  if (max === min) {
    return values.map(() => (newMin + newMax) / 2);
  }
  
  return values.map(v => newMin + (v - min) * (newMax - newMin) / (max - min));
}

/**
 * Normalisation Z-Score (standardisation)
 * @param {number[]} values - Tableau de valeurs
 * @returns {number[]} Valeurs standardisées
 */
function zScoreScaling(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) {
    return values.map(() => 0);
  }
  
  return values.map(v => (v - mean) / stdDev);
}

/**
 * Normalisation Softmax (probabilités)
 * @param {number[]} values - Tableau de valeurs
 * @returns {number[]} Probabilités (somme = 1)
 */
function softmaxScaling(values) {
  const expValues = values.map(v => Math.exp(v));
  const sumExp = expValues.reduce((a, b) => a + b, 0);
  return expValues.map(v => v / sumExp);
}

/**
 * Normalisation sur 100 (score)
 * @param {number[]} values - Tableau de valeurs
 * @returns {number[]} Scores sur 100
 */
function score100Scaling(values) {
  return minMaxScalingCustom(values, 0, 100);
}

/**
 * Calcule la variation en pourcentage
 * @param {number} oldValue - Ancienne valeur
 * @param {number} newValue - Nouvelle valeur
 * @returns {number} Variation en pourcentage
 */
function percentVariation(oldValue, newValue) {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Calcule la moyenne pondérée
 * @param {number[]} values - Tableau de valeurs
 * @param {number[]} weights - Tableau de poids (somme = 1)
 * @returns {number} Moyenne pondérée
 */
function weightedAverage(values, weights) {
  if (values.length !== weights.length) {
    throw new Error('Les tableaux values et weights doivent avoir la même longueur');
  }
  
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const sumWeighted = values.reduce((sum, v, i) => sum + v * weights[i], 0);
  
  return sumWeighted / sumWeights;
}

/**
 * Calcule un score composite à partir de plusieurs métriques
 * @param {Object} metrics - Objet { metricName: value }
 * @param {Object} weights - Objet { metricName: weight }
 * @param {Object} ranges - Objet { metricName: { min, max } }
 * @returns {number} Score composite sur 100
 */
function compositeScore(metrics, weights, ranges = {}) {
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const [metric, value] of Object.entries(metrics)) {
    const weight = weights[metric] || 1;
    totalWeight += weight;
    
    let normalizedValue = value;
    
    // Normaliser selon les ranges si fournies
    if (ranges[metric]) {
      const { min, max } = ranges[metric];
      if (max !== min) {
        normalizedValue = (value - min) / (max - min);
      } else {
        normalizedValue = 0.5;
      }
    }
    
    totalScore += normalizedValue * weight * 100;
  }
  
  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Inverse une valeur (pour les métriques où plus bas = mieux)
 * @param {number} value - Valeur à inverser
 * @param {number} max - Valeur maximum possible
 * @returns {number} Valeur inversée
 */
function invertValue(value, max = null) {
  if (max) {
    return max - value;
  }
  return 1 / (value + 0.001);
}

/**
 * Normalisation par rang (ranking)
 * @param {number[]} values - Tableau de valeurs
 * @returns {number[]} Rangs normalisés (0-1)
 */
function rankNormalization(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const ranks = values.map(v => sorted.indexOf(v) + 1);
  const maxRank = values.length;
  
  return ranks.map(r => (r - 1) / (maxRank - 1));
}

module.exports = {
  minMaxScaling,
  minMaxScalingCustom,
  zScoreScaling,
  softmaxScaling,
  score100Scaling,
  percentVariation,
  weightedAverage,
  compositeScore,
  invertValue,
  rankNormalization
};
/**
 * Cache module avec Node-Cache
 * Gère la mise en cache des données pour optimiser les performances
 */

const NodeCache = require('node-cache');

// Configuration du cache
const cache = new NodeCache({
  stdTTL: 3600,        // Durée de vie par défaut : 1 heure (3600 secondes)
  checkperiod: 600,    // Vérification des clés expirées toutes les 10 minutes
  useClones: false     // Désactive le clonage pour de meilleures performances
});

/**
 * Récupère une valeur du cache
 * @param {string} key - Clé unique
 * @returns {any} Valeur stockée ou null
 */
const get = (key) => {
  try {
    const value = cache.get(key);
    if (value === undefined) {
      console.log(`[CACHE] MISS - ${key}`);
      return null;
    }
    console.log(`[CACHE] HIT - ${key}`);
    return value;
  } catch (error) {
    console.error(`[CACHE] Erreur get ${key}:`, error);
    return null;
  }
};

/**
 * Stocke une valeur dans le cache
 * @param {string} key - Clé unique
 * @param {any} value - Valeur à stocker
 * @param {number} ttl - Durée de vie en secondes (optionnel)
 * @returns {boolean} Succès ou échec
 */
const set = (key, value, ttl = 3600) => {
  try {
    const success = cache.set(key, value, ttl);
    console.log(`[CACHE] SET - ${key} (TTL: ${ttl}s) ${success ? '✅' : '❌'}`);
    return success;
  } catch (error) {
    console.error(`[CACHE] Erreur set ${key}:`, error);
    return false;
  }
};

/**
 * Supprime une valeur du cache
 * @param {string} key - Clé unique
 * @returns {boolean} Succès ou échec
 */
const del = (key) => {
  try {
    const deleted = cache.del(key);
    console.log(`[CACHE] DEL - ${key} ${deleted > 0 ? '✅' : '❌'}`);
    return deleted > 0;
  } catch (error) {
    console.error(`[CACHE] Erreur del ${key}:`, error);
    return false;
  }
};

/**
 * Vide tout le cache
 * @returns {boolean} Succès ou échec
 */
const flush = () => {
  try {
    cache.flushAll();
    console.log(`[CACHE] FLUSH - Tout le cache a été vidé ✅`);
    return true;
  } catch (error) {
    console.error('[CACHE] Erreur flush:', error);
    return false;
  }
};

/**
 * Récupère les statistiques du cache
 * @returns {Object} Statistiques
 */
const stats = () => {
  return {
    keys: cache.keys(),
    keysCount: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    hitRate: cache.getStats().hits / (cache.getStats().hits + cache.getStats().misses) || 0
  };
};

module.exports = {
  get,
  set,
  del,
  flush,
  stats
};
/**
 * Rate Limiting
 * Limite le nombre de requêtes pour éviter les abus
 */

const rateLimit = require('express-rate-limit');

// Limiteur général
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 429,
      message: 'Trop de requêtes, veuillez réessayer dans 15 minutes'
    }
  }
});

// Limiteur strict pour les endpoints sensibles
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requêtes par minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 429,
      message: 'Trop de requêtes, veuillez patienter une minute'
    }
  }
});

// Limiteur léger pour les endpoints publics
const lightLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requêtes par minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 429,
      message: 'Trop de requêtes'
    }
  }
});

module.exports = {
  generalLimiter,
  strictLimiter,
  lightLimiter
};
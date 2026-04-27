/**
 * Gestionnaire centralisé des erreurs
 * Capture toutes les erreurs et renvoie une réponse standardisée
 */

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log de l'erreur
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Statut HTTP (404, 400, 500, etc.)
  const statusCode = err.statusCode || 500;
  
  // Message d'erreur
  const message = err.message || 'Erreur interne du serveur';
  
  // Détails supplémentaires pour le développement
  const details = process.env.NODE_ENV === 'development' ? err.stack : undefined;

  res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode,
      message: message,
      details: details,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    }
  });
};

/**
 * Erreur 404 - Route non trouvée
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route non trouvée: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Erreur 400 - Requête invalide
 */
const badRequest = (message = 'Requête invalide') => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

/**
 * Erreur 401 - Non authentifié
 */
const unauthorized = (message = 'Non authentifié') => {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
};

/**
 * Erreur 403 - Accès interdit
 */
const forbidden = (message = 'Accès interdit') => {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
};

/**
 * Erreur 404 - Ressource non trouvée
 */
const notFoundError = (resource = 'Ressource') => {
  const error = new Error(`${resource} non trouvée`);
  error.statusCode = 404;
  return error;
};

module.exports = {
  errorHandler,
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  notFoundError
};
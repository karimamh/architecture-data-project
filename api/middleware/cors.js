/**
 * Configuration CORS
 * Définit les règles de partage entre frontend et backend
 */

const corsOptions = {
  // Origines autorisées (frontend React)
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Méthodes HTTP autorisées
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  // Headers autorisés
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  
  // Headers exposés au frontend
  exposedHeaders: ['X-Total-Count'],
  
  // Autoriser les cookies
  credentials: true,
  
  // Durée de cache CORS (en secondes)
  maxAge: 86400,
  
  // Réponse aux preflight requests
  optionsSuccessStatus: 200
};

module.exports = corsOptions;
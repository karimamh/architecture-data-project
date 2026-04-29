/**
 * URBAN DATA EXPLORER API
 * Serveur Express - Version Excellence 15/10
 */

// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const compression = require('compression');
// const rateLimit = require('./middleware/rateLimit');
// const { errorHandler, notFound } = require('./middleware/errorHandler');

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const mongoose = require('mongoose');

const rateLimit = require('./middleware/rateLimit');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import des routes
const arrondissementRoutes = require('./routes/arrondissement.routes');
const compareRoutes = require('./routes/compare.routes');
const connectiviteRoutes = require('./routes/connectivite.routes');
const timelineRoutes = require('./routes/timeline.routes');
const foodRoutes = require('./routes/food.routes');
const pollutionRoutes = require('./routes/pollution.routes');
const transportRoutes = require('./routes/transport.routes');
const kpiRoutes = require('./routes/kpi.routes');
const streetsRoutes = require('./routes/streets.routes');
const { getAllWifi, getAntennes } = require('./controllers/connectivite.controller');

// Initialisation
const app = express();
const PORT = process.env.PORT || 8000;


mongoose.connect(
 process.env.MONGO_URI
)
.then(() => {
 console.log("Mongo connected");
})
.catch(err => {
 console.error(err);
});

// ============================================================
// MIDDLEWARES GLOBAUX
// ============================================================

// Sécurité
app.use(helmet());

// Compression
app.use(compression());

// CORS
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true
// }));

app.use(cors({
origin:[
'http://localhost:3000',
'http://localhost:3001'
],
methods:['GET','POST','PUT','DELETE','OPTIONS'],
allowedHeaders:[
'Content-Type',
'Authorization'
],
credentials:true
}));

// JSON parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting global
app.use(rateLimit.generalLimiter);

// Logger des requêtes (simple)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ============================================================
// ROUTES
// ============================================================

// Route de base
app.get('/', (req, res) => {
  res.json({
    name: 'Urban Data Explorer API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      kpi: '/api/kpi',
      rues: '/api/rues',
      wifi: '/api/wifi',
      antennes: '/api/antennes',
      arrondissements: '/api/arrondissements',
      compare: '/api/compare',
      connectivite: '/api/connectivite',
      timeline: '/api/timeline',
      food: '/api/food',
      pollution: '/api/pollution',
      transport: '/api/transport',
      health: '/health'
    }
  });
});

// Route santé (health check)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// Routes API
app.use('/api/kpi', kpiRoutes);
app.use('/api/rues', streetsRoutes);
app.get('/api/wifi', getAllWifi);
app.get('/api/antennes', getAntennes);
app.use('/api/arrondissements', arrondissementRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/connectivite', connectiviteRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/pollution', pollutionRoutes);
app.use('/api/transport', transportRoutes);

// ============================================================
// GESTION DES ERREURS
// ============================================================

// Route non trouvée (404)
app.use(notFound);

// Gestionnaire d'erreurs global
app.use(errorHandler);

// ============================================================
// DÉMARRAGE
// ============================================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     🏆 URBAN DATA EXPLORER API                         ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   📡 API démarrée sur: http://localhost:${PORT}                               ║
║   ❤️  Health check: http://localhost:${PORT}/health                          ║
║   📊 KPI globaux:  http://localhost:${PORT}/api/kpi                          ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   📋 Endpoints disponibles:                                                  ║
║                                                                              ║
║   GET  /api/arrondissements     - Liste des arrondissements                  ║
║   GET  /api/arrondissements/:id - Détail d'un arrondissement                 ║
║   GET  /api/compare             - Comparaison deux arrondissements           ║
║   GET  /api/connectivite/wifi   - Hotspots Wi-Fi                             ║
║   GET  /api/connectivite/antennes - Antennes mobiles                         ║
║   GET  /api/timeline            - Évolution temporelle                       ║
║   GET  /api/food                - Données restaurants                        ║
║   GET  /api/pollution           - Qualité de l'air                           ║
║   GET  /api/transport           - Données transports                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
const express = require('express');
const router = express.Router();
const controller = require('../controllers/arrondissement.controller');
const { generalLimiter } = require('../middleware/rateLimit');

// Applique le rate limiting à toutes les routes
router.use(generalLimiter);

// Routes
router.get('/', controller.getAllArrondissements);
router.get('/stats/global', controller.getGlobalStats);
router.get('/:id', controller.getArrondissementById);
router.get('/:id/kpi', controller.getArrondissementKPI);

module.exports = router;
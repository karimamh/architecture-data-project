const express = require('express');
const router = express.Router();
const controller = require('../controllers/compare.controller');
const { lightLimiter } = require('../middleware/rateLimit');

router.use(lightLimiter);

// Routes - les noms doivent correspondre aux exports du contrôleur
router.get('/', controller.compare);           // ← compare (pas compareArrondissements)
router.get('/multi', controller.compareMultiple);  // ← compareMultiple
router.get('/ranking', controller.getRanking);     // ← getRanking

module.exports = router;
const express = require('express');
const router = express.Router();
const controller = require('../controllers/pollution.controller');
const { lightLimiter } = require('../middleware/rateLimit');

router.use(lightLimiter);

// Routes
router.get('/:arrondissement', controller.getPollutionByArrondissement);
router.get('/ranking', controller.getPollutionRanking);

module.exports = router;
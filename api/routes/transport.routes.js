const express = require('express');
const router = express.Router();
const controller = require('../controllers/transport.controller');
const { lightLimiter } = require('../middleware/rateLimit');

router.use(lightLimiter);

// Routes
router.get('/metro', controller.getMetroStations);
router.get('/velib', controller.getVelibStations);
router.get('/score/:arrondissement', controller.getTransportScore);

module.exports = router;
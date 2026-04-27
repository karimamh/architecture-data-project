const express = require('express');
const router = express.Router();
const controller = require('../controllers/connectivite.controller');
const { lightLimiter } = require('../middleware/rateLimit');

router.use(lightLimiter);

// Routes Wi-Fi
router.get('/wifi', controller.getAllWifi);
router.get('/wifi/geojson', controller.getWifiGeoJSON);
router.get('/wifi/stats', controller.getWifiStats);

// Routes Antennes
router.get('/antennes', controller.getAllAntennes);
router.get('/antennes/geojson', controller.getAntennesGeoJSON);
router.get('/antennes/stats', controller.getAntennesStats);

module.exports = router;
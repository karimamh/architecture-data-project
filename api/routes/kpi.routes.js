const express = require('express');
const router = express.Router();
const controller = require('../controllers/kpi.controller');

router.get('/', controller.getGlobalKPI);
router.get('/arrondissement', controller.getByArrondissement);
router.get('/compare', controller.compare);
router.get('/timeline', controller.getTimeline);
router.get('/ranking', controller.getRanking);
router.get('/transport', controller.getTransportStats);
router.get('/cyclable', controller.getCyclableStats);
router.get('/marche', controller.getMarcheStats);
router.get('/connectivite', controller.getConnectiviteStats);

module.exports = router;

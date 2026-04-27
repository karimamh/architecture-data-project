const express = require('express');
const router = express.Router();
const controller = require('../controllers/timeline.controller');
const { lightLimiter } = require('../middleware/rateLimit');

router.use(lightLimiter);

// Routes
router.get('/', controller.getTimeline);
router.get('/compare', controller.compareYears);
router.get('/all', controller.getAllTimelines);

module.exports = router;
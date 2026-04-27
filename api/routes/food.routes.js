const express = require('express');
const router = express.Router();
const controller = require('../controllers/food.controller');
const { lightLimiter } = require('../middleware/rateLimit');

router.use(lightLimiter);

// Routes
router.get('/restaurants', controller.getRestaurants);
router.get('/marches', controller.getMarches);
router.get('/score/:arrondissement', controller.getFoodScore);

module.exports = router;
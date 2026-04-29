const express = require('express');
const router = express.Router();
const controller = require('../controllers/streets.controller');

// Les routes spécifiques doivent être déclarées AVANT la route paramétrée /:id
router.get('/', controller.getAllRues);
router.get('/search', controller.searchRues);
router.get('/arrondissement/:id', controller.getRuesByArrondissement);
router.get('/:id', controller.getRueById);

module.exports = router;

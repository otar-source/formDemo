const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');

// Create certificate (POST)
router.post('/certificates', certificateController.createCertificate);

// Get certificate data as JSON (GET)
router.get('/certificates/:uuid', certificateController.getCertificate);

// Download PDF (GET)
router.get('/certificates/:uuid/pdf', certificateController.downloadPDF);

module.exports = router;
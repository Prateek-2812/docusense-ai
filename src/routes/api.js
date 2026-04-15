const express = require('express');
const multer = require('multer');
const router = express.Router();
const documentController = require('../controllers/documentController');

// Configure multer for in-memory uploads
const upload = multer({ storage: multer.memoryStorage() });

// Upload Endpoint
router.post('/upload', upload.single('document'), documentController.uploadDocument);

// Q&A Endpoint
router.post('/ask', documentController.askQuestion);

module.exports = router;

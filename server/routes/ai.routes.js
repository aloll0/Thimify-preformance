const express = require('express');
const aiController = require('../controllers/ai.controller');
const { authenticate, requireTeamLeader } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate, requireTeamLeader);
router.post('/generate-feedback', aiController.generateFeedback);
router.get('/analyze-performance/:employeeId', aiController.analyzePerformance);
router.get('/insights/:employeeId', aiController.getInsights);

module.exports = router;

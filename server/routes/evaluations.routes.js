const express = require('express');
const evaluationController = require('../controllers/evaluation.controller');
const { authenticate, requireTeamLeader, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.get('/', requireTeamLeader, evaluationController.getAllEvaluations);
router.get('/team-analytics', requireTeamLeader, evaluationController.getTeamAnalytics);
router.get('/company-analytics', requireAdmin, evaluationController.getCompanyAnalytics);
router.get('/:id', requireTeamLeader, evaluationController.getEvaluationById);
router.post('/', requireTeamLeader, evaluationController.createEvaluation);
router.put('/:id', requireTeamLeader, evaluationController.updateEvaluation);
router.delete('/:id', requireTeamLeader, evaluationController.deleteEvaluation);

module.exports = router;

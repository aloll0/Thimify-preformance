const express = require("express");
const employeeController = require("../controllers/employee.controller");
const {
  authenticate,
  requireTeamLeader,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);
router.get("/", requireTeamLeader, employeeController.getAllEmployees);
router.get(
  "/:id/team-overview",
  requireTeamLeader,
  employeeController.getTeamLeaderOverview,
);
router.get("/:id", requireTeamLeader, employeeController.getEmployeeById);
router.get(
  "/:id/evaluations",
  requireTeamLeader,
  employeeController.getEmployeeEvaluations,
);
router.get(
  "/:id/ai-insights",
  requireTeamLeader,
  employeeController.getEmployeeAIInsights,
);
router.post("/", requireTeamLeader, employeeController.createEmployee);
router.put("/:id", requireTeamLeader, employeeController.updateEmployee);
router.delete("/:id", requireTeamLeader, employeeController.deleteEmployee);

module.exports = router;

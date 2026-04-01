const express = require("express");
const teamController = require("../controllers/team.controller");
const {
  authenticate,
  requireAdmin,
  requireTeamLeader,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);
router.get("/", requireTeamLeader, teamController.getAllTeams);
router.get("/:id", requireTeamLeader, teamController.getTeamById);
router.get(
  "/:id/employees",
  requireTeamLeader,
  teamController.getTeamEmployees,
);
router.post("/", requireAdmin, teamController.createTeam);
router.put("/:id", requireAdmin, teamController.updateTeam);
router.delete("/:id", requireAdmin, teamController.deleteTeam);

module.exports = router;

const { Evaluation, Employee, Team, User } = require("../models");

async function isTeamLeaderEmployee(employee) {
  if (!employee?.email) {
    return false;
  }

  const leaderUser = await User.findOne({
    email: employee.email.toLowerCase(),
    role: "team_leader",
    isActive: true,
  }).select("_id");

  return !!leaderUser;
}

// Get all evaluations
exports.getAllEvaluations = async (req, res) => {
  try {
    let query = {};

    // Apply filters
    if (req.query.employeeId) {
      query.employeeId = req.query.employeeId;
    }
    if (req.query.month) {
      query.evaluationMonth = parseInt(req.query.month);
    }
    if (req.query.year) {
      query.evaluationYear = parseInt(req.query.year);
    }

    // If team leader, filter by their team's employees
    if (req.userRole === "team_leader") {
      const team = await Team.findOne({ teamLeaderId: req.userId });
      if (team) {
        const teamEmployees = await Employee.find({
          teamId: team._id,
          isActive: true,
        });
        const employeeIds = teamEmployees.map((e) => e._id.toString());

        if (req.query.employeeId) {
          if (!employeeIds.includes(req.query.employeeId)) {
            return res.status(403).json({ message: "Access denied" });
          }
        } else {
          query.employeeId = { $in: employeeIds };
        }
      }
    }

    const evaluations = await Evaluation.find(query)
      .populate("employeeId", "firstName lastName level teamId")
      .populate("evaluatorId", "firstName lastName")
      .sort({ createdAt: -1 });

    // Populate team info for each evaluation
    const evaluationsWithTeam = await Promise.all(
      evaluations.map(async (eval) => {
        const emp = await Employee.findById(eval.employeeId).populate(
          "teamId",
          "name",
        );
        return {
          ...eval.toObject(),
          employeeId: emp,
        };
      }),
    );

    res.json(evaluationsWithTeam);
  } catch (error) {
    console.error("Get all evaluations error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get evaluation by ID
exports.getEvaluationById = async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id)
      .populate("employeeId", "firstName lastName level teamId")
      .populate("evaluatorId", "firstName lastName");

    if (!evaluation) {
      return res.status(404).json({ message: "Evaluation not found" });
    }

    // Check permission for team leader
    if (req.userRole === "team_leader") {
      const team = await Team.findById(evaluation.employeeId.teamId);
      if (!team || team.teamLeaderId.toString() !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.json(evaluation);
  } catch (error) {
    console.error("Get evaluation by ID error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create evaluation
exports.createEvaluation = async (req, res) => {
  try {
    const {
      employeeId,
      evaluationMonth,
      evaluationYear,
      scores,
      notes,
      feedback,
      aiGeneratedFeedback,
      aiSuggestions,
      promotionRecommended,
    } = req.body;

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const targetIsTeamLeader = await isTeamLeaderEmployee(employee);

    // Team leader can evaluate only members in their own team (not team leaders)
    if (req.userRole === "team_leader") {
      const team = await Team.findById(employee.teamId);
      if (!team || team.teamLeaderId.toString() !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (targetIsTeamLeader) {
        return res.status(403).json({
          message:
            "Team leaders can evaluate only team members, not team leaders.",
        });
      }
    }

    // Admin can evaluate only team leaders
    if (req.userRole === "admin" && !targetIsTeamLeader) {
      return res
        .status(403)
        .json({ message: "Admin can evaluate only team leaders." });
    }

    // Check if evaluation already exists for this month
    const existingEvaluation = await Evaluation.findOne({
      employeeId,
      evaluationMonth,
      evaluationYear,
    });

    if (existingEvaluation) {
      return res.status(400).json({
        message:
          "Evaluation already exists for this month. Please update the existing evaluation.",
      });
    }

    const evaluation = new Evaluation({
      employeeId,
      evaluatorId: req.userId,
      evaluationMonth,
      evaluationYear,
      scores,
      notes,
      feedback,
      aiGeneratedFeedback,
      aiSuggestions,
      promotionRecommended,
    });

    await evaluation.save();

    const populatedEvaluation = await Evaluation.findById(evaluation._id)
      .populate("employeeId", "firstName lastName level")
      .populate("evaluatorId", "firstName lastName");

    res.status(201).json(populatedEvaluation);
  } catch (error) {
    console.error("Create evaluation error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          "Evaluation already exists for this month. Please update the existing evaluation.",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid evaluation data. Please check all required fields.",
      });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// Update evaluation
exports.updateEvaluation = async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ message: "Evaluation not found" });
    }

    // Check permission - only evaluator or admin can update
    if (
      req.userRole === "team_leader" &&
      evaluation.evaluatorId.toString() !== req.userId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updates = req.body;
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && key !== "evaluatorId") {
        evaluation[key] = updates[key];
      }
    });

    await evaluation.save();

    const populatedEvaluation = await Evaluation.findById(evaluation._id)
      .populate("employeeId", "firstName lastName level")
      .populate("evaluatorId", "firstName lastName");

    res.json(populatedEvaluation);
  } catch (error) {
    console.error("Update evaluation error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete evaluation
exports.deleteEvaluation = async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ message: "Evaluation not found" });
    }

    // Check permission
    if (
      req.userRole === "team_leader" &&
      evaluation.evaluatorId.toString() !== req.userId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Evaluation.findByIdAndDelete(req.params.id);

    res.json({ message: "Evaluation deleted successfully" });
  } catch (error) {
    console.error("Delete evaluation error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get team analytics
exports.getTeamAnalytics = async (req, res) => {
  try {
    const { teamId, year = new Date().getFullYear() } = req.query;

    if (!teamId) {
      return res.status(400).json({ message: "Team ID is required" });
    }

    // Check permission
    if (req.userRole === "team_leader") {
      const team = await Team.findById(teamId);
      if (!team || team.teamLeaderId.toString() !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Get team employees
    const employees = await Employee.find({ teamId, isActive: true });
    const employeeIds = employees.map((e) => e._id);

    // Get evaluations for the year
    const evaluations = await Evaluation.find({
      employeeId: { $in: employeeIds },
      evaluationYear: parseInt(year),
    });

    // Calculate monthly averages
    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      const monthEvals = evaluations.filter((e) => e.evaluationMonth === month);
      if (monthEvals.length > 0) {
        const avgScore =
          monthEvals.reduce((sum, e) => sum + e.overallScore, 0) /
          monthEvals.length;
        monthlyData.push({
          month,
          averageScore: Math.round(avgScore),
          evaluationCount: monthEvals.length,
        });
      }
    }

    // Calculate category averages
    const categoryAverages = {
      productivity:
        evaluations.length > 0
          ? Math.round(
              evaluations.reduce((sum, e) => sum + e.scores.productivity, 0) /
                evaluations.length,
            )
          : 0,
      quality:
        evaluations.length > 0
          ? Math.round(
              evaluations.reduce((sum, e) => sum + e.scores.quality, 0) /
                evaluations.length,
            )
          : 0,
      communication:
        evaluations.length > 0
          ? Math.round(
              evaluations.reduce((sum, e) => sum + e.scores.communication, 0) /
                evaluations.length,
            )
          : 0,
      teamwork:
        evaluations.length > 0
          ? Math.round(
              evaluations.reduce((sum, e) => sum + e.scores.teamwork, 0) /
                evaluations.length,
            )
          : 0,
      initiative:
        evaluations.length > 0
          ? Math.round(
              evaluations.reduce((sum, e) => sum + e.scores.initiative, 0) /
                evaluations.length,
            )
          : 0,
    };

    // Performance distribution
    const performanceDistribution = {
      excellent: evaluations.filter((e) => e.performanceStatus === "Excellent")
        .length,
      good: evaluations.filter((e) => e.performanceStatus === "Good").length,
      needsImprovement: evaluations.filter(
        (e) => e.performanceStatus === "Needs Improvement",
      ).length,
    };

    // Top performers
    const employeeScores = employees.map((emp) => {
      const empEvals = evaluations.filter(
        (e) => e.employeeId.toString() === emp._id.toString(),
      );
      const avgScore =
        empEvals.length > 0
          ? empEvals.reduce((sum, e) => sum + e.overallScore, 0) /
            empEvals.length
          : 0;
      return {
        employee: emp,
        averageScore: Math.round(avgScore),
        evaluationCount: empEvals.length,
      };
    });

    const topPerformers = employeeScores
      .filter((e) => e.evaluationCount > 0)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);

    res.json({
      teamId,
      year: parseInt(year),
      totalEvaluations: evaluations.length,
      employeeCount: employees.length,
      overallAverage:
        evaluations.length > 0
          ? Math.round(
              evaluations.reduce((sum, e) => sum + e.overallScore, 0) /
                evaluations.length,
            )
          : 0,
      monthlyData,
      categoryAverages,
      performanceDistribution,
      topPerformers,
    });
  } catch (error) {
    console.error("Get team analytics error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get company analytics (Admin only)
exports.getCompanyAnalytics = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    // Get all evaluations for the year
    const evaluations = await Evaluation.find({
      evaluationYear: parseInt(year),
    });

    // Get all teams
    const teams = await Team.find();

    // Team performance comparison
    const teamPerformance = await Promise.all(
      teams.map(async (team) => {
        const employees = await Employee.find({
          teamId: team._id,
          isActive: true,
        });
        const employeeIds = employees.map((e) => e._id.toString());
        const teamEvals = evaluations.filter((e) =>
          employeeIds.includes(e.employeeId.toString()),
        );

        return {
          team: {
            id: team._id,
            name: team.name,
          },
          employeeCount: employees.length,
          evaluationCount: teamEvals.length,
          averageScore:
            teamEvals.length > 0
              ? Math.round(
                  teamEvals.reduce((sum, e) => sum + e.overallScore, 0) /
                    teamEvals.length,
                )
              : 0,
        };
      }),
    );

    // Overall company stats
    const allEmployees = await Employee.find({ isActive: true });
    const overallAverage =
      evaluations.length > 0
        ? Math.round(
            evaluations.reduce((sum, e) => sum + e.overallScore, 0) /
              evaluations.length,
          )
        : 0;

    // Performance trend by month
    const monthlyTrend = [];
    for (let month = 1; month <= 12; month++) {
      const monthEvals = evaluations.filter((e) => e.evaluationMonth === month);
      if (monthEvals.length > 0) {
        monthlyTrend.push({
          month,
          averageScore: Math.round(
            monthEvals.reduce((sum, e) => sum + e.overallScore, 0) /
              monthEvals.length,
          ),
        });
      }
    }

    res.json({
      year: parseInt(year),
      totalEmployees: allEmployees.length,
      totalEvaluations: evaluations.length,
      overallAverage,
      teamPerformance: teamPerformance.sort(
        (a, b) => b.averageScore - a.averageScore,
      ),
      monthlyTrend,
    });
  } catch (error) {
    console.error("Get company analytics error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

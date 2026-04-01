const { Employee, Evaluation, Team, User } = require('../models');

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    let query = { isActive: true };
    
    // If team leader, filter by their team
    if (req.userRole === 'team_leader') {
      const team = await Team.findOne({ teamLeaderId: req.userId });
      if (team) {
        query.teamId = team._id;
      }
    }
    
    // Apply additional filters
    if (req.query.teamId) {
      query.teamId = req.query.teamId;
    }
    if (req.query.level) {
      query.level = req.query.level;
    }
    if (req.query.department) {
      query.department = req.query.department;
    }
    
    const employees = await Employee.find(query)
      .populate('teamId', 'name')
      .sort({ createdAt: -1 });
    
    res.json(employees);
  } catch (error) {
    console.error('Get all employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('teamId', 'name teamLeaderId');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Check permission for team leader
    if (req.userRole === 'team_leader') {
      const team = await Team.findById(employee.teamId);
      if (!team || team.teamLeaderId.toString() !== req.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    res.json(employee);
  } catch (error) {
    console.error('Get employee by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create employee
exports.createEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, employeeId, teamId, level, department, jobTitle, salary } = req.body;
    
    // Check permission for team leader
    if (req.userRole === 'team_leader') {
      const team = await Team.findById(teamId);
      if (!team || team.teamLeaderId.toString() !== req.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    const employee = new Employee({
      firstName,
      lastName,
      email,
      employeeId,
      teamId,
      level,
      department,
      jobTitle,
      salary
    });
    
    await employee.save();
    
    const populatedEmployee = await Employee.findById(employee._id)
      .populate('teamId', 'name');
    
    res.status(201).json(populatedEmployee);
  } catch (error) {
    console.error('Create employee error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Check permission for team leader
    if (req.userRole === 'team_leader') {
      const team = await Team.findById(employee.teamId);
      if (!team || team.teamLeaderId.toString() !== req.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        employee[key] = updates[key];
      }
    });
    
    await employee.save();
    
    const populatedEmployee = await Employee.findById(employee._id)
      .populate('teamId', 'name');
    
    res.json(populatedEmployee);
  } catch (error) {
    console.error('Update employee error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete employee (soft delete)
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Check permission for team leader
    if (req.userRole === 'team_leader') {
      const team = await Team.findById(employee.teamId);
      if (!team || team.teamLeaderId.toString() !== req.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    employee.isActive = false;
    await employee.save();
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get employee evaluation history
exports.getEmployeeEvaluations = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Check permission for team leader
    if (req.userRole === 'team_leader') {
      const team = await Team.findById(employee.teamId);
      if (!team || team.teamLeaderId.toString() !== req.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    const evaluations = await Evaluation.find({ employeeId: req.params.id })
      .populate('evaluatorId', 'firstName lastName')
      .sort({ evaluationYear: -1, evaluationMonth: -1 });
    
    res.json(evaluations);
  } catch (error) {
    console.error('Get employee evaluations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get employee AI insights
exports.getEmployeeAIInsights = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Check permission for team leader
    if (req.userRole === 'team_leader') {
      const team = await Team.findById(employee.teamId);
      if (!team || team.teamLeaderId.toString() !== req.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    // Get evaluation history
    const evaluations = await Evaluation.find({ employeeId: req.params.id })
      .sort({ evaluationYear: -1, evaluationMonth: -1 })
      .limit(6);
    
    if (evaluations.length === 0) {
      return res.json({
        message: 'No evaluation data available for analysis',
        insights: null
      });
    }
    
    // Calculate trends
    const scores = evaluations.map(e => e.overallScore);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const latestScore = scores[0];
    const previousScore = scores[1] || latestScore;
    const change = ((latestScore - previousScore) / previousScore * 100).toFixed(1);
    const trend = latestScore > previousScore ? 'improving' : latestScore < previousScore ? 'declining' : 'stable';
    
    // Calculate category averages
    const categoryScores = {
      productivity: Math.round(evaluations.reduce((sum, e) => sum + e.scores.productivity, 0) / evaluations.length),
      quality: Math.round(evaluations.reduce((sum, e) => sum + e.scores.quality, 0) / evaluations.length),
      communication: Math.round(evaluations.reduce((sum, e) => sum + e.scores.communication, 0) / evaluations.length),
      teamwork: Math.round(evaluations.reduce((sum, e) => sum + e.scores.teamwork, 0) / evaluations.length),
      initiative: Math.round(evaluations.reduce((sum, e) => sum + e.scores.initiative, 0) / evaluations.length)
    };
    
    // Identify strengths and weaknesses
    const strengths = Object.entries(categoryScores)
      .filter(([_, score]) => score >= 80)
      .map(([category, _]) => category);
    
    const weaknesses = Object.entries(categoryScores)
      .filter(([_, score]) => score < 70)
      .map(([category, _]) => category);
    
    // Promotion recommendation
    const monthsAtLevel = Math.ceil(evaluations.length);
    const promotionRecommended = evaluations.length >= 3 && 
      evaluations.every(e => e.overallScore >= 85) && 
      monthsAtLevel >= 3;
    
    const smartInsights = [];
    if (trend === 'improving') {
      smartInsights.push({ type: 'positive', message: 'Performance is improving over recent evaluations.' });
    } else if (trend === 'declining') {
      smartInsights.push({ type: 'warning', message: 'Performance trend is declining and needs attention.' });
    } else {
      smartInsights.push({ type: 'info', message: 'Performance trend is stable.' });
    }

    if (strengths.length > 0) {
      smartInsights.push({ type: 'positive', message: `Strong areas: ${strengths.join(', ')}.` });
    }
    if (weaknesses.length > 0) {
      smartInsights.push({ type: 'recommendation', message: `Focus areas: ${weaknesses.join(', ')}.` });
    }

    // Keep this response shape compatible with the built frontend page expectations.
    const insights = {
      summary: {
        averageScore,
        latestScore,
        trend,
        evaluationCount: evaluations.length,
        change: parseFloat(change)
      },
      categoryScores,
      smartInsights,
      nextLevelRecommendation: {
        canPromote: promotionRecommended,
        recommendedLevel: promotionRecommended ? getNextLevel(employee.level) : null,
        message: promotionRecommended
          ? `${employee.fullName} is ready for promotion based on recent performance.`
          : `${employee.fullName} should continue development before promotion.`
      },
      textSummary: generateInsightSummary(employee, trend, change, strengths, weaknesses, promotionRecommended)
    };
    
    res.json({ insights });
  } catch (error) {
    console.error('Get employee AI insights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get team overview for a team leader employee (read-only)
exports.getTeamLeaderOverview = async (req, res) => {
  try {
    const leaderEmployee = await Employee.findById(req.params.id).populate('teamId', 'name');
    if (!leaderEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const leaderUser = await User.findOne({
      email: leaderEmployee.email?.toLowerCase(),
      role: 'team_leader',
      isActive: true
    }).select('_id firstName lastName email');

    if (!leaderUser) {
      return res.status(400).json({ message: 'Selected employee is not a team leader.' });
    }

    // Team leader can only view their own team overview
    if (req.userRole === 'team_leader' && leaderUser._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const team = await Team.findOne({ teamLeaderId: leaderUser._id }).select('_id name');
    if (!team) {
      return res.status(404).json({ message: 'Team not found for this team leader.' });
    }

    const members = await Employee.find({
      teamId: team._id,
      isActive: true,
      _id: { $ne: leaderEmployee._id }
    })
      .select('_id firstName lastName email level jobTitle')
      .sort({ firstName: 1, lastName: 1 });

    const memberIds = members.map((m) => m._id);
    const allEvaluations = await Evaluation.find({ employeeId: { $in: memberIds } })
      .select('employeeId overallScore performanceStatus evaluationMonth evaluationYear')
      .sort({ evaluationYear: -1, evaluationMonth: -1, createdAt: -1 });

    const evalStats = new Map();
    for (const ev of allEvaluations) {
      const key = ev.employeeId.toString();
      if (!evalStats.has(key)) {
        evalStats.set(key, {
          latest: {
            overallScore: ev.overallScore,
            performanceStatus: ev.performanceStatus,
            evaluationMonth: ev.evaluationMonth,
            evaluationYear: ev.evaluationYear
          },
          totalScore: ev.overallScore,
          count: 1
        });
      } else {
        const current = evalStats.get(key);
        current.totalScore += ev.overallScore;
        current.count += 1;
        evalStats.set(key, current);
      }
    }

    const membersWithScores = members.map((member) => {
      const stats = evalStats.get(member._id.toString());
      return {
        ...member.toObject(),
        averageScore: stats ? Math.round(stats.totalScore / stats.count) : null,
        evaluationCount: stats ? stats.count : 0,
        latestEvaluation: stats ? stats.latest : null
      };
    });

    res.json({
      teamLeader: {
        id: leaderEmployee._id,
        firstName: leaderEmployee.firstName,
        lastName: leaderEmployee.lastName,
        fullName: `${leaderEmployee.firstName} ${leaderEmployee.lastName}`,
        email: leaderEmployee.email
      },
      team: {
        id: team._id,
        name: team.name
      },
      members: membersWithScores
    });
  } catch (error) {
    console.error('Get team leader overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

function generateInsightSummary(employee, trend, change, strengths, weaknesses, promotionRecommended) {
  let summary = `${employee.fullName} is showing ${trend} performance`;
  
  if (Math.abs(change) > 5) {
    summary += ` with a ${Math.abs(change)}% ${change > 0 ? 'improvement' : 'decline'} compared to last month`;
  }
  
  summary += '. ';
  
  if (strengths.length > 0) {
    summary += `Key strengths include ${strengths.join(', ')}. `;
  }
  
  if (weaknesses.length > 0) {
    summary += `Areas for improvement: ${weaknesses.join(', ')}. `;
  }
  
  if (promotionRecommended) {
    summary += 'Based on consistent high performance, promotion is recommended.';
  }
  
  return summary;
}

function getNextLevel(currentLevel) {
  const levels = ['Fresh', 'Implementor', 'Maker', 'Pro', 'Mentor'];
  const currentIndex = levels.indexOf(currentLevel);
  if (currentIndex === -1 || currentIndex >= levels.length - 1) {
    return null;
  }
  return levels[currentIndex + 1];
}

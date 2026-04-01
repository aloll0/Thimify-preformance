const { Team, Employee } = require('../models');

// Get all teams
exports.getAllTeams = async (req, res) => {
  try {
    let teams;
    
    if (req.userRole === 'admin') {
      // Admin sees all teams
      teams = await Team.find()
        .populate('teamLeaderId', 'firstName lastName email')
        .sort({ createdAt: -1 });
    } else {
      // Team leader sees only their team
      teams = await Team.find({ teamLeaderId: req.userId })
        .populate('teamLeaderId', 'firstName lastName email')
        .sort({ createdAt: -1 });
    }
    
    // Add employee count for each team
    const teamsWithCount = await Promise.all(
      teams.map(async (team) => {
        const count = await Employee.countDocuments({ teamId: team._id, isActive: true });
        return {
          ...team.toObject(),
          employeeCount: count
        };
      })
    );
    
    res.json(teamsWithCount);
  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get team by ID
exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('teamLeaderId', 'firstName lastName email');
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check permission
    if (req.userRole === 'team_leader' && team.teamLeaderId._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get employee count
    const employeeCount = await Employee.countDocuments({ teamId: team._id, isActive: true });
    
    res.json({
      ...team.toObject(),
      employeeCount
    });
  } catch (error) {
    console.error('Get team by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create team (Admin only)
exports.createTeam = async (req, res) => {
  try {
    const { name, description, teamLeaderId } = req.body;
    
    const team = new Team({
      name,
      description,
      teamLeaderId
    });
    
    await team.save();
    
    const populatedTeam = await Team.findById(team._id)
      .populate('teamLeaderId', 'firstName lastName email');
    
    res.status(201).json(populatedTeam);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update team
exports.updateTeam = async (req, res) => {
  try {
    const { name, description, teamLeaderId } = req.body;
    
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Update fields
    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    if (teamLeaderId) team.teamLeaderId = teamLeaderId;
    
    await team.save();
    
    const populatedTeam = await Team.findById(team._id)
      .populate('teamLeaderId', 'firstName lastName email');
    
    res.json(populatedTeam);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete team (Admin only)
exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if team has employees
    const employeeCount = await Employee.countDocuments({ teamId: team._id, isActive: true });
    if (employeeCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete team with active employees. Please reassign or remove employees first.' 
      });
    }
    
    await Team.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get team employees
exports.getTeamEmployees = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check permission
    if (req.userRole === 'team_leader' && team.teamLeaderId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const employees = await Employee.find({ teamId: req.params.id, isActive: true })
      .sort({ createdAt: -1 });
    
    res.json(employees);
  } catch (error) {
    console.error('Get team employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

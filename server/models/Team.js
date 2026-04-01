const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  teamLeaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Virtual for employee count
teamSchema.virtual('employeeCount', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'teamId',
  count: true
});

module.exports = mongoose.model('Team', teamSchema);

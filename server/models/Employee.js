const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  level: {
    type: String,
    enum: ['Fresh', 'Implementor', 'Maker', 'Pro', 'Mentor'],
    required: true
  },
  department: {
    type: String,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  salary: {
    type: Number,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for evaluations
employeeSchema.virtual('evaluations', {
  ref: 'Evaluation',
  localField: '_id',
  foreignField: 'employeeId'
});

// Index for faster queries
employeeSchema.index({ teamId: 1, isActive: 1 });
employeeSchema.index({ level: 1 });

module.exports = mongoose.model('Employee', employeeSchema);

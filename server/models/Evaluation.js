const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    evaluatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    evaluationMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    evaluationYear: {
      type: Number,
      required: true,
    },
    scores: {
      productivity: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      quality: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      communication: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      teamwork: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      initiative: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    performanceStatus: {
      type: String,
      enum: ["Needs Improvement", "Good", "Excellent"],
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    feedback: {
      type: String,
      trim: true,
    },
    aiGeneratedFeedback: {
      type: String,
      trim: true,
    },
    aiSuggestions: [
      {
        type: String,
      },
    ],
    promotionRecommended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

function applyComputedPerformance(doc) {
  if (!doc?.scores) return;

  const scores = doc.scores;
  doc.overallScore = Math.round(
    (scores.productivity +
      scores.quality +
      scores.communication +
      scores.teamwork +
      scores.initiative) /
      5,
  );

  if (doc.overallScore >= 85) {
    doc.performanceStatus = "Excellent";
  } else if (doc.overallScore >= 70) {
    doc.performanceStatus = "Good";
  } else {
    doc.performanceStatus = "Needs Improvement";
  }
}

// Compute derived fields before validation to satisfy required constraints.
evaluationSchema.pre("validate", function () {
  applyComputedPerformance(this);
});

// Compound index to prevent duplicate evaluations for same employee in same month
evaluationSchema.index(
  { employeeId: 1, evaluationYear: 1, evaluationMonth: 1 },
  { unique: true },
);
evaluationSchema.index({ evaluatorId: 1 });
evaluationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Evaluation", evaluationSchema);

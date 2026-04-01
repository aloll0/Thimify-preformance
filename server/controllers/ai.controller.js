const { Employee, Evaluation } = require('../models');

// Generate AI feedback for evaluation
exports.generateFeedback = async (req, res) => {
  try {
    const { employeeId, scores } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Get previous evaluations for comparison
    const previousEvaluations = await Evaluation.find({ employeeId })
      .sort({ evaluationYear: -1, evaluationMonth: -1 })
      .limit(3);
    
    const overallScore = Math.round(
      (scores.productivity + scores.quality + scores.communication + scores.teamwork + scores.initiative) / 5
    );
    
    // Generate feedback
    let feedback = '';
    
    // Opening based on overall score
    if (overallScore >= 90) {
      feedback = `Exceptional performance this period! ${employee.firstName} has demonstrated outstanding results across all evaluation criteria. `;
    } else if (overallScore >= 80) {
      feedback = `Excellent work by ${employee.firstName} this period. The performance has been consistently strong with notable achievements. `;
    } else if (overallScore >= 70) {
      feedback = `Good performance overall from ${employee.firstName}. There are areas of strength as well as opportunities for growth. `;
    } else if (overallScore >= 60) {
      feedback = `${employee.firstName} is meeting basic expectations but there are several areas that need attention and improvement. `;
    } else {
      feedback = `Performance requires significant improvement. ${employee.firstName} needs immediate support and a clear development plan. `;
    }
    
    // Identify strengths
    const strengths = [];
    if (scores.productivity >= 80) strengths.push('productivity');
    if (scores.quality >= 80) strengths.push('quality of work');
    if (scores.communication >= 80) strengths.push('communication skills');
    if (scores.teamwork >= 80) strengths.push('teamwork and collaboration');
    if (scores.initiative >= 80) strengths.push('initiative and proactivity');
    
    if (strengths.length > 0) {
      feedback += `Key strengths include ${strengths.join(', ')}. `;
    }
    
    // Identify areas for improvement
    const improvements = [];
    if (scores.productivity < 70) improvements.push('productivity');
    if (scores.quality < 70) improvements.push('quality of work');
    if (scores.communication < 70) improvements.push('communication skills');
    if (scores.teamwork < 70) improvements.push('teamwork and collaboration');
    if (scores.initiative < 70) improvements.push('initiative and proactivity');
    
    if (improvements.length > 0) {
      feedback += `Areas requiring improvement: ${improvements.join(', ')}. `;
    }
    
    // Compare with previous evaluation
    if (previousEvaluations.length > 0) {
      const prevScore = previousEvaluations[0].overallScore;
      const change = overallScore - prevScore;
      
      if (change > 10) {
        feedback += `Notable improvement of ${change} points compared to the previous evaluation. Keep up the excellent progress! `;
      } else if (change > 0) {
        feedback += `Showing positive progress with a ${change} point improvement from last period. `;
      } else if (change < -10) {
        feedback += `There has been a significant decline of ${Math.abs(change)} points. Immediate attention and support are recommended. `;
      } else if (change < 0) {
        feedback += `Slight decline of ${Math.abs(change)} points noted. Let's work on getting back on track. `;
      } else {
        feedback += `Performance remains consistent with the previous period. `;
      }
    }
    
    // Level-specific feedback
    const levelFeedback = {
      'Fresh': 'As a new team member, focus on learning and adapting to team processes.',
      'Implementor': 'Continue building technical skills and taking on more complex tasks.',
      'Maker': 'Demonstrate leadership in project execution and mentor junior team members.',
      'Pro': 'Showcase expertise and drive innovation within the team.',
      'Mentor': 'Continue guiding the team and sharing knowledge to elevate overall performance.'
    };
    
    feedback += levelFeedback[employee.level] || '';
    
    // Generate suggestions
    const suggestions = [];
    
    if (scores.productivity < 75) {
      suggestions.push('Consider time management training to improve productivity');
      suggestions.push('Break down large tasks into smaller, manageable chunks');
    }
    if (scores.quality < 75) {
      suggestions.push('Implement a personal code review checklist');
      suggestions.push('Pair program with senior team members to learn best practices');
    }
    if (scores.communication < 75) {
      suggestions.push('Practice active listening in team meetings');
      suggestions.push('Provide more frequent updates on task progress');
    }
    if (scores.teamwork < 75) {
      suggestions.push('Volunteer to help teammates with their tasks');
      suggestions.push('Participate more actively in team discussions');
    }
    if (scores.initiative < 75) {
      suggestions.push('Propose new ideas or improvements during team meetings');
      suggestions.push('Take ownership of tasks without waiting for assignment');
    }
    
    if (suggestions.length === 0 && overallScore >= 80) {
      suggestions.push('Continue the excellent work and consider mentoring others');
      suggestions.push('Take on more challenging projects to further grow');
      suggestions.push('Share your success strategies with the team');
    }
    
    // Determine promotion recommendation
    let promotionRecommended = false;
    if (previousEvaluations.length >= 2) {
      const recentScores = [overallScore, ...previousEvaluations.slice(0, 2).map(e => e.overallScore)];
      promotionRecommended = recentScores.every(s => s >= 85) && employee.level !== 'Mentor';
    }
    
    res.json({
      feedback: feedback.trim(),
      suggestions: suggestions.slice(0, 3),
      promotionRecommended,
      performanceStatus: overallScore >= 85 ? 'Excellent' : overallScore >= 70 ? 'Good' : 'Needs Improvement'
    });
  } catch (error) {
    console.error('Generate AI feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Analyze performance trends
exports.analyzePerformance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    const evaluations = await Evaluation.find({ employeeId })
      .sort({ evaluationYear: -1, evaluationMonth: -1 })
      .limit(6);
    
    if (evaluations.length === 0) {
      return res.json({
        message: 'No evaluation data available',
        analysis: null
      });
    }
    
    // Calculate trends for each category
    const categories = ['productivity', 'quality', 'communication', 'teamwork', 'initiative'];
    const trends = {};
    
    categories.forEach(category => {
      const scores = evaluations.map(e => e.scores[category]);
      const trend = scores[0] > scores[scores.length - 1] ? 'improving' : 
                    scores[0] < scores[scores.length - 1] ? 'declining' : 'stable';
      
      trends[category] = {
        current: scores[0],
        previous: scores[scores.length - 1],
        change: scores[0] - scores[scores.length - 1],
        trend,
        average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      };
    });
    
    // Overall trend
    const overallScores = evaluations.map(e => e.overallScore);
    const overallTrend = overallScores[0] > overallScores[overallScores.length - 1] ? 'improving' :
                         overallScores[0] < overallScores[overallScores.length - 1] ? 'declining' : 'stable';
    
    // Consistency analysis
    const consistency = calculateConsistency(overallScores);
    
    // Generate insights
    const insights = [];
    
    if (overallTrend === 'improving') {
      const improvement = ((overallScores[0] - overallScores[overallScores.length - 1]) / overallScores[overallScores.length - 1] * 100).toFixed(1);
      insights.push(`Performance has improved by ${improvement}% over the evaluated period.`);
    } else if (overallTrend === 'declining') {
      insights.push('Performance shows a declining trend. Intervention recommended.');
    } else {
      insights.push('Performance has remained consistent.');
    }
    
    if (consistency < 10) {
      insights.push('Very consistent performance across evaluations.');
    } else if (consistency > 20) {
      insights.push('Performance varies significantly. Focus on consistency.');
    }
    
    // Best and worst categories
    const categoryAverages = categories.map(cat => ({
      category: cat,
      average: trends[cat].average
    }));
    
    const bestCategory = categoryAverages.sort((a, b) => b.average - a.average)[0];
    const worstCategory = categoryAverages.sort((a, b) => a.average - b.average)[0];
    
    insights.push(`Strongest area: ${bestCategory.category} (avg: ${bestCategory.average})`);
    insights.push(`Area for focus: ${worstCategory.category} (avg: ${worstCategory.average})`);
    
    res.json({
      employee: {
        id: employee._id,
        name: employee.fullName,
        level: employee.level
      },
      evaluationCount: evaluations.length,
      overallTrend,
      consistency: Math.round(consistency),
      trends,
      insights,
      bestCategory: bestCategory.category,
      focusCategory: worstCategory.category
    });
  } catch (error) {
    console.error('Analyze performance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get comprehensive AI insights
exports.getInsights = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    const evaluations = await Evaluation.find({ employeeId })
      .sort({ evaluationYear: -1, evaluationMonth: -1 })
      .limit(6);
    
    if (evaluations.length === 0) {
      return res.json({
        message: 'No evaluation data available for AI analysis',
        insights: null
      });
    }
    
    // Calculate all metrics
    const scores = evaluations.map(e => e.overallScore);
    const latestScore = scores[0];
    const previousScore = scores[1] || latestScore;
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const change = ((latestScore - previousScore) / previousScore * 100).toFixed(1);
    
    // Category analysis
    const categories = ['productivity', 'quality', 'communication', 'teamwork', 'initiative'];
    const categoryScores = {};
    categories.forEach(cat => {
      categoryScores[cat] = Math.round(
        evaluations.reduce((sum, e) => sum + e.scores[cat], 0) / evaluations.length
      );
    });
    
    // Identify patterns
    const strengths = categories.filter(cat => categoryScores[cat] >= 80);
    const weaknesses = categories.filter(cat => categoryScores[cat] < 70);
    
    // Trend analysis
    const trend = latestScore > previousScore ? 'improving' : 
                  latestScore < previousScore ? 'declining' : 'stable';
    
    // Promotion readiness
    const promotionReady = evaluations.length >= 3 && 
      evaluations.every(e => e.overallScore >= 85) && 
      employee.level !== 'Mentor';
    
    // Generate smart insights
    const smartInsights = [];
    
    if (trend === 'improving') {
      smartInsights.push({
        type: 'positive',
        message: `Performance improved by ${change}% compared to previous evaluation`,
        icon: 'trending-up'
      });
    }
    
    if (scores.every(s => s >= 85)) {
      smartInsights.push({
        type: 'positive',
        message: 'Consistently high-performing employee',
        icon: 'star'
      });
    }
    
    if (promotionReady) {
      smartInsights.push({
        type: 'recommendation',
        message: `Recommendation: Consider promotion from ${employee.level} to next level`,
        icon: 'arrow-up-circle'
      });
    }
    
    if (strengths.length > 0) {
      smartInsights.push({
        type: 'info',
        message: `Key strengths: ${strengths.join(', ')}`,
        icon: 'check-circle'
      });
    }
    
    if (weaknesses.length > 0) {
      smartInsights.push({
        type: 'warning',
        message: `Areas needing attention: ${weaknesses.join(', ')}`,
        icon: 'alert-circle'
      });
    }
    
    // Calculate time to next level recommendation
    const nextLevelRecommendation = getNextLevelRecommendation(employee, evaluations);
    
    res.json({
      employee: {
        id: employee._id,
        name: employee.fullName,
        level: employee.level,
        department: employee.department
      },
      summary: {
        averageScore,
        latestScore,
        change: parseFloat(change),
        trend,
        evaluationCount: evaluations.length
      },
      categoryScores,
      strengths,
      weaknesses,
      promotionReady,
      smartInsights,
      nextLevelRecommendation
    });
  } catch (error) {
    console.error('Get AI insights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to calculate consistency
function calculateConsistency(scores) {
  if (scores.length < 2) return 0;
  
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);
  
  return (standardDeviation / mean) * 100;
}

// Helper function to get next level recommendation
function getNextLevelRecommendation(employee, evaluations) {
  const levels = ['Fresh', 'Implementor', 'Maker', 'Pro', 'Mentor'];
  const currentIndex = levels.indexOf(employee.level);
  
  if (currentIndex === levels.length - 1) {
    return {
      canPromote: false,
      message: 'Already at highest level'
    };
  }
  
  const recentEvals = evaluations.slice(0, 3);
  const avgRecentScore = recentEvals.reduce((sum, e) => sum + e.overallScore, 0) / recentEvals.length;
  
  if (recentEvals.length < 3) {
    return {
      canPromote: false,
      message: 'Need at least 3 evaluations for promotion consideration',
      evaluationsNeeded: 3 - recentEvals.length
    };
  }
  
  if (avgRecentScore >= 90) {
    return {
      canPromote: true,
      message: `Ready for promotion to ${levels[currentIndex + 1]}`,
      recommendedLevel: levels[currentIndex + 1],
      confidence: 'high'
    };
  } else if (avgRecentScore >= 85) {
    return {
      canPromote: true,
      message: `Consider promotion to ${levels[currentIndex + 1]}`,
      recommendedLevel: levels[currentIndex + 1],
      confidence: 'medium'
    };
  } else {
    return {
      canPromote: false,
      message: `Continue development before promotion to ${levels[currentIndex + 1]}`,
      targetScore: 85,
      currentAverage: Math.round(avgRecentScore)
    };
  }
}

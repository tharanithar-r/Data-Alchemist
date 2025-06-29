import { BusinessRule } from '@/lib/stores/rules-store';
import { Client, Worker, Task } from '@/lib/types/entities';

// Confidence scoring factors
export interface ConfidenceFactors {
  dataQuality: number;        // 0-100: Quality of input data
  patternMatch: number;       // 0-100: How well the input matches known patterns
  ruleComplexity: number;     // 0-100: Complexity of the generated rule
  contextClarity: number;     // 0-100: Clarity of user input/context
  validationPass: number;     // 0-100: Rule passes validation checks
  historicalSuccess: number;  // 0-100: Historical success of similar rules
}

export interface ConfidenceResult {
  overall: number;
  factors: ConfidenceFactors;
  explanation: string;
  recommendations: string[];
  threshold: 'auto-apply' | 'review-recommended' | 'manual-review';
}

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  AUTO_APPLY: 85,     // Auto-apply rules with 85%+ confidence
  REVIEW_RECOMMENDED: 65, // Recommend review for 65-84% confidence
  MANUAL_REVIEW: 0    // Manual review required for <65% confidence
} as const;

/**
 * Analyze data quality for confidence scoring
 */
function analyzeDataQuality(
  clients: Client[], 
  workers: Worker[], 
  tasks: Task[]
): number {
  let score = 0;
  let checks = 0;

  // Check data completeness
  const clientCompleteness = clients.length > 0 ? 
    clients.reduce((sum, c) => sum + (c.ClientName ? 1 : 0) + (c.PriorityLevel ? 1 : 0), 0) / (clients.length * 2) : 0;
  const workerCompleteness = workers.length > 0 ?
    workers.reduce((sum, w) => sum + (w.WorkerName ? 1 : 0) + (w.Skills ? 1 : 0), 0) / (workers.length * 2) : 0;
  const taskCompleteness = tasks.length > 0 ?
    tasks.reduce((sum, t) => sum + (t.TaskName ? 1 : 0) + (t.RequiredSkills ? 1 : 0), 0) / (tasks.length * 2) : 0;

  score += (clientCompleteness + workerCompleteness + taskCompleteness) / 3 * 100;
  checks++;

  // Check data volume sufficiency
  const minDataThreshold = { clients: 5, workers: 3, tasks: 5 };
  const volumeScore = Math.min(
    clients.length / minDataThreshold.clients,
    workers.length / minDataThreshold.workers,
    tasks.length / minDataThreshold.tasks
  ) * 100;
  
  score += Math.min(volumeScore, 100);
  checks++;

  // Check for data relationships
  const hasClientTasks = clients.some(c => c.RequestedTaskIDs && c.RequestedTaskIDs.length > 0);
  const hasWorkerSkills = workers.some(w => w.Skills && w.Skills.length > 0);
  const hasTaskRequirements = tasks.some(t => t.RequiredSkills && t.RequiredSkills.length > 0);
  
  const relationshipScore = ((hasClientTasks ? 1 : 0) + (hasWorkerSkills ? 1 : 0) + (hasTaskRequirements ? 1 : 0)) / 3 * 100;
  score += relationshipScore;
  checks++;

  return checks > 0 ? score / checks : 0;
}

/**
 * Calculate pattern matching confidence
 */
function calculatePatternMatchConfidence(
  input: string,
  ruleType: BusinessRule['type']
): number {
  const patterns = {
    loadLimit: [
      /\b(limit|max|maximum|at most|no more than)\b.*\b(tasks?|slots?|load|capacity)\b/i,
      /\b(team|group|workers?)\b.*\b(\d+)\b.*\b(tasks?|slots?)\b/i,
      /\b(prevent|avoid)\b.*\b(overload|burnout)\b/i
    ],
    coRun: [
      /\b(together|simultaneous|same time|co-?run)\b/i,
      /\b(run|execute|process)\b.*\b(together|simultaneous)\b/i,
      /\bT\d+\b.*\band\b.*\bT\d+\b/i // Task ID patterns
    ],
    slotRestriction: [
      /\b(reserve|dedicated|minimum|at least)\b.*\b(slots?|capacity)\b/i,
      /\b(VIP|premium|priority)\b.*\b(slots?|access)\b/i,
      /\b(common|shared)\b.*\b(slots?|availability)\b/i
    ],
    phaseWindow: [
      /\b(phase|phases?|stage|stages?)\b.*\b(\d+)\b/i,
      /\b(during|in|only)\b.*\b(phase|stage)\b/i,
      /\b(restrict|limit)\b.*\b(phase|timing)\b/i
    ],
    patternMatch: [
      /\b(contains?|matches?|pattern|regex|like)\b/i,
      /\b(tasks?|names?)\b.*\b(containing|matching|with)\b/i,
      /["'].*["']/i // Quoted patterns
    ],
    precedenceOverride: [
      /\b(override|priority|precedence|emergency|urgent)\b/i,
      /\b(takes? precedence|more important|higher priority)\b/i,
      /\b(emergency|critical|urgent)\b.*\b(rules?|limits?)\b/i
    ]
  };

  const rulePatterns = patterns[ruleType] || [];
  let matchScore = 0;
  
  for (const pattern of rulePatterns) {
    if (pattern.test(input)) {
      matchScore += 100 / rulePatterns.length;
    }
  }

  // Bonus for specific keywords and structure
  const hasNumbers = /\b\d+\b/.test(input);
  const hasSpecificEntities = /\b(T\d+|team|group|client|worker|task)\b/i.test(input);
  const hasActionWords = /\b(should|must|need|require|limit|restrict|allow)\b/i.test(input);
  
  const bonusScore = ((hasNumbers ? 1 : 0) + (hasSpecificEntities ? 1 : 0) + (hasActionWords ? 1 : 0)) / 3 * 20;
  
  return Math.min(matchScore + bonusScore, 100);
}

/**
 * Calculate rule complexity score
 */
function calculateRuleComplexity(ruleConfig: any, ruleType: BusinessRule['type']): number {
  let complexityScore = 80; // Start with base score

  switch (ruleType) {
    case 'coRun':
      // More tasks = higher complexity
      const taskCount = ruleConfig.taskIds?.length || 0;
      if (taskCount > 5) complexityScore -= 20;
      else if (taskCount > 3) complexityScore -= 10;
      break;

    case 'loadLimit':
      // Extreme limits are more complex/risky
      const maxSlots = ruleConfig.maxSlotsPerPhase || 0;
      if (maxSlots > 10) complexityScore -= 15;
      else if (maxSlots < 2) complexityScore -= 10;
      break;

    case 'slotRestriction':
      // High slot requirements are more complex
      const minSlots = ruleConfig.minCommonSlots || 0;
      if (minSlots > 5) complexityScore -= 15;
      break;

    case 'phaseWindow':
      // Restrictive phase windows are more complex
      const phases = ruleConfig.allowedPhases?.length || 0;
      if (phases === 1) complexityScore -= 15;
      else if (phases === 2) complexityScore -= 10;
      break;

    case 'patternMatch':
      // Complex regex patterns are harder to validate
      const regex = ruleConfig.regex || '';
      if (regex.length > 20) complexityScore -= 20;
      if (/[+*?{}\[\]()^$]/.test(regex)) complexityScore -= 10; // Has regex special chars
      break;

    case 'precedenceOverride':
      // Override rules are inherently complex
      complexityScore -= 10;
      if (ruleConfig.overrideType === 'all') complexityScore -= 15;
      break;
  }

  return Math.max(complexityScore, 30); // Minimum 30% complexity score
}

/**
 * Calculate context clarity score
 */
function calculateContextClarity(input: string, availableData: {
  clientGroups: string[];
  workerGroups: string[];
  taskIds: string[];
  skills: string[];
}): number {
  let score = 50; // Base score

  // Check for specific entity references
  const workerGroupMentioned = availableData.workerGroups.some(group => 
    input.toLowerCase().includes(group.toLowerCase())
  );
  const clientGroupMentioned = availableData.clientGroups.some(group => 
    input.toLowerCase().includes(group.toLowerCase())
  );
  const taskMentioned = availableData.taskIds.some(taskId => 
    input.includes(taskId)
  );
  const skillMentioned = availableData.skills.some(skill => 
    input.toLowerCase().includes(skill.toLowerCase())
  );

  // Bonus for entity mentions
  score += (workerGroupMentioned ? 15 : 0);
  score += (clientGroupMentioned ? 15 : 0);
  score += (taskMentioned ? 15 : 0);
  score += (skillMentioned ? 10 : 0);

  // Check for clear numeric values
  const hasNumbers = /\b\d+\b/.test(input);
  if (hasNumbers) score += 10;

  // Check for clear action words
  const actionWords = ['should', 'must', 'limit', 'restrict', 'allow', 'prevent', 'ensure'];
  const hasActionWords = actionWords.some(word => 
    input.toLowerCase().includes(word)
  );
  if (hasActionWords) score += 10;

  // Check input length (too short or too long reduces clarity)
  const wordCount = input.trim().split(/\s+/).length;
  if (wordCount < 5) score -= 15; // Too brief
  else if (wordCount > 30) score -= 10; // Too verbose
  else if (wordCount >= 8 && wordCount <= 20) score += 10; // Optimal length

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Validate rule configuration
 */
function validateRuleConfiguration(
  ruleConfig: any,
  ruleType: BusinessRule['type'],
  availableData: {
    clientGroups: string[];
    workerGroups: string[];
    taskIds: string[];
    skills: string[];
  }
): number {
  let score = 100;

  switch (ruleType) {
    case 'loadLimit':
      if (!availableData.workerGroups.includes(ruleConfig.workerGroup)) score -= 30;
      if (!ruleConfig.maxSlotsPerPhase || ruleConfig.maxSlotsPerPhase <= 0) score -= 40;
      break;

    case 'coRun':
      const invalidTasks = ruleConfig.taskIds?.filter((id: string) => 
        !availableData.taskIds.includes(id)
      ) || [];
      score -= invalidTasks.length * 20;
      if (!ruleConfig.taskIds || ruleConfig.taskIds.length < 2) score -= 40;
      break;

    case 'slotRestriction':
      if (!availableData.clientGroups.includes(ruleConfig.groupTag) && 
          !availableData.workerGroups.includes(ruleConfig.groupTag)) {
        score -= 30;
      }
      if (!ruleConfig.minCommonSlots || ruleConfig.minCommonSlots <= 0) score -= 30;
      break;

    case 'phaseWindow':
      if (!availableData.taskIds.includes(ruleConfig.taskId)) score -= 40;
      if (!ruleConfig.allowedPhases || ruleConfig.allowedPhases.length === 0) score -= 30;
      const invalidPhases = ruleConfig.allowedPhases?.filter((p: number) => p < 1 || p > 5) || [];
      score -= invalidPhases.length * 15;
      break;

    case 'patternMatch':
      if (!ruleConfig.regex) score -= 50;
      try {
        new RegExp(ruleConfig.regex);
      } catch {
        score -= 40; // Invalid regex
      }
      break;

    case 'precedenceOverride':
      if (!ruleConfig.priority || ruleConfig.priority <= 0) score -= 30;
      if (!ruleConfig.overrideType) score -= 20;
      break;
  }

  return Math.max(score, 0);
}

/**
 * Calculate historical success rate (simulated for now)
 */
function calculateHistoricalSuccess(
  ruleType: BusinessRule['type'],
  ruleConfig: any
): number {
  // Simulated historical data - in production, this would come from actual usage analytics
  const baseSuccessRates = {
    loadLimit: 85,
    coRun: 75,
    slotRestriction: 90,
    phaseWindow: 80,
    patternMatch: 70,
    precedenceOverride: 65
  };

  let score = baseSuccessRates[ruleType] || 70;

  // Adjust based on configuration characteristics
  switch (ruleType) {
    case 'loadLimit':
      // Moderate limits tend to be more successful
      const limit = ruleConfig.maxSlotsPerPhase || 0;
      if (limit >= 3 && limit <= 6) score += 10;
      break;

    case 'coRun':
      // 2-3 tasks tend to be most successful
      const taskCount = ruleConfig.taskIds?.length || 0;
      if (taskCount === 2 || taskCount === 3) score += 10;
      else if (taskCount > 4) score -= 15;
      break;

    case 'slotRestriction':
      // Moderate slot requirements are more successful
      const slots = ruleConfig.minCommonSlots || 0;
      if (slots >= 2 && slots <= 4) score += 10;
      break;
  }

  return Math.min(score, 100);
}

/**
 * Generate confidence explanation
 */
function generateConfidenceExplanation(
  factors: ConfidenceFactors,
  overall: number
): string {
  const explanations: string[] = [];

  if (factors.dataQuality < 70) {
    explanations.push("Data quality could be improved with more complete information");
  }
  if (factors.patternMatch > 80) {
    explanations.push("Input matches known patterns very well");
  } else if (factors.patternMatch < 60) {
    explanations.push("Input doesn't clearly match expected patterns");
  }
  if (factors.ruleComplexity < 60) {
    explanations.push("Generated rule is complex and may need careful review");
  }
  if (factors.contextClarity > 80) {
    explanations.push("Input is clear and specific");
  } else if (factors.contextClarity < 60) {
    explanations.push("Input could be more specific for better results");
  }
  if (factors.validationPass < 70) {
    explanations.push("Rule configuration has validation concerns");
  }
  if (factors.historicalSuccess > 80) {
    explanations.push("Similar rules have been successful in the past");
  }

  if (overall >= 85) {
    explanations.unshift("High confidence - rule appears well-formed and safe to apply");
  } else if (overall >= 65) {
    explanations.unshift("Moderate confidence - review recommended before applying");
  } else {
    explanations.unshift("Low confidence - manual review strongly recommended");
  }

  return explanations.join(". ");
}

/**
 * Generate recommendations based on confidence factors
 */
function generateRecommendations(factors: ConfidenceFactors): string[] {
  const recommendations: string[] = [];

  if (factors.dataQuality < 70) {
    recommendations.push("Add more complete client, worker, and task data for better accuracy");
  }
  if (factors.patternMatch < 60) {
    recommendations.push("Try rephrasing your request with more specific terms");
  }
  if (factors.contextClarity < 60) {
    recommendations.push("Include specific entity names (groups, tasks, skills) in your request");
    recommendations.push("Use clear action words like 'limit', 'restrict', or 'ensure'");
  }
  if (factors.ruleComplexity < 60) {
    recommendations.push("Consider simplifying the rule or breaking it into multiple simpler rules");
  }
  if (factors.validationPass < 70) {
    recommendations.push("Check that referenced entities exist in your data");
  }

  if (recommendations.length === 0) {
    recommendations.push("Rule looks good - consider applying it");
  }

  return recommendations;
}

/**
 * Determine confidence threshold category
 */
function determineThreshold(confidence: number): 'auto-apply' | 'review-recommended' | 'manual-review' {
  if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_APPLY) {
    return 'auto-apply';
  } else if (confidence >= CONFIDENCE_THRESHOLDS.REVIEW_RECOMMENDED) {
    return 'review-recommended';
  } else {
    return 'manual-review';
  }
}

/**
 * Calculate comprehensive confidence score for AI-generated rules
 */
export function calculateConfidenceScore(
  input: string,
  ruleType: BusinessRule['type'],
  ruleConfig: any,
  availableData: {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
    clientGroups: string[];
    workerGroups: string[];
    taskIds: string[];
    skills: string[];
  }
): ConfidenceResult {
  // Calculate individual factors
  const factors: ConfidenceFactors = {
    dataQuality: analyzeDataQuality(availableData.clients, availableData.workers, availableData.tasks),
    patternMatch: calculatePatternMatchConfidence(input, ruleType),
    ruleComplexity: calculateRuleComplexity(ruleConfig, ruleType),
    contextClarity: calculateContextClarity(input, {
      clientGroups: availableData.clientGroups,
      workerGroups: availableData.workerGroups,
      taskIds: availableData.taskIds,
      skills: availableData.skills
    }),
    validationPass: validateRuleConfiguration(ruleConfig, ruleType, {
      clientGroups: availableData.clientGroups,
      workerGroups: availableData.workerGroups,
      taskIds: availableData.taskIds,
      skills: availableData.skills
    }),
    historicalSuccess: calculateHistoricalSuccess(ruleType, ruleConfig)
  };

  // Calculate weighted overall score
  const weights = {
    dataQuality: 0.15,      // 15%
    patternMatch: 0.20,     // 20%
    ruleComplexity: 0.15,   // 15%
    contextClarity: 0.20,   // 20%
    validationPass: 0.25,   // 25%
    historicalSuccess: 0.05  // 5%
  };

  const overall = Math.round(
    factors.dataQuality * weights.dataQuality +
    factors.patternMatch * weights.patternMatch +
    factors.ruleComplexity * weights.ruleComplexity +
    factors.contextClarity * weights.contextClarity +
    factors.validationPass * weights.validationPass +
    factors.historicalSuccess * weights.historicalSuccess
  );

  return {
    overall,
    factors,
    explanation: generateConfidenceExplanation(factors, overall),
    recommendations: generateRecommendations(factors),
    threshold: determineThreshold(overall)
  };
}

/**
 * Get confidence color for UI display
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 85) return 'text-green-600 bg-green-50';
  if (confidence >= 65) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}

/**
 * Get confidence label for UI display
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 85) return 'High Confidence';
  if (confidence >= 65) return 'Medium Confidence';
  return 'Low Confidence';
}

/**
 * Get threshold action for UI display
 */
export function getThresholdAction(threshold: string): { label: string; color: string; icon: string } {
  switch (threshold) {
    case 'auto-apply':
      return { label: 'Safe to Apply', color: 'text-green-600', icon: '✓' };
    case 'review-recommended':
      return { label: 'Review Recommended', color: 'text-yellow-600', icon: '⚠' };
    case 'manual-review':
      return { label: 'Manual Review Required', color: 'text-red-600', icon: '⚠' };
    default:
      return { label: 'Unknown', color: 'text-gray-600', icon: '?' };
  }
}
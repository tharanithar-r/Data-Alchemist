import { BusinessRule, CoRunRule, SlotRestrictionRule, LoadLimitRule, PhaseWindowRule, PatternMatchRule, PrecedenceOverrideRule } from '@/lib/stores/rules-store';

import { calculateConfidenceScore, ConfidenceResult } from './confidence-scoring';
import { GeminiClient } from './gemini-client';

interface RuleGenerationResult {
  success: boolean;
  confidence: number;
  confidenceResult?: ConfidenceResult;
  rule?: Partial<BusinessRule>;
  explanation?: string;
  suggestions?: string[];
  error?: string;
}

interface RuleTemplate {
  type: BusinessRule['type'];
  pattern: RegExp;
  example: string;
  description: string;
}

// Rule templates for pattern matching
const RULE_TEMPLATES: RuleTemplate[] = [
  {
    type: 'coRun',
    pattern: /(?:run together|co.?run|simultaneous|same time|together)/i,
    example: "Tasks T1 and T2 should run together",
    description: "Multiple tasks that must be executed simultaneously"
  },
  {
    type: 'loadLimit',
    pattern: /(?:max|limit|maximum|no more than|at most).*(?:tasks?|slots?|load)/i,
    example: "Sales workers should handle at most 3 tasks per phase",
    description: "Limit the maximum workload for worker groups"
  },
  {
    type: 'slotRestriction',
    pattern: /(?:common slots?|shared slots?|same slots?|overlap)/i,
    example: "VIP clients need at least 2 common worker slots",
    description: "Ensure minimum common availability between groups"
  },
  {
    type: 'phaseWindow',
    pattern: /(?:phase|phases?|only in|during phase|phase \d)/i,
    example: "Task T5 can only run during phases 2 and 3",
    description: "Restrict tasks to specific execution phases"
  },
  {
    type: 'patternMatch',
    pattern: /(?:contains?|matches?|pattern|regex|like)/i,
    example: "Tasks containing 'urgent' should get priority treatment",
    description: "Apply rules based on text patterns"
  },
  {
    type: 'precedenceOverride',
    pattern: /(?:override|priority|precedence|more important|takes precedence)/i,
    example: "Emergency tasks take precedence over regular rules",
    description: "Define rule hierarchy and override behavior"
  }
];

// Example prompts for user guidance
export const EXAMPLE_PROMPTS = [
  {
    category: 'Co-run Rules',
    examples: [
      "Tasks T1 and T2 should always run together",
      "Make sure task analysis and task review are executed simultaneously",
      "Project setup and environment config must run at the same time"
    ]
  },
  {
    category: 'Load Limits',
    examples: [
      "Sales workers should handle at most 3 tasks per phase",
      "Senior developers cannot take more than 5 tasks simultaneously",
      "Support team members are limited to 2 concurrent tasks"
    ]
  },
  {
    category: 'Slot Restrictions',
    examples: [
      "VIP clients need at least 2 common worker slots",
      "Critical projects require minimum 3 shared availability slots",
      "Enterprise clients must have at least 4 overlapping worker schedules"
    ]
  },
  {
    category: 'Phase Windows',
    examples: [
      "Task T5 can only run during phases 2 and 3",
      "Testing tasks should only execute in phase 4",
      "Initial setup must happen in phase 1 only"
    ]
  },
  {
    category: 'Pattern Matching',
    examples: [
      "Tasks containing 'urgent' should get high priority",
      "Any task with 'security' in the name needs special handling",
      "Tasks matching pattern 'PROJ-\\d+' follow project workflow"
    ]
  },
  {
    category: 'Precedence Override',
    examples: [
      "Emergency tasks take precedence over all other rules",
      "VIP client requests override load limit restrictions",
      "Critical maintenance has priority over regular scheduling"
    ]
  }
];

/**
 * Generate AI prompt for rule creation
 */
function createRuleGenerationPrompt(userInput: string, availableData: {
  clientGroups: string[];
  workerGroups: string[];
  taskIds: string[];
  skills: string[];
}): string {
  return `You are an expert in business rule generation for resource allocation systems. 

CONTEXT:
- System manages allocation of workers to client tasks
- Available Client Groups: ${availableData.clientGroups.join(', ')}
- Available Worker Groups: ${availableData.workerGroups.join(', ')}
- Available Task IDs: ${availableData.taskIds.slice(0, 10).join(', ')}${availableData.taskIds.length > 10 ? '...' : ''}
- Available Skills: ${availableData.skills.join(', ')}

RULE TYPES SUPPORTED:
1. CoRun: Multiple tasks that must run simultaneously
2. LoadLimit: Maximum workload limits for worker groups  
3. SlotRestriction: Minimum common availability requirements
4. PhaseWindow: Restrict tasks to specific execution phases (1-5)
5. PatternMatch: Rules based on text patterns/regex
6. PrecedenceOverride: Rule hierarchy and override behavior

USER REQUEST: "${userInput}"

TASK: Analyze the user request and generate a business rule configuration.

RESPONSE FORMAT (JSON):
{
  "confidence": <0-100 integer>,
  "ruleType": "<coRun|loadLimit|slotRestriction|phaseWindow|patternMatch|precedenceOverride>",
  "ruleName": "<descriptive rule name>",
  "ruleDescription": "<clear explanation of what this rule does>",
  "ruleConfig": {
    // Rule-specific configuration based on type:
    // CoRun: { "taskIds": ["T1", "T2"] }
    // LoadLimit: { "workerGroup": "sales", "maxSlotsPerPhase": 3 }
    // SlotRestriction: { "targetType": "client", "groupTag": "VIP", "minCommonSlots": 2 }
    // PhaseWindow: { "taskId": "T5", "allowedPhases": [2, 3] }
    // PatternMatch: { "regex": "urgent", "template": "priority", "parameters": {} }
    // PrecedenceOverride: { "overrideType": "priority", "targetRuleIds": ["rule1"], "priority": 1, "conditions": {} }
  },
  "explanation": "<detailed explanation of the interpretation>",
  "suggestions": ["<alternative interpretation 1>", "<alternative interpretation 2>"],
  "warnings": ["<potential issues or ambiguities>"]
}

IMPORTANT:
- Use only the provided client groups, worker groups, task IDs, and skills
- Confidence should reflect how clearly the request maps to a specific rule type
- Include warnings for ambiguous or potentially problematic configurations
- Provide alternative interpretations if the request could map to multiple rule types
- Ensure all referenced entities exist in the provided context`;
}

/**
 * Identify rule type from natural language using pattern matching
 */
// function identifyRuleType(text: string): { type: BusinessRule['type']; confidence: number } | null {
//   const matches = RULE_TEMPLATES.map(template => ({
//     type: template.type,
//     match: template.pattern.test(text),
//     confidence: template.pattern.test(text) ? 0.7 : 0
//   })).filter(match => match.match);

//   if (matches.length === 0) return null;
  
//   // Return the first match (could be enhanced with more sophisticated scoring)
//   return { type: matches[0].type, confidence: matches[0].confidence };
// }

/**
 * Validate generated rule configuration
 */
function validateRuleConfig(ruleType: BusinessRule['type'], config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (ruleType) {
    case 'coRun':
      if (!config.taskIds || !Array.isArray(config.taskIds) || config.taskIds.length < 2) {
        errors.push('Co-run rules require at least 2 task IDs');
      }
      break;
    
    case 'loadLimit':
      if (!config.workerGroup || typeof config.workerGroup !== 'string') {
        errors.push('Load limit rules require a worker group');
      }
      if (!config.maxSlotsPerPhase || typeof config.maxSlotsPerPhase !== 'number' || config.maxSlotsPerPhase <= 0) {
        errors.push('Load limit rules require a positive maximum slots value');
      }
      break;
    
    case 'slotRestriction':
      if (!config.targetType || !['client', 'worker'].includes(config.targetType)) {
        errors.push('Slot restriction rules require targetType of "client" or "worker"');
      }
      if (!config.groupTag || typeof config.groupTag !== 'string') {
        errors.push('Slot restriction rules require a group tag');
      }
      if (!config.minCommonSlots || typeof config.minCommonSlots !== 'number' || config.minCommonSlots <= 0) {
        errors.push('Slot restriction rules require a positive minimum common slots value');
      }
      break;
    
    case 'phaseWindow':
      if (!config.taskId || typeof config.taskId !== 'string') {
        errors.push('Phase window rules require a task ID');
      }
      if (!config.allowedPhases || !Array.isArray(config.allowedPhases) || config.allowedPhases.length === 0) {
        errors.push('Phase window rules require at least one allowed phase');
      }
      const invalidPhases = config.allowedPhases?.filter((p: any) => typeof p !== 'number' || p < 1 || p > 5);
      if (invalidPhases?.length > 0) {
        errors.push('Phase numbers must be between 1 and 5');
      }
      break;
    
    case 'patternMatch':
      if (!config.regex || typeof config.regex !== 'string') {
        errors.push('Pattern match rules require a regex pattern');
      }
      if (!config.template || typeof config.template !== 'string') {
        errors.push('Pattern match rules require a template');
      }
      break;
    
    case 'precedenceOverride':
      if (!config.overrideType || typeof config.overrideType !== 'string') {
        errors.push('Precedence override rules require an override type');
      }
      if (!config.priority || typeof config.priority !== 'number') {
        errors.push('Precedence override rules require a numeric priority');
      }
      if (!config.targetRuleIds || !Array.isArray(config.targetRuleIds)) {
        errors.push('Precedence override rules require target rule IDs array');
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate business rule from natural language description
 */
export async function generateRuleFromNaturalLanguage(
  userInput: string,
  availableData: {
    clientGroups: string[];
    workerGroups: string[];
    taskIds: string[];
    skills: string[];
  }
): Promise<RuleGenerationResult> {
  try {
    const geminiClient = new GeminiClient();
    
    // Quick pattern-based rule type identification (for future use)
    // const patternMatch = identifyRuleType(userInput);
    
    const prompt = createRuleGenerationPrompt(userInput, availableData);
    
    const response = await geminiClient.generateText(prompt);
    
    if (response.error) {
      return {
        success: false,
        confidence: 0,
        error: response.error
      };
    }
    
    const text = response.content;

    // Parse JSON response
    let aiResult;
    try {
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      aiResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      return {
        success: false,
        confidence: 0,
        error: 'Failed to parse AI response. Please try rephrasing your request.'
      };
    }

    // Validate AI response structure
    if (!aiResult.ruleType || !aiResult.ruleName || !aiResult.ruleConfig) {
      return {
        success: false,
        confidence: 0,
        error: 'AI response missing required fields. Please try rephrasing your request.'
      };
    }

    // Validate rule configuration
    const validation = validateRuleConfig(aiResult.ruleType, aiResult.ruleConfig);
    if (!validation.valid) {
      return {
        success: false,
        confidence: aiResult.confidence || 0,
        error: `Invalid rule configuration: ${validation.errors.join(', ')}`,
        suggestions: aiResult.suggestions
      };
    }

    // Create rule object based on type
    let rule: Partial<BusinessRule>;
    const baseRule = {
      id: `ai-rule-${Date.now()}`,
      name: aiResult.ruleName,
      description: aiResult.ruleDescription,
      isActive: false, // Let user activate after review
      createdAt: new Date(),
      updatedAt: new Date()
    };

    switch (aiResult.ruleType) {
      case 'coRun':
        rule = {
          ...baseRule,
          type: 'coRun',
          taskIds: aiResult.ruleConfig.taskIds
        } as CoRunRule;
        break;
      
      case 'loadLimit':
        rule = {
          ...baseRule,
          type: 'loadLimit',
          workerGroup: aiResult.ruleConfig.workerGroup,
          maxSlotsPerPhase: aiResult.ruleConfig.maxSlotsPerPhase
        } as LoadLimitRule;
        break;
      
      case 'slotRestriction':
        rule = {
          ...baseRule,
          type: 'slotRestriction',
          targetType: aiResult.ruleConfig.targetType,
          groupTag: aiResult.ruleConfig.groupTag,
          minCommonSlots: aiResult.ruleConfig.minCommonSlots
        } as SlotRestrictionRule;
        break;
      
      case 'phaseWindow':
        rule = {
          ...baseRule,
          type: 'phaseWindow',
          taskId: aiResult.ruleConfig.taskId,
          allowedPhases: aiResult.ruleConfig.allowedPhases
        } as PhaseWindowRule;
        break;
      
      case 'patternMatch':
        rule = {
          ...baseRule,
          type: 'patternMatch',
          regex: aiResult.ruleConfig.regex,
          template: aiResult.ruleConfig.template,
          parameters: aiResult.ruleConfig.parameters || {}
        } as PatternMatchRule;
        break;
      
      case 'precedenceOverride':
        rule = {
          ...baseRule,
          type: 'precedenceOverride',
          overrideType: aiResult.ruleConfig.overrideType || 'priority',
          targetRuleIds: aiResult.ruleConfig.targetRuleIds || [],
          priority: aiResult.ruleConfig.priority,
          conditions: aiResult.ruleConfig.conditions || {}
        } as PrecedenceOverrideRule;
        break;
      
      default:
        return {
          success: false,
          confidence: 0,
          error: `Unsupported rule type: ${aiResult.ruleType}`
        };
    }

    // Calculate enhanced confidence score
    const confidenceResult = calculateConfidenceScore(
      userInput,
      aiResult.ruleType,
      aiResult.ruleConfig,
      {
        clients: availableData.clientGroups.map(group => ({ ClientID: '', GroupTag: group } as any)),
        workers: availableData.workerGroups.map(group => ({ WorkerID: '', WorkerGroup: group } as any)),
        tasks: availableData.taskIds.map(id => ({ TaskID: id } as any)),
        clientGroups: availableData.clientGroups,
        workerGroups: availableData.workerGroups,
        taskIds: availableData.taskIds,
        skills: availableData.skills
      }
    );

    return {
      success: true,
      confidence: confidenceResult.overall,
      confidenceResult,
      rule,
      explanation: aiResult.explanation,
      suggestions: aiResult.suggestions || []
    };

  } catch (error) {
    console.error('Rule generation error:', error);
    return {
      success: false,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get rule type suggestions based on partial input
 */
export function getRuleTypeSuggestions(partialInput: string): RuleTemplate[] {
  const input = partialInput.toLowerCase();
  return RULE_TEMPLATES.filter(template => 
    template.pattern.test(input) || 
    template.description.toLowerCase().includes(input) ||
    template.example.toLowerCase().includes(input)
  );
}
import { BusinessRule } from '@/lib/stores/rules-store';

// Template parameter types
export interface TemplateParameter {
  id: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'select' | 'multiselect' | 'boolean' | 'phase-array';
  required: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// Rule template definition
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  ruleType: BusinessRule['type'];
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  useCase: string;
  parameters: TemplateParameter[];
  example: string;
  benefits: string[];
  considerations: string[];
  generateRule: (params: Record<string, any>) => Partial<BusinessRule>;
}

// Template categories
export const TEMPLATE_CATEGORIES = [
  {
    id: 'team-management',
    name: 'Team Management',
    description: 'Templates for managing worker capacity and team organization',
    icon: '👥'
  },
  {
    id: 'client-prioritization',
    name: 'Client Prioritization', 
    description: 'Templates for handling different client priority levels',
    icon: '⭐'
  },
  {
    id: 'resource-limits',
    name: 'Resource Limits',
    description: 'Templates for managing workload and capacity constraints',
    icon: '📊'
  },
  {
    id: 'workflow-coordination',
    name: 'Workflow Coordination',
    description: 'Templates for coordinating task execution and dependencies',
    icon: '🔄'
  },
  {
    id: 'emergency-protocols',
    name: 'Emergency Protocols',
    description: 'Templates for handling urgent situations and exceptions',
    icon: '🚨'
  },
  {
    id: 'quality-assurance',
    name: 'Quality Assurance',
    description: 'Templates for ensuring quality and compliance standards',
    icon: '✅'
  }
];

// Comprehensive rule template library
export const RULE_TEMPLATES: RuleTemplate[] = [
  // TEAM MANAGEMENT TEMPLATES
  {
    id: 'team-workload-limit',
    name: 'Team Workload Limit',
    description: 'Prevent team overload by limiting concurrent tasks per worker group',
    category: 'team-management',
    tags: ['workload', 'capacity', 'team', 'limits'],
    ruleType: 'loadLimit',
    icon: '📊',
    difficulty: 'beginner',
    useCase: 'Prevent burnout and maintain quality by capping team workload',
    parameters: [
      {
        id: 'workerGroup',
        label: 'Worker Group',
        description: 'Select the team/group to apply the limit to',
        type: 'select',
        required: true,
        options: [] // Will be populated dynamically
      },
      {
        id: 'maxSlots',
        label: 'Maximum Tasks per Phase',
        description: 'Maximum number of tasks this group can handle simultaneously',
        type: 'number',
        required: true,
        defaultValue: 3,
        validation: { min: 1, max: 20 }
      }
    ],
    example: 'Sales team should handle at most 5 tasks per phase',
    benefits: [
      'Prevents team overload and burnout',
      'Maintains consistent quality standards', 
      'Enables predictable capacity planning',
      'Reduces stress and improves work-life balance'
    ],
    considerations: [
      'May delay some tasks during high demand',
      'Requires accurate team capacity assessment',
      'Should be adjusted based on team performance'
    ],
    generateRule: (params) => ({
      type: 'loadLimit',
      name: `${params.workerGroup} Workload Limit`,
      description: `Limit ${params.workerGroup} to maximum ${params.maxSlots} tasks per phase`,
      workerGroup: params.workerGroup,
      maxSlotsPerPhase: params.maxSlots,
      isActive: false
    })
  },

  {
    id: 'skill-based-assignment',
    name: 'Skill-Based Task Assignment',
    description: 'Ensure tasks are only assigned to workers with required skills',
    category: 'team-management',
    tags: ['skills', 'requirements', 'matching'],
    ruleType: 'patternMatch',
    icon: '🎯',
    difficulty: 'intermediate',
    useCase: 'Match tasks with workers who have the right expertise',
    parameters: [
      {
        id: 'skillPattern',
        label: 'Required Skill',
        description: 'Skill that must be present for task assignment',
        type: 'select',
        required: true,
        options: [] // Will be populated dynamically
      },
      {
        id: 'taskPattern',
        label: 'Task Pattern',
        description: 'Pattern to identify tasks requiring this skill (e.g., "JavaScript", "Database")',
        type: 'string',
        required: true
      }
    ],
    example: 'JavaScript tasks should only go to developers with JavaScript skills',
    benefits: [
      'Ensures proper skill matching',
      'Improves task completion quality',
      'Reduces rework and errors',
      'Optimizes resource utilization'
    ],
    considerations: [
      'May limit assignment flexibility',
      'Requires accurate skill data',
      'Could create bottlenecks for specialized skills'
    ],
    generateRule: (params) => ({
      type: 'patternMatch',
      name: `${params.skillPattern} Skill Requirement`,
      description: `Tasks containing "${params.taskPattern}" require ${params.skillPattern} skills`,
      regex: params.taskPattern,
      template: 'skill-requirement',
      parameters: { requiredSkill: params.skillPattern }
    })
  },

  // CLIENT PRIORITIZATION TEMPLATES
  {
    id: 'vip-client-priority',
    name: 'VIP Client Priority Access',
    description: 'Ensure VIP clients get dedicated worker attention and faster response',
    category: 'client-prioritization',
    tags: ['vip', 'priority', 'service-level'],
    ruleType: 'slotRestriction',
    icon: '👑',
    difficulty: 'beginner',
    useCase: 'Guarantee premium service levels for high-value clients',
    parameters: [
      {
        id: 'vipGroupTag',
        label: 'VIP Client Group',
        description: 'Tag identifying VIP clients',
        type: 'select',
        required: true,
        options: [] // Will be populated dynamically
      },
      {
        id: 'minSlots',
        label: 'Minimum Reserved Slots',
        description: 'Number of worker slots always available for VIP clients',
        type: 'number',
        required: true,
        defaultValue: 2,
        validation: { min: 1, max: 10 }
      }
    ],
    example: 'VIP clients always have access to at least 3 dedicated worker slots',
    benefits: [
      'Guarantees premium service quality',
      'Ensures rapid response for VIP clients',
      'Improves client retention and satisfaction',
      'Creates clear service tier differentiation'
    ],
    considerations: [
      'Reduces capacity for regular clients',
      'May increase overall resource requirements',
      'Requires clear VIP identification system'
    ],
    generateRule: (params) => ({
      type: 'slotRestriction',
      name: `${params.vipGroupTag} Priority Access`,
      description: `Reserve minimum ${params.minSlots} slots for ${params.vipGroupTag} clients`,
      targetType: 'client' as const,
      groupTag: params.vipGroupTag,
      minCommonSlots: params.minSlots
    })
  },

  {
    id: 'priority-level-escalation',
    name: 'Priority Level Escalation',
    description: 'Automatically escalate high-priority requests with precedence rules',
    category: 'client-prioritization',
    tags: ['priority', 'escalation', 'urgent'],
    ruleType: 'precedenceOverride',
    icon: '⚡',
    difficulty: 'advanced',
    useCase: 'Handle urgent requests by overriding normal allocation rules',
    parameters: [
      {
        id: 'priorityThreshold',
        label: 'Priority Threshold',
        description: 'Minimum priority level for escalation (1-5)',
        type: 'number',
        required: true,
        defaultValue: 4,
        validation: { min: 1, max: 5 }
      },
      {
        id: 'overrideType',
        label: 'Override Type',
        description: 'Type of rules to override',
        type: 'select',
        required: true,
        defaultValue: 'capacity',
        options: [
          { value: 'capacity', label: 'Capacity Limits' },
          { value: 'scheduling', label: 'Scheduling Rules' },
          { value: 'all', label: 'All Rules' }
        ]
      }
    ],
    example: 'Priority 5 requests override capacity limits and scheduling constraints',
    benefits: [
      'Ensures critical requests get immediate attention',
      'Provides flexibility for emergency situations',
      'Maintains service level agreements',
      'Enables crisis response capabilities'
    ],
    considerations: [
      'Can disrupt normal workflow',
      'May impact other client service',
      'Requires careful priority management'
    ],
    generateRule: (params) => ({
      type: 'precedenceOverride',
      name: `Priority ${params.priorityThreshold}+ Escalation`,
      description: `Override ${params.overrideType} rules for priority ${params.priorityThreshold} and above`,
      overrideType: params.overrideType,
      priority: params.priorityThreshold,
      targetRuleIds: [],
      conditions: { minPriority: params.priorityThreshold }
    })
  },

  // WORKFLOW COORDINATION TEMPLATES
  {
    id: 'sequential-task-coordination',
    name: 'Sequential Task Coordination',
    description: 'Ensure related tasks run together for better coordination',
    category: 'workflow-coordination',
    tags: ['coordination', 'dependencies', 'workflow'],
    ruleType: 'coRun',
    icon: '🔗',
    difficulty: 'intermediate',
    useCase: 'Coordinate related tasks that benefit from simultaneous execution',
    parameters: [
      {
        id: 'taskIds',
        label: 'Related Tasks',
        description: 'Select tasks that should run together',
        type: 'multiselect',
        required: true,
        options: [] // Will be populated dynamically
      },
      {
        id: 'coordinationType',
        label: 'Coordination Type',
        description: 'How tasks should be coordinated',
        type: 'select',
        required: true,
        defaultValue: 'simultaneous',
        options: [
          { value: 'simultaneous', label: 'Run Simultaneously' },
          { value: 'sequential', label: 'Run in Sequence' },
          { value: 'overlapping', label: 'Allow Overlap' }
        ]
      }
    ],
    example: 'Development and testing tasks for the same feature should run together',
    benefits: [
      'Improves task coordination and communication',
      'Reduces context switching overhead',
      'Enables better resource sharing',
      'Improves overall workflow efficiency'
    ],
    considerations: [
      'May reduce scheduling flexibility',
      'Could create resource bottlenecks',
      'Requires clear task dependencies'
    ],
    generateRule: (params) => ({
      type: 'coRun',
      name: `${params.taskIds.slice(0, 2).join(' & ')} Coordination`,
      description: `Coordinate execution of ${params.taskIds.length} related tasks`,
      taskIds: params.taskIds
    })
  },

  {
    id: 'phase-restriction-template',
    name: 'Phase-Based Task Scheduling',
    description: 'Restrict specific tasks to appropriate execution phases',
    category: 'workflow-coordination',
    tags: ['phases', 'scheduling', 'timing'],
    ruleType: 'phaseWindow',
    icon: '📅',
    difficulty: 'beginner',
    useCase: 'Ensure tasks run in the correct project phases',
    parameters: [
      {
        id: 'taskId',
        label: 'Task',
        description: 'Select the task to restrict',
        type: 'select',
        required: true,
        options: [] // Will be populated dynamically
      },
      {
        id: 'allowedPhases',
        label: 'Allowed Phases',
        description: 'Select which phases this task can run in',
        type: 'phase-array',
        required: true,
        defaultValue: [1, 2, 3, 4, 5]
      }
    ],
    example: 'Testing tasks should only run in phases 4 and 5',
    benefits: [
      'Ensures proper project phase alignment',
      'Prevents premature task execution',
      'Maintains logical workflow sequence',
      'Reduces scheduling conflicts'
    ],
    considerations: [
      'May limit scheduling flexibility',
      'Requires clear phase definitions',
      'Could delay urgent tasks'
    ],
    generateRule: (params) => ({
      type: 'phaseWindow',
      name: `${params.taskId} Phase Restriction`,
      description: `Restrict ${params.taskId} to phases ${params.allowedPhases.join(', ')}`,
      taskId: params.taskId,
      allowedPhases: params.allowedPhases
    })
  },

  // EMERGENCY PROTOCOLS TEMPLATES
  {
    id: 'emergency-response-protocol',
    name: 'Emergency Response Protocol',
    description: 'Override all rules for emergency situations requiring immediate action',
    category: 'emergency-protocols',
    tags: ['emergency', 'override', 'critical'],
    ruleType: 'precedenceOverride',
    icon: '🚨',
    difficulty: 'advanced',
    useCase: 'Handle system outages, security incidents, or critical client issues',
    parameters: [
      {
        id: 'emergencyPattern',
        label: 'Emergency Identifier',
        description: 'Pattern to identify emergency tasks (e.g., "EMERGENCY", "CRITICAL")',
        type: 'string',
        required: true,
        defaultValue: 'EMERGENCY'
      },
      {
        id: 'overridePriority',
        label: 'Override Priority',
        description: 'Priority level for emergency override (higher = more important)',
        type: 'number',
        required: true,
        defaultValue: 10,
        validation: { min: 1, max: 10 }
      }
    ],
    example: 'Tasks marked as "EMERGENCY" override all capacity and scheduling rules',
    benefits: [
      'Enables rapid response to critical situations',
      'Maintains business continuity during crises',
      'Provides clear escalation pathway',
      'Protects against system failures'
    ],
    considerations: [
      'Can severely disrupt normal operations',
      'Should be used sparingly and with oversight',
      'Requires clear emergency identification criteria'
    ],
    generateRule: (params) => ({
      type: 'precedenceOverride',
      name: `Emergency Response Protocol`,
      description: `Emergency tasks with "${params.emergencyPattern}" override all rules`,
      overrideType: 'emergency',
      priority: params.overridePriority,
      targetRuleIds: [],
      conditions: { emergencyPattern: params.emergencyPattern }
    })
  },

  // QUALITY ASSURANCE TEMPLATES
  {
    id: 'quality-review-requirement',
    name: 'Quality Review Requirement',
    description: 'Ensure certain types of tasks always include quality review',
    category: 'quality-assurance',
    tags: ['quality', 'review', 'compliance'],
    ruleType: 'patternMatch',
    icon: '🔍',
    difficulty: 'intermediate',
    useCase: 'Mandatory quality checks for high-risk or critical tasks',
    parameters: [
      {
        id: 'taskPattern',
        label: 'Task Pattern',
        description: 'Pattern identifying tasks requiring review (e.g., "Production", "Release")',
        type: 'string',
        required: true
      },
      {
        id: 'reviewType',
        label: 'Review Type',
        description: 'Type of quality review required',
        type: 'select',
        required: true,
        defaultValue: 'peer-review',
        options: [
          { value: 'peer-review', label: 'Peer Review' },
          { value: 'senior-review', label: 'Senior Review' },
          { value: 'compliance-check', label: 'Compliance Check' },
          { value: 'security-audit', label: 'Security Audit' }
        ]
      }
    ],
    example: 'All production deployment tasks require senior review',
    benefits: [
      'Ensures quality standards compliance',
      'Reduces risk of errors in critical tasks',
      'Provides audit trail for important changes',
      'Improves overall deliverable quality'
    ],
    considerations: [
      'Adds time to task completion',
      'Requires available reviewers',
      'May create approval bottlenecks'
    ],
    generateRule: (params) => ({
      type: 'patternMatch',
      name: `${params.reviewType.replace('-', ' ')} Requirement`,
      description: `Tasks matching "${params.taskPattern}" require ${params.reviewType}`,
      regex: params.taskPattern,
      template: 'quality-review',
      parameters: { reviewType: params.reviewType }
    })
  }
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(categoryId: string): RuleTemplate[] {
  return RULE_TEMPLATES.filter(template => template.category === categoryId);
}

/**
 * Get templates by difficulty level
 */
export function getTemplatesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): RuleTemplate[] {
  return RULE_TEMPLATES.filter(template => template.difficulty === difficulty);
}

/**
 * Get templates by rule type
 */
export function getTemplatesByRuleType(ruleType: BusinessRule['type']): RuleTemplate[] {
  return RULE_TEMPLATES.filter(template => template.ruleType === ruleType);
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): RuleTemplate[] {
  const searchTerm = query.toLowerCase();
  return RULE_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(searchTerm) ||
    template.description.toLowerCase().includes(searchTerm) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
    template.useCase.toLowerCase().includes(searchTerm)
  );
}

/**
 * Get suggested templates based on available data
 */
export function getSuggestedTemplates(context: {
  hasVipClients: boolean;
  hasMultipleTeams: boolean;
  hasSkillData: boolean;
  hasPhaseData: boolean;
  teamSizes: Record<string, number>;
}): RuleTemplate[] {
  const suggestions: RuleTemplate[] = [];

  // Always suggest basic workload management
  if (context.hasMultipleTeams) {
    suggestions.push(RULE_TEMPLATES.find(t => t.id === 'team-workload-limit')!);
  }

  // Suggest VIP handling if VIP clients exist
  if (context.hasVipClients) {
    suggestions.push(RULE_TEMPLATES.find(t => t.id === 'vip-client-priority')!);
  }

  // Suggest skill-based assignment if skill data exists
  if (context.hasSkillData) {
    suggestions.push(RULE_TEMPLATES.find(t => t.id === 'skill-based-assignment')!);
  }

  // Suggest phase restrictions if phase data exists
  if (context.hasPhaseData) {
    suggestions.push(RULE_TEMPLATES.find(t => t.id === 'phase-restriction-template')!);
  }

  // Suggest emergency protocols for any organization
  suggestions.push(RULE_TEMPLATES.find(t => t.id === 'emergency-response-protocol')!);

  return suggestions.filter(Boolean);
}

/**
 * Validate template parameters
 */
export function validateTemplateParameters(template: RuleTemplate, params: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  template.parameters.forEach(param => {
    const value = params[param.id];

    // Check required parameters
    if (param.required && (value === undefined || value === null || value === '')) {
      errors.push(`${param.label} is required`);
      return;
    }

    // Skip validation if value is empty and not required
    if (!param.required && (value === undefined || value === null || value === '')) {
      return;
    }

    // Type validation
    switch (param.type) {
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${param.label} must be a valid number`);
        } else if (param.validation) {
          if (param.validation.min !== undefined && value < param.validation.min) {
            errors.push(`${param.label} must be at least ${param.validation.min}`);
          }
          if (param.validation.max !== undefined && value > param.validation.max) {
            errors.push(`${param.label} cannot exceed ${param.validation.max}`);
          }
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${param.label} must be a text value`);
        } else if (param.validation?.pattern) {
          const regex = new RegExp(param.validation.pattern);
          if (!regex.test(value)) {
            errors.push(`${param.label} format is invalid`);
          }
        }
        break;

      case 'multiselect':
      case 'phase-array':
        if (!Array.isArray(value)) {
          errors.push(`${param.label} must be a list of values`);
        } else if (value.length === 0 && param.required) {
          errors.push(`${param.label} must have at least one selection`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${param.label} must be true or false`);
        }
        break;
    }
  });

  return { valid: errors.length === 0, errors };
}
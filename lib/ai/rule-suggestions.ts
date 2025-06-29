import { BusinessRule } from '@/lib/stores/rules-store';
import { Client, Worker, Task } from '@/lib/types/entities';

// Rule suggestion types
export interface RuleSuggestion {
  id: string;
  type: BusinessRule['type'];
  title: string;
  description: string;
  reason: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
  impact: string;
  benefits: string[];
  risks: string[];
  suggestedRule: Partial<BusinessRule>;
  affectedEntities: {
    clients?: string[];
    workers?: string[];
    tasks?: string[];
  };
  metrics?: {
    workloadReduction?: number;
    efficiencyGain?: number;
    capacityUtilization?: number;
  };
}

// Pattern detection interfaces (for future use)
// interface WorkloadAnalysis {
//   workerGroup: string;
//   currentLoad: number;
//   suggestedLimit: number;
//   overloadedWorkers: string[];
//   utilizationRate: number;
// }

// interface TaskPattern {
//   taskIds: string[];
//   pattern: string;
//   frequency: number;
//   commonAttributes: string[];
// }

// interface ClientPattern {
//   groupTag: string;
//   priorityLevel: number;
//   taskCount: number;
//   specialRequirements: string[];
// }

/**
 * Analyze workload distribution and suggest load limit rules
 */
function analyzeWorkloadPatterns(
  _clients: Client[], 
  workers: Worker[], 
  _tasks: Task[]
): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];
  
  // Group workers by WorkerGroup
  const workerGroups = workers.reduce((acc, worker) => {
    const group = worker.WorkerGroup || 'default';
    if (!acc[group]) acc[group] = [];
    acc[group].push(worker);
    return acc;
  }, {} as Record<string, Worker[]>);

  // Analyze each worker group
  Object.entries(workerGroups).forEach(([groupName, groupWorkers]) => {
    if (groupWorkers.length < 2) return; // Skip single-worker groups

    // Calculate average workload capacity
    const avgCapacity = groupWorkers.reduce((sum, w) => sum + Number(w.AvailableSlots || 5), 0) / groupWorkers.length;
    const avgMaxLoad = groupWorkers.reduce((sum, w) => sum + Number(w.MaxLoadPerPhase || 3), 0) / groupWorkers.length;
    
    // Check for potential overload patterns
    const highCapacityWorkers = groupWorkers.filter(w => Number(w.AvailableSlots || 5) > avgCapacity * 1.5);
    
    // Suggest load limit if there's capacity imbalance
    if (highCapacityWorkers.length > 0 || avgMaxLoad > 5) {
      const suggestedLimit = Math.max(2, Math.floor(avgMaxLoad * 0.8));
      
      suggestions.push({
        id: `workload-${groupName}-${Date.now()}`,
        type: 'loadLimit',
        title: `Workload Limit for ${groupName}`,
        description: `Limit ${groupName} workers to ${suggestedLimit} tasks per phase to prevent overload`,
        reason: `Analysis shows potential capacity imbalance in ${groupName} group`,
        confidence: 85,
        priority: avgMaxLoad > 6 ? 'high' : 'medium',
        category: 'Workload Management',
        impact: `Affects ${groupWorkers.length} workers in ${groupName} group`,
        benefits: [
          'Prevents worker burnout and overload',
          'Maintains consistent service quality',
          'Improves work-life balance',
          'Enables predictable capacity planning'
        ],
        risks: [
          'May delay some tasks during peak demand',
          'Could require additional resources'
        ],
        suggestedRule: {
          type: 'loadLimit',
          name: `${groupName} Workload Limit`,
          description: `Limit ${groupName} workers to maximum ${suggestedLimit} tasks per phase`,
          workerGroup: groupName,
          maxSlotsPerPhase: suggestedLimit,
          isActive: false
        },
        affectedEntities: {
          workers: groupWorkers.map(w => w.WorkerID)
        },
        metrics: {
          workloadReduction: Math.round((avgMaxLoad - suggestedLimit) / avgMaxLoad * 100),
          capacityUtilization: Math.round(avgCapacity / 10 * 100)
        }
      });
    }
  });

  return suggestions;
}

/**
 * Analyze task patterns and suggest co-run rules
 */
function analyzeTaskPatterns(
  _clients: Client[], 
  _workers: Worker[], 
  tasks: Task[]
): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  // Group tasks by similar characteristics
  const tasksByCategory = tasks.reduce((acc, task) => {
    const category = task.Category || 'uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Look for tasks with similar skills or duration
  Object.entries(tasksByCategory).forEach(([category, categoryTasks]) => {
    if (categoryTasks.length < 2) return;

    // Find tasks with similar skill requirements
    const skillGroups = categoryTasks.reduce((acc, task) => {
      const skills = Array.isArray(task.RequiredSkills) ? task.RequiredSkills.join(',').toLowerCase() : String(task.RequiredSkills || '').toLowerCase();
      if (!acc[skills]) acc[skills] = [];
      acc[skills].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    Object.entries(skillGroups).forEach(([skillSet, skillTasks]) => {
      if (skillTasks.length >= 2 && skillSet) {
        // Suggest co-run rule for similar tasks
        suggestions.push({
          id: `corun-${category}-${Date.now()}`,
          type: 'coRun',
          title: `Coordinate ${category} Tasks`,
          description: `Run ${skillTasks.slice(0, 2).map(t => t.TaskID).join(' and ')} together for better efficiency`,
          reason: `Tasks share similar skill requirements: ${skillSet}`,
          confidence: 75,
          priority: skillTasks.length > 3 ? 'medium' : 'low',
          category: 'Task Coordination',
          impact: `Affects ${skillTasks.length} tasks in ${category} category`,
          benefits: [
            'Reduces context switching for workers',
            'Improves task coordination',
            'Better resource utilization',
            'Enhanced knowledge sharing'
          ],
          risks: [
            'May reduce scheduling flexibility',
            'Could create resource bottlenecks'
          ],
          suggestedRule: {
            type: 'coRun',
            name: `${category} Task Coordination`,
            description: `Coordinate execution of related ${category} tasks`,
            taskIds: skillTasks.slice(0, 3).map(t => t.TaskID),
            isActive: false
          },
          affectedEntities: {
            tasks: skillTasks.map(t => t.TaskID)
          },
          metrics: {
            efficiencyGain: Math.min(25, skillTasks.length * 5)
          }
        });
      }
    });
  });

  return suggestions;
}

/**
 * Analyze client patterns and suggest prioritization rules
 */
function analyzeClientPatterns(
  clients: Client[], 
  workers: Worker[], 
  _tasks: Task[]
): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  // Find VIP or high-priority clients
  const highPriorityClients = clients.filter(c => (c.PriorityLevel || 1) >= 4);
  const vipClients = clients.filter(c => 
    c.GroupTag?.toLowerCase().includes('vip') || 
    c.GroupTag?.toLowerCase().includes('premium') ||
    c.GroupTag?.toLowerCase().includes('enterprise')
  );

  // Suggest VIP slot reservation
  if (vipClients.length > 0) {
    const totalWorkers = workers.length;
    const suggestedSlots = Math.max(1, Math.floor(totalWorkers * 0.2)); // 20% capacity for VIP

    suggestions.push({
      id: `vip-slots-${Date.now()}`,
      type: 'slotRestriction',
      title: 'VIP Client Priority Access',
      description: `Reserve ${suggestedSlots} worker slots for VIP clients`,
      reason: `Found ${vipClients.length} VIP clients requiring priority service`,
      confidence: 90,
      priority: 'high',
      category: 'Client Prioritization',
      impact: `Guarantees service for ${vipClients.length} VIP clients`,
      benefits: [
        'Ensures premium service quality',
        'Improves VIP client satisfaction',
        'Creates clear service differentiation',
        'Protects revenue from high-value clients'
      ],
      risks: [
        'Reduces capacity for regular clients',
        'May increase overall resource requirements'
      ],
      suggestedRule: {
        type: 'slotRestriction',
        name: 'VIP Client Priority Access',
        description: `Reserve minimum ${suggestedSlots} slots for VIP clients`,
        targetType: 'client' as const,
        groupTag: vipClients[0].GroupTag || 'VIP',
        minCommonSlots: suggestedSlots,
        isActive: false
      },
      affectedEntities: {
        clients: vipClients.map(c => c.ClientID),
        workers: workers.slice(0, suggestedSlots).map(w => w.WorkerID)
      },
      metrics: {
        capacityUtilization: Math.round(suggestedSlots / totalWorkers * 100)
      }
    });
  }

  // Suggest priority escalation for high-priority clients
  if (highPriorityClients.length > 0) {
    suggestions.push({
      id: `priority-escalation-${Date.now()}`,
      type: 'precedenceOverride',
      title: 'High Priority Escalation',
      description: 'Override capacity limits for priority 4+ clients',
      reason: `${highPriorityClients.length} clients have priority level 4 or higher`,
      confidence: 80,
      priority: 'medium',
      category: 'Priority Management',
      impact: `Enables escalation for ${highPriorityClients.length} high-priority clients`,
      benefits: [
        'Ensures critical requests get immediate attention',
        'Maintains service level agreements',
        'Provides flexibility for urgent situations'
      ],
      risks: [
        'Can disrupt normal workflow',
        'May impact other client service'
      ],
      suggestedRule: {
        type: 'precedenceOverride',
        name: 'High Priority Escalation',
        description: 'Override capacity rules for priority 4+ requests',
        overrideType: 'capacity',
        priority: 4,
        targetRuleIds: [],
        conditions: { minPriority: 4 },
        isActive: false
      },
      affectedEntities: {
        clients: highPriorityClients.map(c => c.ClientID)
      }
    });
  }

  return suggestions;
}

/**
 * Analyze phase patterns and suggest phase window rules
 */
function analyzePhasePatterns(
  _clients: Client[], 
  _workers: Worker[], 
  tasks: Task[]
): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  // Analyze tasks with specific phase preferences
  const tasksWithPhases = tasks.filter(t => t.PreferredPhases && t.PreferredPhases.length > 0);
  
  if (tasksWithPhases.length > 0) {
    // Group by phase preferences
    const phaseGroups: Record<string, Task[]> = {};
    
    tasksWithPhases.forEach(task => {
      const phases = Array.isArray(task.PreferredPhases) ? task.PreferredPhases : String(task.PreferredPhases || '').split(',').map(Number).filter(Boolean);
      const phaseKey = phases.sort().join(',') || '';
      if (phaseKey) {
        if (!phaseGroups[phaseKey]) phaseGroups[phaseKey] = [];
        phaseGroups[phaseKey].push(task);
      }
    });

    // Suggest phase restrictions for common patterns
    Object.entries(phaseGroups).forEach(([phaseKey, phaseTasks]) => {
      if (phaseTasks.length >= 2) {
        const phases = phaseKey.split(',').map(Number);
        const isRestrictive = phases.length <= 2; // Only suggest if reasonably restrictive
        
        if (isRestrictive) {
          phaseTasks.slice(0, 3).forEach(task => {
            suggestions.push({
              id: `phase-${task.TaskID}-${Date.now()}`,
              type: 'phaseWindow',
              title: `Phase Restriction for ${task.TaskID}`,
              description: `Restrict ${task.TaskID} to phases ${phases.join(', ')}`,
              reason: `Task has specific phase preferences that should be enforced`,
              confidence: 70,
              priority: 'low',
              category: 'Phase Management',
              impact: `Ensures proper timing for ${task.TaskID}`,
              benefits: [
                'Ensures proper project phase alignment',
                'Prevents premature task execution',
                'Maintains logical workflow sequence'
              ],
              risks: [
                'May limit scheduling flexibility',
                'Could delay urgent tasks'
              ],
              suggestedRule: {
                type: 'phaseWindow',
                name: `${task.TaskID} Phase Restriction`,
                description: `Restrict ${task.TaskID} to phases ${phases.join(', ')}`,
                taskId: task.TaskID,
                allowedPhases: phases,
                isActive: false
              },
              affectedEntities: {
                tasks: [task.TaskID]
              }
            });
          });
        }
      }
    });
  }

  return suggestions;
}

/**
 * Generate comprehensive rule suggestions based on data analysis
 */
export function generateRuleSuggestions(
  clients: Client[], 
  workers: Worker[], 
  tasks: Task[],
  existingRules: BusinessRule[] = []
): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  // Skip analysis if insufficient data
  if (clients.length === 0 || workers.length === 0 || tasks.length === 0) {
    return suggestions;
  }

  try {
    // Analyze different patterns
    const workloadSuggestions = analyzeWorkloadPatterns(clients, workers, tasks);
    const taskSuggestions = analyzeTaskPatterns(clients, workers, tasks);
    const clientSuggestions = analyzeClientPatterns(clients, workers, tasks);
    const phaseSuggestions = analyzePhasePatterns(clients, workers, tasks);

    suggestions.push(...workloadSuggestions);
    suggestions.push(...taskSuggestions);
    suggestions.push(...clientSuggestions);
    suggestions.push(...phaseSuggestions);

    // Filter out suggestions for rules that already exist
    const filteredSuggestions = suggestions.filter(suggestion => {
      return !existingRules.some(rule => {
        // Check if a similar rule already exists
        if (rule.type !== suggestion.type) return false;
        
        switch (rule.type) {
          case 'loadLimit':
            return (rule as any).workerGroup === (suggestion.suggestedRule as any).workerGroup;
          case 'coRun':
            const existingTasks = (rule as any).taskIds || [];
            const suggestedTasks = (suggestion.suggestedRule as any).taskIds || [];
            return existingTasks.some((id: string) => suggestedTasks.includes(id));
          case 'slotRestriction':
            return (rule as any).groupTag === (suggestion.suggestedRule as any).groupTag;
          case 'phaseWindow':
            return (rule as any).taskId === (suggestion.suggestedRule as any).taskId;
          default:
            return false;
        }
      });
    });

    // Sort by priority and confidence
    return filteredSuggestions.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

  } catch (error) {
    console.error('Error generating rule suggestions:', error);
    return [];
  }
}

/**
 * Get suggestion statistics for dashboard
 */
export function getSuggestionStats(suggestions: RuleSuggestion[]) {
  const stats = {
    total: suggestions.length,
    byPriority: {
      high: suggestions.filter(s => s.priority === 'high').length,
      medium: suggestions.filter(s => s.priority === 'medium').length,
      low: suggestions.filter(s => s.priority === 'low').length
    },
    byCategory: suggestions.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    averageConfidence: suggestions.length > 0 
      ? Math.round(suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length)
      : 0,
    potentialImpact: {
      workloadReduction: Math.round(
        suggestions
          .filter(s => s.metrics?.workloadReduction)
          .reduce((sum, s) => sum + (s.metrics?.workloadReduction || 0), 0) / 
        Math.max(1, suggestions.filter(s => s.metrics?.workloadReduction).length)
      ),
      efficiencyGain: Math.round(
        suggestions
          .filter(s => s.metrics?.efficiencyGain)
          .reduce((sum, s) => sum + (s.metrics?.efficiencyGain || 0), 0) / 
        Math.max(1, suggestions.filter(s => s.metrics?.efficiencyGain).length)
      )
    }
  };

  return stats;
}
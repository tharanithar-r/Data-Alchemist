import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai'

import { geminiConfig } from '@/lib/config/env'

export interface AIResponse {
  content: string
  confidence: number
  suggestions?: string[]
  error?: string
}

export interface HeaderMappingSuggestion {
  sourceColumn: string
  targetField: string
  confidence: number
  reasoning: string
}

export interface ValidationSuggestion {
  errorId: string
  suggestion: string
  confidence: number
  autoFixable: boolean
}

export class GeminiClient {
  private model: GenerativeModel | null = null
  private requestCount = 0
  private lastRequestTime = 0
  private readonly rateLimitWindow = 60000 // 1 minute
  private readonly isEnabled = geminiConfig.isEnabled
  
  constructor() {
    // Add detailed debugging
    console.log('🔧 GeminiClient initialization started');
    console.log('🔧 Raw geminiConfig object:', geminiConfig);
    console.log('🔧 GeminiClient initialization details:', {
      hasApiKey: !!geminiConfig.apiKey,
      apiKeyLength: geminiConfig.apiKey?.length || 0,
      isEnabled: geminiConfig.isEnabled,
      configIsEnabled: this.isEnabled,
      apiKeyFirstTen: geminiConfig.apiKey ? `${geminiConfig.apiKey.substring(0, 10)}...` : 'none'
    });
    
    if (geminiConfig.apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiConfig.apiKey)
        this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
        console.log('✅ Gemini model initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Gemini client:', error)
        this.model = null
      }
    } else {
      console.warn('⚠️ No Gemini API key found - geminiConfig.apiKey is:', geminiConfig.apiKey);
    }
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now()
    
    // Reset counter if window has passed
    if (now - this.lastRequestTime > this.rateLimitWindow) {
      this.requestCount = 0
      this.lastRequestTime = now
    }
    
    if (this.requestCount >= geminiConfig.maxRequestsPerMinute) {
      const waitTime = this.rateLimitWindow - (now - this.lastRequestTime)
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`)
    }
    
    this.requestCount++
  }

  private async makeRequest(prompt: string): Promise<AIResponse> {
    // Check if AI is available
    if (!this.model || !this.isEnabled) {
      return {
        content: '',
        confidence: 0,
        error: 'AI service not available (API key not configured)',
      }
    }

    try {
      await this.checkRateLimit()
      
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const content = response.text()
      
      return {
        content,
        confidence: 0.8, // Default confidence, can be enhanced with actual model confidence
      }
    } catch (error) {
      return {
        content: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown AI error',
      }
    }
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.isEnabled && this.model !== null;
  }

  /**
   * Generate text content for general AI tasks
   */
  async generateText(prompt: string): Promise<AIResponse> {
    return this.makeRequest(prompt);
  }

  async suggestHeaderMappings(
    headers: string[],
    entityType: 'client' | 'worker' | 'task'
  ): Promise<HeaderMappingSuggestion[]> {
    const entityFields = this.getEntityFields(entityType)
    
    const prompt = `
Analyze these column headers and suggest mappings to standard entity fields.

Column Headers: ${headers.join(', ')}

Target Entity: ${entityType}
Target Fields: ${Object.keys(entityFields).join(', ')}

Field Descriptions:
${Object.entries(entityFields).map(([field, desc]) => `- ${field}: ${desc}`).join('\n')}

Please suggest the best mapping for each column header to a target field.
Return a JSON array with objects containing:
- sourceColumn: the original column header
- targetField: the suggested target field name
- confidence: confidence score 0-1
- reasoning: brief explanation of the mapping choice

Only suggest mappings with confidence > 0.5.
`

    try {
      const response = await this.makeRequest(prompt)
      if (response.error) {
        throw new Error(response.error)
      }

      // Parse the JSON response
      const suggestions = this.parseJSONResponse(response.content) as HeaderMappingSuggestion[]
      return suggestions.filter(s => s.confidence > 0.5)
    } catch {
      // Fallback to rule-based mapping if AI fails
      return this.fallbackHeaderMapping(headers, entityType)
    }
  }

  async generateSearchQuery(naturalLanguageQuery: string): Promise<AIResponse> {
    const prompt = `
Convert this natural language query into structured search parameters for a data management system.

Query: "${naturalLanguageQuery}"

The system has three entity types:
1. Clients (ClientID, ClientName, PriorityLevel 1-5, RequestedTaskIDs, GroupTag, AttributesJSON)
2. Workers (WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup, QualificationLevel)
3. Tasks (TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent)

Convert the query into search filters. Return JSON with:
- entityType: 'client' | 'worker' | 'task' | 'all'
- searchTerm: text to search in names/descriptions
- filters: object with specific field filters
- sortBy: field to sort results
- sortOrder: 'asc' | 'desc'

Examples:
"high priority clients" → {"entityType": "client", "filters": {"PriorityLevel": [4,5]}}
"javascript developers" → {"entityType": "worker", "searchTerm": "javascript", "filters": {"Skills": ["javascript"]}}
"urgent tasks under 5 hours" → {"entityType": "task", "filters": {"Duration": {"max": 5}}}
`

    return this.makeRequest(prompt)
  }

  async suggestValidationFixes(
    errorMessage: string,
    entityData: Record<string, unknown>,
    entityType: 'client' | 'worker' | 'task'
  ): Promise<ValidationSuggestion> {
    const prompt = `
Analyze this validation error and suggest a fix:

Error: ${errorMessage}
Entity Type: ${entityType}
Entity Data: ${JSON.stringify(entityData, null, 2)}

Provide a suggestion to fix this validation error. Return JSON with:
- errorId: unique identifier for this error
- suggestion: human-readable suggestion for fixing the error
- confidence: confidence score 0-1
- autoFixable: boolean indicating if this can be automatically fixed

Focus on practical, actionable suggestions.
`

    const response = await this.makeRequest(prompt)
    
    try {
      const suggestion = this.parseJSONResponse(response.content) as ValidationSuggestion
      return suggestion
    } catch {
      return {
        errorId: `validation-${Date.now()}`,
        suggestion: 'Please review the data manually and correct any validation errors.',
        confidence: 0.3,
        autoFixable: false,
      }
    }
  }

  async generateBusinessRule(
    naturalLanguageRule: string,
    _availableRuleTypes: string[]
  ): Promise<AIResponse> {
    const prompt = `
Convert this natural language business rule into a structured rule configuration:

Rule Description: "${naturalLanguageRule}"

Available Rule Types:
- co-run: Tasks that must run together
- slot-restriction: Limits on worker slot usage
- load-limit: Maximum load constraints per phase
- phase-window: Time window constraints for task execution
- pattern-match: Pattern-based task assignments
- precedence-override: Task dependency and priority overrides

Return JSON with:
- ruleType: one of the available rule types
- name: descriptive name for the rule
- description: clear description of what the rule does
- parameters: object with rule-specific configuration
- priority: priority level 1-10 (10 highest)
- confidence: confidence in the rule interpretation 0-1

Example:
"Tasks T1 and T2 must always run together" → 
{
  "ruleType": "co-run",
  "name": "T1-T2 Co-execution",
  "parameters": {"taskIds": ["T1", "T2"], "enforceOrder": false}
}
`

    return this.makeRequest(prompt)
  }

  private getEntityFields(entityType: 'client' | 'worker' | 'task'): Record<string, string> {
    const fieldDescriptions = {
      client: {
        ClientID: 'Unique identifier for the client',
        ClientName: 'Display name of the client',
        PriorityLevel: 'Priority level from 1 (lowest) to 5 (highest)',
        RequestedTaskIDs: 'Comma-separated list of requested task IDs',
        GroupTag: 'Optional group or team identifier',
        AttributesJSON: 'Additional attributes in JSON format',
      },
      worker: {
        WorkerID: 'Unique identifier for the worker',
        WorkerName: 'Display name of the worker',
        Skills: 'Comma-separated list of worker skills',
        AvailableSlots: 'Number of available work slots',
        MaxLoadPerPhase: 'Maximum workload per execution phase',
        WorkerGroup: 'Optional group or department',
        QualificationLevel: 'Qualification level (Junior, Mid, Senior, Expert)',
      },
      task: {
        TaskID: 'Unique identifier for the task',
        TaskName: 'Display name of the task',
        Category: 'Task category (Development, Design, Testing, etc.)',
        Duration: 'Estimated duration in hours',
        RequiredSkills: 'Comma-separated list of required skills',
        PreferredPhases: 'Preferred execution phases',
        MaxConcurrent: 'Maximum concurrent instances of this task',
      },
    }

    return fieldDescriptions[entityType]
  }

  private parseJSONResponse(content: string): unknown {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // If no JSON found, try parsing the entire content
      return JSON.parse(content)
    } catch {
      throw new Error(`Failed to parse AI response as JSON: ${content}`)
    }
  }

  private fallbackHeaderMapping(
    headers: string[],
    entityType: 'client' | 'worker' | 'task'
  ): HeaderMappingSuggestion[] {
    // Fallback mapping logic using simple string matching
    const patterns = {
      client: {
        ClientID: ['client_id', 'clientid', 'id', 'client id'],
        ClientName: ['client_name', 'clientname', 'name', 'client name'],
        PriorityLevel: ['priority', 'priority_level', 'priority level'],
        RequestedTaskIDs: ['tasks', 'requested_tasks', 'task_ids'],
        GroupTag: ['group', 'group_tag', 'team'],
        AttributesJSON: ['attributes', 'metadata', 'extra'],
      },
      worker: {
        WorkerID: ['worker_id', 'workerid', 'id', 'worker id'],
        WorkerName: ['worker_name', 'workername', 'name', 'worker name'],
        Skills: ['skills', 'skill', 'capabilities'],
        AvailableSlots: ['slots', 'available_slots', 'capacity'],
        MaxLoadPerPhase: ['max_load', 'load_limit', 'phase_capacity'],
        WorkerGroup: ['group', 'team', 'department'],
        QualificationLevel: ['level', 'qualification', 'seniority'],
      },
      task: {
        TaskID: ['task_id', 'taskid', 'id', 'task id'],
        TaskName: ['task_name', 'taskname', 'name', 'task name'],
        Category: ['category', 'type', 'task_type'],
        Duration: ['duration', 'time', 'hours'],
        RequiredSkills: ['skills', 'required_skills', 'skill_requirements'],
        PreferredPhases: ['phases', 'preferred_phases', 'timeline'],
        MaxConcurrent: ['max_concurrent', 'concurrency', 'parallel'],
      },
    }

    const suggestions: HeaderMappingSuggestion[] = []
    const entityPatterns = patterns[entityType]

    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim()
      
      Object.entries(entityPatterns).forEach(([targetField, fieldPatterns]) => {
        const confidence = this.calculateFieldConfidence(normalizedHeader, fieldPatterns)
        
        if (confidence > 0.5) {
          suggestions.push({
            sourceColumn: header,
            targetField,
            confidence,
            reasoning: `Header "${header}" matches pattern for ${targetField}`,
          })
        }
      })
    })

    return suggestions.filter(s => s.confidence > 0.5)
  }

  private calculateFieldConfidence(header: string, patterns: string[]): number {
    let maxConfidence = 0
    
    patterns.forEach(pattern => {
      if (header === pattern) {
        maxConfidence = Math.max(maxConfidence, 1.0)
      } else if (header.includes(pattern)) {
        maxConfidence = Math.max(maxConfidence, 0.8)
      } else if (pattern.includes(header)) {
        maxConfidence = Math.max(maxConfidence, 0.6)
      }
    })
    
    return maxConfidence
  }

}
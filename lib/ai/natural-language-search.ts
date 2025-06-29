/**
 * Natural Language Search System for Data Alchemist
 * Provides AI-powered search with multi-tier fallback and 80%+ accuracy target
 */

import { Client, Worker, Task } from '@/lib/types/entities';

import {
  ComplexQueryParser,
  ComplexParsedQuery,
  RelationshipQuery,
} from './complex-query-parser';
import { GeminiClient } from './gemini-client';

// Search result interface
export interface SearchResult {
  entity: Client | Worker | Task;
  entityType: 'client' | 'worker' | 'task';
  score: number;
  confidence: number;
  matchReasons: string[];
  highlights: SearchHighlight[];
}

export interface SearchHighlight {
  field: string;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface SearchQuery {
  text: string;
  entityTypes?: ('client' | 'worker' | 'task')[];
  filters?: SearchFilter[];
  limit?: number;
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number;
}

export interface ParsedQuery {
  intent: 'search' | 'filter' | 'list' | 'find';
  entityTypes: ('client' | 'worker' | 'task')[];
  keywords: string[];
  filters: SearchFilter[];
  confidence: number;
  originalQuery: string;
}

export interface SearchEngineConfig {
  enableAI: boolean;
  confidenceThreshold: number;
  maxResults: number;
  enableFuzzySearch: boolean;
}

export class NaturalLanguageSearchEngine {
  private geminiClient: GeminiClient;
  private complexQueryParser: ComplexQueryParser;
  private config: SearchEngineConfig;
  private searchHistory: Array<{
    query: string;
    results: SearchResult[];
    timestamp: number;
  }> = [];

  constructor(config: Partial<SearchEngineConfig> = {}) {
    this.geminiClient = new GeminiClient();
    this.complexQueryParser = new ComplexQueryParser();
    this.config = {
      enableAI: this.geminiClient.isAvailable(), // Auto-detect AI availability
      confidenceThreshold: 0.7,
      maxResults: 50,
      enableFuzzySearch: true,
      ...config,
    };
  }

  /**
   * Main search entry point - processes natural language queries
   */
  async search(
    query: string,
    data: { clients: Client[]; workers: Worker[]; tasks: Task[] },
    options: Partial<SearchQuery> = {}
  ): Promise<SearchResult[]> {
    // Data structure validation
    if (!data || Object.keys(data).length === 0) {
      return [];
    }

    try {
      // Step 1: Parse the natural language query
      const parsedQuery = await this.parseQuery(query, options);

      // Step 2: Execute search with multi-tier fallback
      const results = await this.executeSearch(parsedQuery, data);

      // Step 3: Score and rank results
      const rankedResults = this.rankResults(results, parsedQuery);

      // Step 4: Add to search history
      this.addToHistory(query, rankedResults);

      return rankedResults.slice(0, this.config.maxResults);
    } catch (error) {
      console.error('Search failed, falling back to keyword search:', error);
      return this.keywordFallbackSearch(query, data, options);
    }
  }

  /**
   * Parse natural language query using AI with fallback
   */
  private async parseQuery(
    query: string,
    options: Partial<SearchQuery>
  ): Promise<ParsedQuery> {
    // Detect if this is a complex query first
    const isComplexQuery = this.detectComplexQuery(query);

    if (isComplexQuery) {
      try {
        const complexParsed =
          await this.complexQueryParser.parseComplexQuery(query);
        if (complexParsed.confidence >= this.config.confidenceThreshold) {
          return complexParsed;
        }
      } catch (error) {
        console.warn('Complex query parsing failed:', error);
      }
    }

    // Try AI parsing for regular queries
    if (this.config.enableAI) {
      try {
        const aiParsed = await this.parseWithAI(query);
        if (aiParsed.confidence >= this.config.confidenceThreshold) {
          return aiParsed;
        }
      } catch (error) {
        console.warn(
          'AI parsing failed, falling back to rule-based parsing:',
          error
        );
      }
    }

    // Fallback to rule-based parsing
    return this.parseWithRules(query, options);
  }

  /**
   * Detect if a query is complex and requires advanced parsing
   */
  private detectComplexQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();

    // Indicators of complex queries
    const complexPatterns = [
      // Relational patterns
      /\b(with|having|that have|who have|without|lacking)\b/,
      /\b(requires|needs|requiring|needing)\b/,
      /\b(assigned to|working on|allocated to)\b/,

      // Temporal patterns
      /\b(q[1-4]|quarter [1-4]|in \w+)\b/,
      /\b(current|past|future|this month|last month|next month)\b/,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/,

      // Multiple entity types
      /\b(client|customer|company).*(worker|employee|developer|designer|engineer).*(task|job|project)\b/,

      // Logical operators with multiple conditions
      /\b(and|or|not).*(and|or|not)\b/,

      // Multiple qualifications or skills
      /\b(senior|junior|experienced).*(javascript|python|react|vue|angular|design)\b/,
      /\b(high|low|urgent|critical).*(priority|important).*(with|having|requires)\b/,
    ];

    return complexPatterns.some(pattern => pattern.test(lowerQuery));
  }

  /**
   * AI-powered query parsing using Gemini
   */
  private async parseWithAI(query: string): Promise<ParsedQuery> {
    const prompt = `
Parse this search query for a resource allocation system with clients, workers, and tasks.

Query: "${query}"

Extract:
1. Intent (search, filter, list, find)
2. Entity types (client, worker, task) - can be multiple
3. Keywords for text matching
4. Filters with field, operator, and value

Entity schemas:
- Client: ClientID, ClientName, PriorityLevel (1-5), RequestedTaskIDs, GroupTag, AttributesJSON
- Worker: WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup, QualificationLevel
- Task: TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent

Examples:
"high priority clients" → intent: search, entities: [client], keywords: [high, priority], filters: [{field: PriorityLevel, operator: gte, value: 4}]
"JavaScript developers" → intent: search, entities: [worker], keywords: [JavaScript, developers], filters: [{field: Skills, operator: contains, value: JavaScript}]
"senior workers with React skills" → intent: search, entities: [worker], keywords: [senior, React], filters: [{field: QualificationLevel, operator: contains, value: Senior}, {field: Skills, operator: contains, value: React}]

IMPORTANT: Return only valid JSON without any markdown formatting or explanations:
{
  "intent": "search",
  "entityTypes": ["client"],
  "keywords": ["high", "priority"],
  "filters": [{"field": "PriorityLevel", "operator": "gte", "value": 4}],
  "confidence": 0.9
}`;

    const response = await this.geminiClient.generateText(prompt);
    const responseText = response.content;
    
    // Process AI response
    
    // Check if AI returned an error
    if (response.error) {
      console.warn('AI service returned error:', response.error);
      throw new Error(`AI service error: ${response.error}`);
    }
    
    // Check if response is empty
    if (!responseText || responseText.trim() === '') {
      console.warn('AI returned empty response');
      throw new Error('AI returned empty response');
    }
    
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = responseText.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      
      // Try to extract JSON object from text if it's embedded in other text
      const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonText = jsonObjectMatch[0];
      }

      const parsed = JSON.parse(jsonText);
      
      // Validate the parsed response has required fields
      if (!parsed.intent || !parsed.entityTypes || !Array.isArray(parsed.entityTypes)) {
        console.warn('AI response missing required fields, falling back to rule-based parsing');
        throw new Error('Invalid AI response structure');
      }
      
      return {
        ...parsed,
        originalQuery: query,
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      console.error('Parse error:', parseError);
      throw new Error(`Failed to parse AI response: ${responseText}`);
    }
  }

  /**
   * Rule-based query parsing as fallback
   */
  private parseWithRules(
    query: string,
    options: Partial<SearchQuery>
  ): ParsedQuery {
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);

    // Detect entity types
    const entityTypes: ('client' | 'worker' | 'task')[] = [];
    if (options.entityTypes?.length) {
      entityTypes.push(...options.entityTypes);
    } else {
      // Auto-detect from keywords
      if (lowerQuery.includes('client') || lowerQuery.includes('customer')) {
        entityTypes.push('client');
      }
      if (
        lowerQuery.includes('worker') ||
        lowerQuery.includes('developer') ||
        lowerQuery.includes('employee')
      ) {
        entityTypes.push('worker');
      }
      if (
        lowerQuery.includes('task') ||
        lowerQuery.includes('job') ||
        lowerQuery.includes('project')
      ) {
        entityTypes.push('task');
      }

      // Default to all if none detected
      if (entityTypes.length === 0) {
        entityTypes.push('client', 'worker', 'task');
      }
    }

    // Extract keywords (remove common words)
    const stopWords = new Set([
      'the',
      'and',
      'or',
      'with',
      'for',
      'in',
      'on',
      'at',
      'to',
      'by',
      'is',
      'are',
      'was',
      'were',
    ]);
    const keywords = words.filter(
      word => !stopWords.has(word) && word.length > 2
    );

    // Detect filters from patterns
    const filters: SearchFilter[] = [];

    // Priority patterns
    if (lowerQuery.includes('high priority')) {
      filters.push({ field: 'PriorityLevel', operator: 'gte', value: 4 });
    } else if (lowerQuery.includes('low priority')) {
      filters.push({ field: 'PriorityLevel', operator: 'lte', value: 2 });
    }

    // Skill patterns
    const skillMatches = lowerQuery.match(
      /\b(javascript|js|typescript|react|vue|angular|python|java|node\.?js|css|html)\b/gi
    );
    if (skillMatches) {
      skillMatches.forEach(skill => {
        filters.push({ field: 'Skills', operator: 'contains', value: skill });
      });
    }

    // Qualification patterns
    if (lowerQuery.includes('senior')) {
      filters.push({
        field: 'QualificationLevel',
        operator: 'contains',
        value: 'Senior',
      });
    } else if (lowerQuery.includes('junior')) {
      filters.push({
        field: 'QualificationLevel',
        operator: 'contains',
        value: 'Junior',
      });
    }

    return {
      intent: 'search',
      entityTypes,
      keywords,
      filters,
      confidence: 0.6, // Rule-based parsing has moderate confidence
      originalQuery: query,
    };
  }

  /**
   * Execute search across all entities with the parsed query
   */
  private async executeSearch(
    parsedQuery: ParsedQuery,
    data: { clients: Client[]; workers: Worker[]; tasks: Task[] }
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // Check if this is a complex query with relationships
    const complexQuery = parsedQuery as ComplexParsedQuery;
    if (complexQuery.relationships && complexQuery.relationships.length > 0) {
      const relationalResults = this.executeRelationalSearch(
        complexQuery,
        data
      );
      results.push(...relationalResults);
    } else {
      // Standard entity-based search
      if (parsedQuery.entityTypes.includes('client')) {
        const clientResults = this.searchClients(data.clients, parsedQuery);
        results.push(...clientResults);
      }

      if (parsedQuery.entityTypes.includes('worker')) {
        const workerResults = this.searchWorkers(data.workers, parsedQuery);
        results.push(...workerResults);
      }

      if (parsedQuery.entityTypes.includes('task')) {
        const taskResults = this.searchTasks(data.tasks, parsedQuery);
        results.push(...taskResults);
      }
    }

    return results;
  }

  /**
   * Execute relational searches that involve multiple entity types
   */
  private executeRelationalSearch(
    complexQuery: ComplexParsedQuery,
    data: { clients: Client[]; workers: Worker[]; tasks: Task[] }
  ): SearchResult[] {
    const results: SearchResult[] = [];

    complexQuery.relationships.forEach(relationship => {
      switch (relationship.relationship) {
        case 'has':
        case 'with':
          // Find entities that have a relationship with other entities
          results.push(
            ...this.searchWithRelationship(relationship, data, complexQuery)
          );
          break;

        case 'requires':
        case 'needs':
          // Find entities that require specific conditions
          results.push(
            ...this.searchRequiresRelationship(relationship, data, complexQuery)
          );
          break;

        case 'assigned_to':
        case 'works_on':
          // Find work assignments and allocations
          results.push(
            ...this.searchAssignmentRelationship(
              relationship,
              data,
              complexQuery
            )
          );
          break;

        default:
          console.warn(
            `Unsupported relationship type: ${relationship.relationship}`
          );
      }
    });

    return results;
  }

  /**
   * Search for entities that have a relationship with other entities
   * Example: "clients with JavaScript tasks"
   */
  private searchWithRelationship(
    relationship: RelationshipQuery,
    data: { clients: Client[]; workers: Worker[]; tasks: Task[] },
    _complexQuery: ComplexParsedQuery
  ): SearchResult[] {
    const results: SearchResult[] = [];

    if (
      relationship.sourceEntity === 'client' &&
      relationship.targetEntity === 'task'
    ) {
      // Find clients that have tasks matching the conditions
      data.clients.forEach(client => {
        const requestedTaskIds =
          client.RequestedTaskIDs?.split(',').map(id => id.trim()) || [];
        const matchingTasks = data.tasks.filter(task => {
          const isRequested = requestedTaskIds.includes(task.TaskID);
          const meetsConditions = relationship.conditions.every(condition =>
            this.matchesFilter(task, condition)
          );
          return isRequested && meetsConditions;
        });

        if (matchingTasks.length > 0) {
          const score = 20 + matchingTasks.length * 5; // Base score + bonus for multiple matches
          results.push({
            entity: client,
            entityType: 'client',
            score,
            confidence: 0.8,
            matchReasons: [
              `Has ${matchingTasks.length} matching task(s)`,
              ...relationship.conditions.map(
                c => `Task matches: ${c.field} ${c.operator} ${c.value}`
              ),
            ],
            highlights: [],
          });
        }
      });
    }

    if (
      relationship.sourceEntity === 'worker' &&
      relationship.targetEntity === 'task'
    ) {
      // Find workers who can do tasks matching the conditions
      data.workers.forEach(worker => {
        const workerSkills =
          worker.Skills?.toLowerCase()
            .split(',')
            .map(s => s.trim()) || [];
        const matchingTasks = data.tasks.filter(task => {
          const requiredSkills =
            task.RequiredSkills?.toLowerCase()
              .split(',')
              .map(s => s.trim()) || [];
          const hasRequiredSkills = requiredSkills.some(skill =>
            workerSkills.some(
              workerSkill =>
                workerSkill.includes(skill) || skill.includes(workerSkill)
            )
          );
          const meetsConditions = relationship.conditions.every(condition =>
            this.matchesFilter(task, condition)
          );
          return hasRequiredSkills && meetsConditions;
        });

        if (matchingTasks.length > 0) {
          const score = 20 + matchingTasks.length * 3;
          results.push({
            entity: worker,
            entityType: 'worker',
            score,
            confidence: 0.8,
            matchReasons: [
              `Can do ${matchingTasks.length} matching task(s)`,
              ...relationship.conditions.map(
                c => `Task matches: ${c.field} ${c.operator} ${c.value}`
              ),
            ],
            highlights: [],
          });
        }
      });
    }

    return results;
  }

  /**
   * Search for entities that require specific conditions
   */
  private searchRequiresRelationship(
    relationship: RelationshipQuery,
    data: { clients: Client[]; workers: Worker[]; tasks: Task[] },
    _complexQuery: ComplexParsedQuery
  ): SearchResult[] {
    const results: SearchResult[] = [];

    if (
      relationship.sourceEntity === 'task' &&
      relationship.targetEntity === 'worker'
    ) {
      // Find tasks that require specific worker skills
      data.tasks.forEach(task => {
        const meetsConditions = relationship.conditions.every(condition => {
          if (
            condition.field === 'Skills' ||
            condition.field === 'RequiredSkills'
          ) {
            return task.RequiredSkills?.toLowerCase().includes(
              condition.value.toString().toLowerCase()
            );
          }
          return this.matchesFilter(task, condition);
        });

        if (meetsConditions) {
          results.push({
            entity: task,
            entityType: 'task',
            score: 25,
            confidence: 0.8,
            matchReasons: [
              'Requires matching skills',
              ...relationship.conditions.map(c => `Requires: ${c.value}`),
            ],
            highlights: [],
          });
        }
      });
    }

    return results;
  }

  /**
   * Search for assignment relationships
   */
  private searchAssignmentRelationship(
    _relationship: RelationshipQuery,
    _data: { clients: Client[]; workers: Worker[]; tasks: Task[] },
    _complexQuery: ComplexParsedQuery
  ): SearchResult[] {
    // This would require additional data about assignments
    // For now, return empty array as assignments are not part of the current schema
    return [];
  }

  /**
   * Search clients with keyword and filter matching
   */
  private searchClients(
    clients: Client[],
    parsedQuery: ParsedQuery
  ): SearchResult[] {
    if (!clients || !Array.isArray(clients)) {
      console.warn('No clients provided for search');
      return [];
    }

    return clients
      .map(client => this.scoreClientMatch(client, parsedQuery))
      .filter(result => result.score > 0);
  }

  /**
   * Search workers with keyword and filter matching
   */
  private searchWorkers(
    workers: Worker[],
    parsedQuery: ParsedQuery
  ): SearchResult[] {
    if (!workers || !Array.isArray(workers)) {
      console.warn('No workers provided for search');
      return [];
    }

    return workers
      .map(worker => this.scoreWorkerMatch(worker, parsedQuery))
      .filter(result => result.score > 0);
  }

  /**
   * Search tasks with keyword and filter matching
   */
  private searchTasks(tasks: Task[], parsedQuery: ParsedQuery): SearchResult[] {
    if (!tasks || !Array.isArray(tasks)) {
      console.warn('No tasks provided for search');
      return [];
    }

    return tasks
      .map(task => this.scoreTaskMatch(task, parsedQuery))
      .filter(result => result.score > 0);
  }

  /**
   * Score how well a client matches the search query
   */
  private scoreClientMatch(
    client: Client,
    parsedQuery: ParsedQuery
  ): SearchResult {
    let score = 0;
    const matchReasons: string[] = [];
    const highlights: SearchHighlight[] = [];

    // Keyword matching
    const searchableText = [
      client.ClientName,
      client.ClientID,
      client.GroupTag,
      client.AttributesJSON,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    parsedQuery.keywords.forEach(keyword => {
      if (searchableText.includes(keyword.toLowerCase())) {
        score += 10;
        matchReasons.push(`Matches keyword: ${keyword}`);

        // Add highlights
        const index = searchableText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
          highlights.push({
            field: 'text',
            text: keyword,
            startIndex: index,
            endIndex: index + keyword.length,
          });
        }
      }
    });

    // Filter matching
    parsedQuery.filters.forEach(filter => {
      if (this.matchesFilter(client, filter)) {
        score += 20;
        matchReasons.push(
          `Matches filter: ${filter.field} ${filter.operator} ${filter.value}`
        );
      }
    });

    return {
      entity: client,
      entityType: 'client',
      score,
      confidence: Math.min(score / 30, 1), // Normalize to 0-1
      matchReasons,
      highlights,
    };
  }

  /**
   * Score how well a worker matches the search query
   */
  private scoreWorkerMatch(
    worker: Worker,
    parsedQuery: ParsedQuery
  ): SearchResult {
    let score = 0;
    const matchReasons: string[] = [];
    const highlights: SearchHighlight[] = [];

    // Enhanced keyword matching with partial matches and field-specific logic
    const searchableText = [
      worker.WorkerName,
      worker.WorkerID,
      worker.Skills,
      worker.WorkerGroup,
      worker.QualificationLevel.toString(),
      String(worker.AvailableSlots || ''), // Include AvailableSlots for "available" searches
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();


    parsedQuery.keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      // Exact match
      if (searchableText.includes(keywordLower)) {
        score += 10;
        matchReasons.push(`Matches keyword: ${keyword}`);
      }
      // Partial match for "available" -> "availableslots"
      else if (keywordLower === 'available' && searchableText.includes('available')) {
        score += 8;
        matchReasons.push(`Partial match: ${keyword} in AvailableSlots`);
      }
      // Entity type match - if searching for "workers" and this is a worker
      else if (['worker', 'workers', 'employee', 'employees'].includes(keywordLower)) {
        score += 15;
        matchReasons.push(`Entity type match: ${keyword}`);
      }
    });

    // Filter matching
    parsedQuery.filters.forEach(filter => {
      if (this.matchesFilter(worker, filter)) {
        score += 20;
        matchReasons.push(
          `Matches filter: ${filter.field} ${filter.operator} ${filter.value}`
        );
      }
    });

    return {
      entity: worker,
      entityType: 'worker',
      score,
      confidence: Math.min(score / 30, 1),
      matchReasons,
      highlights,
    };
  }

  /**
   * Score how well a task matches the search query
   */
  private scoreTaskMatch(task: Task, parsedQuery: ParsedQuery): SearchResult {
    let score = 0;
    const matchReasons: string[] = [];
    const highlights: SearchHighlight[] = [];

    // Keyword matching
    const searchableText = [
      task.TaskName,
      task.TaskID,
      task.Category,
      task.RequiredSkills,
      task.PreferredPhases,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    parsedQuery.keywords.forEach(keyword => {
      if (searchableText.includes(keyword.toLowerCase())) {
        score += 10;
        matchReasons.push(`Matches keyword: ${keyword}`);

        const index = searchableText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
          highlights.push({
            field: 'text',
            text: keyword,
            startIndex: index,
            endIndex: index + keyword.length,
          });
        }
      }
    });

    // Filter matching
    parsedQuery.filters.forEach(filter => {
      if (this.matchesFilter(task, filter)) {
        score += 20;
        matchReasons.push(
          `Matches filter: ${filter.field} ${filter.operator} ${filter.value}`
        );
      }
    });

    return {
      entity: task,
      entityType: 'task',
      score,
      confidence: Math.min(score / 30, 1),
      matchReasons,
      highlights,
    };
  }

  /**
   * Check if an entity matches a specific filter
   */
  private matchesFilter(entity: any, filter: SearchFilter): boolean {
    const value = entity[filter.field];
    if (value === undefined || value === null) return false;

    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'contains':
        return value
          .toString()
          .toLowerCase()
          .includes(filter.value.toString().toLowerCase());
      case 'gt':
        return Number(value) > Number(filter.value);
      case 'lt':
        return Number(value) < Number(filter.value);
      case 'gte':
        return Number(value) >= Number(filter.value);
      case 'lte':
        return Number(value) <= Number(filter.value);
      default:
        return false;
    }
  }

  /**
   * Rank and sort search results by relevance
   */
  private rankResults(
    results: SearchResult[],
    _parsedQuery: ParsedQuery
  ): SearchResult[] {
    return results.sort((a, b) => {
      // Primary sort by score
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      // Secondary sort by confidence
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }

      // Tertiary sort by number of match reasons
      return b.matchReasons.length - a.matchReasons.length;
    });
  }

  /**
   * Fallback keyword search when all else fails
   */
  private keywordFallbackSearch(
    query: string,
    data: { clients: Client[]; workers: Worker[]; tasks: Task[] },
    options: Partial<SearchQuery>
  ): SearchResult[] {
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);
    const results: SearchResult[] = [];
    

    // Enhanced keyword matching with entity type detection
    const searchEntities = (
      entities: any[],
      entityType: 'client' | 'worker' | 'task'
    ) => {
      if (!entities || !Array.isArray(entities)) {
        console.warn(`No ${entityType} entities provided for search`);
        return;
      }

      // Check if the query is asking for this entity type specifically
      const entityTypeKeywords = {
        worker: ['worker', 'workers', 'employee', 'employees', 'staff', 'developer', 'developers'],
        client: ['client', 'clients', 'customer', 'customers', 'company', 'companies'],
        task: ['task', 'tasks', 'job', 'jobs', 'project', 'projects', 'work']
      };
      
      const queryLower = query.toLowerCase();
      const isEntityTypeQuery = entityTypeKeywords[entityType]?.some(keyword => 
        queryLower.includes(keyword)
      );


      entities.forEach(entity => {
        let score = 0;
        const matchReasons: string[] = [];

        // If this is a general entity type query (like "available workers"), 
        // give all entities of this type a base score
        if (isEntityTypeQuery) {
          score += 5;
          matchReasons.push(`Entity type match: ${entityType}`);
        }

        keywords.forEach(keyword => {
          // Skip entity type keywords from detailed matching since we already handled them
          if (entityTypeKeywords[entityType]?.includes(keyword)) {
            return;
          }

          Object.values(entity).forEach(value => {
            if (value && value.toString().toLowerCase().includes(keyword)) {
              score += 2;
              matchReasons.push(`Keyword match: ${keyword}`);
            }
          });
        });

        if (score > 0) {
          results.push({
            entity,
            entityType,
            score,
            confidence: Math.min(score / Math.max(keywords.length, 1), 1),
            matchReasons,
            highlights: [],
          });
        }
      });
    };

    // Search all entity types unless restricted
    const entityTypes = options.entityTypes || ['client', 'worker', 'task'];

    if (entityTypes.includes('client')) {
      searchEntities(data.clients, 'client');
    }
    if (entityTypes.includes('worker')) {
      searchEntities(data.workers, 'worker');
    }
    if (entityTypes.includes('task')) {
      searchEntities(data.tasks, 'task');
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxResults);
  }

  /**
   * Add search to history for analytics and improvement
   */
  private addToHistory(query: string, results: SearchResult[]): void {
    this.searchHistory.push({
      query,
      results,
      timestamp: Date.now(),
    });

    // Keep only last 100 searches
    if (this.searchHistory.length > 100) {
      this.searchHistory = this.searchHistory.slice(-100);
    }
  }

  /**
   * Get search suggestions based on history and common patterns
   */
  getSuggestions(partial: string): string[] {
    const suggestions = [
      'high priority clients',
      'JavaScript developers',
      'senior workers',
      'React tasks',
      'available workers',
      'urgent tasks',
      'Python developers',
      'design tasks',
      'development tasks',
      'testing tasks',
    ];

    return suggestions
      .filter(suggestion =>
        suggestion.toLowerCase().includes(partial.toLowerCase())
      )
      .slice(0, 5);
  }

  /**
   * Get search analytics for performance monitoring
   */
  getAnalytics() {
    return {
      totalSearches: this.searchHistory.length,
      averageResults:
        this.searchHistory.reduce(
          (sum, search) => sum + search.results.length,
          0
        ) / this.searchHistory.length || 0,
      recentQueries: this.searchHistory.slice(-10).map(search => search.query),
      config: this.config,
    };
  }
}

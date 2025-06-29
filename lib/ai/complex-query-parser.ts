/**
 * Complex Query Parser for Natural Language Search
 * Handles sophisticated queries with multiple criteria and relationships
 * Examples: "high priority clients with JavaScript tasks in Q1"
 */

import { GeminiClient } from './gemini-client';
import { SearchFilter, ParsedQuery } from './natural-language-search';

export interface ComplexQueryComponent {
  type: 'entity' | 'attribute' | 'relationship' | 'temporal' | 'logical';
  value: string;
  entityType?: 'client' | 'worker' | 'task';
  field?: string;
  operator?: 'and' | 'or' | 'not' | 'with' | 'without';
  confidence: number;
}

export interface RelationshipQuery {
  sourceEntity: 'client' | 'worker' | 'task';
  targetEntity: 'client' | 'worker' | 'task';
  relationship:
    | 'has'
    | 'with'
    | 'requires'
    | 'needs'
    | 'assigned_to'
    | 'works_on'
    | 'requests'
    | 'without'
    | 'lacking';
  conditions: SearchFilter[];
}

export interface TemporalQuery {
  timeframe:
    | 'current'
    | 'past'
    | 'future'
    | 'Q1'
    | 'Q2'
    | 'Q3'
    | 'Q4'
    | 'month'
    | 'week';
  field: string;
  operator: 'in' | 'before' | 'after' | 'during';
}

export interface ComplexParsedQuery extends ParsedQuery {
  components: ComplexQueryComponent[];
  relationships: RelationshipQuery[];
  temporal: TemporalQuery[];
  logicalOperators: ('and' | 'or' | 'not')[];
  complexity: 'simple' | 'complex' | 'relational' | 'temporal';
}

export class ComplexQueryParser {
  private geminiClient: GeminiClient;

  // Pre-defined patterns for rule-based parsing
  private relationshipPatterns = {
    with: ['with', 'having', 'that have', 'who have'],
    without: ['without', 'lacking', 'not having', 'missing'],
    requires: ['requires', 'needs', 'requiring', 'needing'],
    assigned_to: ['assigned to', 'working on', 'allocated to'],
    works_on: ['works on', 'doing', 'handling'],
    requests: ['requests', 'wants', 'asking for'],
  };

  private temporalPatterns = {
    Q1: ['q1', 'quarter 1', 'first quarter', 'jan-mar'],
    Q2: ['q2', 'quarter 2', 'second quarter', 'apr-jun'],
    Q3: ['q3', 'quarter 3', 'third quarter', 'jul-sep'],
    Q4: ['q4', 'quarter 4', 'fourth quarter', 'oct-dec'],
    current: ['current', 'now', 'this month', 'today'],
    past: ['past', 'previous', 'last month', 'completed'],
    future: ['future', 'upcoming', 'next month', 'planned'],
  };

  private logicalPatterns = {
    and: ['and', '&', 'plus', 'also', 'along with'],
    or: ['or', '|', 'either', 'alternatively'],
    not: ['not', 'except', 'excluding', 'without'],
  };

  constructor() {
    this.geminiClient = new GeminiClient();
  }

  /**
   * Parse complex queries with multiple criteria and relationships
   */
  async parseComplexQuery(query: string): Promise<ComplexParsedQuery> {
    // Try AI parsing first for better accuracy
    if (this.geminiClient.isAvailable()) {
      try {
        const aiResult = await this.parseWithAI(query);
        if (aiResult.confidence >= 0.7) {
          return aiResult;
        }
      } catch (error) {
        console.warn('AI parsing failed, using rule-based parsing:', error);
      }
    }

    // Fallback to advanced rule-based parsing
    return this.parseWithAdvancedRules(query);
  }

  /**
   * AI-powered complex query parsing
   */
  private async parseWithAI(query: string): Promise<ComplexParsedQuery> {
    const prompt = `
Parse this complex search query for a resource allocation system.

Query: "${query}"

Entity Types:
- Client: ClientID, ClientName, PriorityLevel (1-5), RequestedTaskIDs, GroupTag, AttributesJSON
- Worker: WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup, QualificationLevel
- Task: TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent

Parse into components:
1. Query components (entity, attribute, relationship, temporal, logical)
2. Relationships between entities
3. Temporal constraints
4. Logical operators
5. Overall complexity level

Examples:
"high priority clients with JavaScript tasks" →
- Components: [entity: client, attribute: high priority, relationship: with, entity: task, attribute: JavaScript]
- Relationships: [client has task where RequiredSkills contains JavaScript]
- Complexity: relational

"senior workers without React skills in Q1" →
- Components: [entity: worker, attribute: senior, logical: without, attribute: React, temporal: Q1]
- Temporal: [timeframe: Q1, field: PreferredPhases, operator: in]
- Complexity: temporal

Return JSON with:
{
  "intent": "search",
  "entityTypes": ["client"],
  "keywords": ["high", "priority", "javascript"],
  "filters": [{"field": "PriorityLevel", "operator": "gte", "value": 4}],
  "components": [
    {"type": "entity", "value": "client", "entityType": "client", "confidence": 0.9},
    {"type": "attribute", "value": "high priority", "field": "PriorityLevel", "confidence": 0.8}
  ],
  "relationships": [
    {"sourceEntity": "client", "targetEntity": "task", "relationship": "has", "conditions": [{"field": "RequiredSkills", "operator": "contains", "value": "JavaScript"}]}
  ],
  "temporal": [],
  "logicalOperators": ["and"],
  "complexity": "relational",
  "confidence": 0.85
}`;

    const response = await this.geminiClient.generateText(prompt);
    console.log('AI Response:', response);

    try {
      const parsed = JSON.parse(response.content);
      return {
        ...parsed,
        originalQuery: query,
      };
    } catch {
      throw new Error(`Failed to parse AI response: ${response.content}`);
    }
  }

  /**
   * Advanced rule-based parsing for complex queries
   */
  private parseWithAdvancedRules(query: string): ComplexParsedQuery {
    const lowerQuery = query.toLowerCase();

    // Initialize result structure
    const result: ComplexParsedQuery = {
      intent: 'search',
      entityTypes: [],
      keywords: [],
      filters: [],
      components: [],
      relationships: [],
      temporal: [],
      logicalOperators: [],
      complexity: 'simple',
      confidence: 0.6,
      originalQuery: query,
    };

    // Step 1: Identify query components
    const words = lowerQuery.split(/\s+/);
    result.components = this.extractComponents(lowerQuery, words);

    // Step 2: Detect relationships
    result.relationships = this.extractRelationships(
      lowerQuery,
      result.components
    );

    // Step 3: Extract temporal constraints
    result.temporal = this.extractTemporal(lowerQuery);

    // Step 4: Identify logical operators
    result.logicalOperators = this.extractLogicalOperators(lowerQuery);

    // Step 5: Determine complexity
    result.complexity = this.determineComplexity(result);

    // Step 6: Extract entity types, keywords, and filters
    this.populateBasicFields(result);

    // Step 7: Calculate confidence based on matches
    result.confidence = this.calculateConfidence(result);

    return result;
  }

  /**
   * Extract query components (entities, attributes, etc.)
   */
  private extractComponents(
    query: string,
    _words: string[]
  ): ComplexQueryComponent[] {
    const components: ComplexQueryComponent[] = [];

    // Entity detection
    const entityMappings = {
      client: ['client', 'customer', 'company'],
      worker: ['worker', 'employee', 'developer', 'designer', 'engineer'],
      task: ['task', 'job', 'project', 'work', 'assignment'],
    };

    Object.entries(entityMappings).forEach(([entityType, keywords]) => {
      keywords.forEach(keyword => {
        if (query.includes(keyword)) {
          components.push({
            type: 'entity',
            value: keyword,
            entityType: entityType as 'client' | 'worker' | 'task',
            confidence: 0.8,
          });
        }
      });
    });

    // Attribute detection
    const attributePatterns = {
      priority: {
        high: ['high priority', 'urgent', 'critical', 'important'],
        low: ['low priority', 'minor', 'optional'],
      },
      qualification: {
        senior: ['senior', 'experienced', 'expert', 'lead'],
        junior: ['junior', 'beginner', 'entry-level', 'new'],
      },
      skills: {
        javascript: ['javascript', 'js', 'node.js', 'react', 'vue', 'angular'],
        python: ['python', 'django', 'flask'],
        design: ['design', 'ui', 'ux', 'figma', 'adobe'],
      },
    };

    Object.entries(attributePatterns).forEach(([category, patterns]) => {
      Object.entries(patterns).forEach(([value, keywords]) => {
        keywords.forEach(keyword => {
          if (query.includes(keyword)) {
            components.push({
              type: 'attribute',
              value: keyword,
              field: this.mapAttributeToField(category, value),
              confidence: 0.7,
            });
          }
        });
      });
    });

    return components;
  }

  /**
   * Extract relationships between entities
   */
  private extractRelationships(
    query: string,
    components: ComplexQueryComponent[]
  ): RelationshipQuery[] {
    const relationships: RelationshipQuery[] = [];
    const lowerQuery = query.toLowerCase();

    // Look for relationship patterns
    Object.entries(this.relationshipPatterns).forEach(
      ([relationship, patterns]) => {
        patterns.forEach(pattern => {
          if (lowerQuery.includes(pattern)) {
            // Determine entities based on context and relationship type
            const entities = components.filter(c => c.type === 'entity');
            const conditions = this.extractRelationshipConditions(
              query,
              components
            );

            if (entities.length >= 1) {
              // Determine source and target based on relationship context
              const rel = this.determineRelationshipEntities(
                relationship,
                entities,
                lowerQuery
              );
              if (rel) {
                relationships.push({
                  sourceEntity: rel.source,
                  targetEntity: rel.target,
                  relationship: relationship as any,
                  conditions,
                });
              }
            }
          }
        });
      }
    );

    return relationships;
  }

  /**
   * Determine source and target entities for relationships
   */
  private determineRelationshipEntities(
    relationship: string,
    entities: ComplexQueryComponent[],
    query: string
  ): {
    source: 'client' | 'worker' | 'task';
    target: 'client' | 'worker' | 'task';
  } | null {
    // Handle different relationship patterns
    switch (relationship) {
      case 'with':
      case 'having':
        if (query.includes('client') && query.includes('task')) {
          return { source: 'client', target: 'task' };
        }
        if (query.includes('worker') && query.includes('task')) {
          return { source: 'worker', target: 'task' };
        }
        if (query.includes('worker') && query.includes('skill')) {
          return { source: 'worker', target: 'task' };
        }
        break;

      case 'without':
      case 'lacking':
        if (query.includes('worker')) {
          return { source: 'worker', target: 'task' };
        }
        break;

      case 'requires':
      case 'requiring':
        if (query.includes('task')) {
          return { source: 'task', target: 'worker' };
        }
        break;
    }

    // Fallback: use first two entities found
    if (entities.length >= 2) {
      return {
        source: entities[0].entityType!,
        target: entities[1].entityType!,
      };
    }

    // Single entity relationships
    if (entities.length === 1) {
      const entityType = entities[0].entityType!;
      switch (relationship) {
        case 'with':
          return entityType === 'client'
            ? { source: 'client', target: 'task' }
            : { source: 'worker', target: 'task' };
        case 'requires':
          return { source: 'task', target: 'worker' };
        default:
          return {
            source: entityType,
            target: entityType === 'client' ? 'task' : 'worker',
          };
      }
    }

    return null;
  }

  /**
   * Extract temporal constraints
   */
  private extractTemporal(query: string): TemporalQuery[] {
    const temporal: TemporalQuery[] = [];

    Object.entries(this.temporalPatterns).forEach(([timeframe, patterns]) => {
      patterns.forEach(pattern => {
        if (query.includes(pattern)) {
          temporal.push({
            timeframe: timeframe as any,
            field: 'PreferredPhases', // Default field for temporal queries
            operator: 'in',
          });
        }
      });
    });

    return temporal;
  }

  /**
   * Extract logical operators
   */
  private extractLogicalOperators(query: string): ('and' | 'or' | 'not')[] {
    const operators: ('and' | 'or' | 'not')[] = [];

    Object.entries(this.logicalPatterns).forEach(([operator, patterns]) => {
      patterns.forEach(pattern => {
        if (query.includes(pattern)) {
          operators.push(operator as 'and' | 'or' | 'not');
        }
      });
    });

    return operators;
  }

  /**
   * Determine query complexity
   */
  private determineComplexity(
    result: ComplexParsedQuery
  ): 'simple' | 'complex' | 'relational' | 'temporal' {
    if (result.temporal.length > 0) return 'temporal';
    if (result.relationships.length > 0) return 'relational';
    if (result.components.length > 3 || result.logicalOperators.length > 0)
      return 'complex';
    return 'simple';
  }

  /**
   * Populate basic fields from components
   */
  private populateBasicFields(result: ComplexParsedQuery): void {
    // Extract entity types
    result.entityTypes = [
      ...new Set(
        result.components
          .filter(c => c.type === 'entity' && c.entityType)
          .map(c => c.entityType!)
      ),
    ];

    // Extract keywords
    result.keywords = result.components
      .filter(c => c.type === 'attribute')
      .map(c => c.value);

    // Convert components to filters
    result.filters = result.components
      .filter(c => c.type === 'attribute' && c.field)
      .map(c => this.componentToFilter(c))
      .filter(f => f !== null) as SearchFilter[];
  }

  /**
   * Calculate confidence based on successful matches
   */
  private calculateConfidence(result: ComplexParsedQuery): number {
    let confidence = 0.4; // Base confidence for rule-based parsing

    // Boost confidence for each recognized component
    confidence += result.components.length * 0.1;
    confidence += result.relationships.length * 0.2;
    confidence += result.temporal.length * 0.15;

    // Ensure confidence is between 0 and 1
    return Math.min(confidence, 1.0);
  }

  /**
   * Helper methods
   */
  private mapAttributeToField(category: string, value: string): string {
    const fieldMappings: Record<string, Record<string, string>> = {
      priority: {
        high: 'PriorityLevel',
        low: 'PriorityLevel',
      },
      qualification: {
        senior: 'QualificationLevel',
        junior: 'QualificationLevel',
      },
      skills: {
        javascript: 'Skills',
        python: 'Skills',
        design: 'Skills',
      },
    };

    return fieldMappings[category]?.[value] || category;
  }

  private extractRelationshipConditions(
    _query: string,
    components: ComplexQueryComponent[]
  ): SearchFilter[] {
    const conditions: SearchFilter[] = [];

    // Extract conditions from attribute components
    components
      .filter(c => c.type === 'attribute' && c.field)
      .forEach(component => {
        const filter = this.componentToFilter(component);
        if (filter) {
          conditions.push(filter);
        }
      });

    return conditions;
  }

  private componentToFilter(
    component: ComplexQueryComponent
  ): SearchFilter | null {
    if (!component.field) return null;

    // Map component values to filter values
    const valueMap: Record<string, any> = {
      'high priority': { field: 'PriorityLevel', operator: 'gte', value: 4 },
      'low priority': { field: 'PriorityLevel', operator: 'lte', value: 2 },
      senior: {
        field: 'QualificationLevel',
        operator: 'contains',
        value: 'Senior',
      },
      junior: {
        field: 'QualificationLevel',
        operator: 'contains',
        value: 'Junior',
      },
    };

    const mapping = valueMap[component.value];
    if (mapping) {
      return mapping;
    }

    // Default to contains for skill-based searches
    if (component.field === 'Skills') {
      return {
        field: 'Skills',
        operator: 'contains',
        value: component.value,
      };
    }

    return null;
  }
}

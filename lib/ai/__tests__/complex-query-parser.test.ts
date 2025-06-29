/**
 * Test suite for Complex Query Parser
 * Tests advanced query parsing capabilities for sophisticated search queries
 */

import { ComplexQueryParser } from '../complex-query-parser';

describe('ComplexQueryParser', () => {
  let parser: ComplexQueryParser;

  beforeEach(() => {
    parser = new ComplexQueryParser();
  });

  describe('Complex Query Detection and Parsing', () => {
    const complexQueries = [
      {
        query: 'high priority clients with JavaScript tasks',
        expectedComplexity: 'relational',
        expectedEntityTypes: ['client', 'task'],
        expectedRelationships: 1,
        description: 'Client-task relationship with skill filter'
      },
      {
        query: 'senior workers without React skills in Q1',
        expectedComplexity: 'temporal',
        expectedEntityTypes: ['worker'],
        expectedTemporal: 1,
        description: 'Worker qualification with negation and temporal constraint'
      },
      {
        query: 'urgent tasks requiring Python developers',
        expectedComplexity: 'relational',
        expectedEntityTypes: ['task', 'worker'],
        expectedRelationships: 1,
        description: 'Task-worker relationship with skill requirement'
      },
      {
        query: 'JavaScript developers and Python developers',
        expectedComplexity: 'complex',
        expectedEntityTypes: ['worker'],
        expectedLogicalOperators: ['and'],
        description: 'Multiple skill requirements with logical operator'
      },
      {
        query: 'enterprise clients with React tasks in Q2 and senior developers',
        expectedComplexity: 'temporal',
        expectedEntityTypes: ['client', 'task', 'worker'],
        expectedRelationships: 2,
        expectedTemporal: 1,
        description: 'Multi-entity query with temporal and relationship constraints'
      }
    ];

    complexQueries.forEach(testCase => {
      it(`should parse complex query: "${testCase.query}"`, async () => {
        const result = await parser.parseComplexQuery(testCase.query);

        expect(result.complexity).toBe(testCase.expectedComplexity);
        expect(result.entityTypes).toEqual(expect.arrayContaining(testCase.expectedEntityTypes));
        
        if (testCase.expectedRelationships) {
          expect(result.relationships).toHaveLength(testCase.expectedRelationships);
        }

        if (testCase.expectedTemporal) {
          expect(result.temporal).toHaveLength(testCase.expectedTemporal);
        }

        if (testCase.expectedLogicalOperators) {
          expect(result.logicalOperators).toEqual(expect.arrayContaining(testCase.expectedLogicalOperators));
        }

        // Confidence should be reasonable for complex queries
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.originalQuery).toBe(testCase.query);
      });
    });
  });

  describe('Relationship Extraction', () => {
    it('should extract "with" relationships correctly', async () => {
      const result = await parser.parseComplexQuery('clients with JavaScript tasks');
      
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].sourceEntity).toBe('client');
      expect(result.relationships[0].targetEntity).toBe('task');
      expect(result.relationships[0].relationship).toBe('with');
      expect(result.relationships[0].conditions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'Skills',
            operator: 'contains',
            value: 'javascript'
          })
        ])
      );
    });

    it('should extract "requires" relationships correctly', async () => {
      const result = await parser.parseComplexQuery('tasks requiring senior developers');
      
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].sourceEntity).toBe('task');
      expect(result.relationships[0].targetEntity).toBe('worker');
      expect(result.relationships[0].relationship).toBe('requires');
    });

    it('should extract "without" relationships correctly', async () => {
      const result = await parser.parseComplexQuery('workers without React skills');
      
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].relationship).toBe('without');
    });
  });

  describe('Temporal Constraint Extraction', () => {
    const temporalQueries = [
      { query: 'tasks in Q1', expectedTimeframe: 'Q1' },
      { query: 'workers in Q2', expectedTimeframe: 'Q2' },
      { query: 'current projects', expectedTimeframe: 'current' },
      { query: 'past assignments', expectedTimeframe: 'past' },
      { query: 'future tasks', expectedTimeframe: 'future' }
    ];

    temporalQueries.forEach(testCase => {
      it(`should extract temporal constraint from: "${testCase.query}"`, async () => {
        const result = await parser.parseComplexQuery(testCase.query);
        
        expect(result.temporal).toHaveLength(1);
        expect(result.temporal[0].timeframe).toBe(testCase.expectedTimeframe);
        expect(result.complexity).toBe('temporal');
      });
    });
  });

  describe('Component Extraction', () => {
    it('should extract entity components correctly', async () => {
      const result = await parser.parseComplexQuery('senior developers with React skills');
      
      const entityComponents = result.components.filter(c => c.type === 'entity');
      const attributeComponents = result.components.filter(c => c.type === 'attribute');

      expect(entityComponents).toHaveLength(1);
      expect(entityComponents[0].entityType).toBe('worker');
      
      expect(attributeComponents.length).toBeGreaterThan(0);
      expect(attributeComponents.some(c => c.value.includes('senior'))).toBe(true);
      expect(attributeComponents.some(c => c.value.includes('react'))).toBe(true);
    });

    it('should extract logical operators correctly', async () => {
      const result = await parser.parseComplexQuery('JavaScript and React developers');
      
      expect(result.logicalOperators).toContain('and');
      expect(result.complexity).toBe('complex');
    });
  });

  describe('Filter Generation', () => {
    it('should generate priority filters correctly', async () => {
      const result = await parser.parseComplexQuery('high priority clients');
      
      expect(result.filters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'PriorityLevel',
            operator: 'gte',
            value: 4
          })
        ])
      );
    });

    it('should generate qualification filters correctly', async () => {
      const result = await parser.parseComplexQuery('senior workers');
      
      expect(result.filters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'QualificationLevel',
            operator: 'contains',
            value: 'Senior'
          })
        ])
      );
    });

    it('should generate skill filters correctly', async () => {
      const result = await parser.parseComplexQuery('JavaScript developers');
      
      expect(result.filters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'Skills',
            operator: 'contains',
            value: 'javascript'
          })
        ])
      );
    });
  });

  describe('Confidence Scoring', () => {
    it('should assign higher confidence to queries with more recognized patterns', async () => {
      const simpleResult = await parser.parseComplexQuery('workers');
      const complexResult = await parser.parseComplexQuery('senior JavaScript developers with React skills in Q1');
      
      expect(complexResult.confidence).toBeGreaterThan(simpleResult.confidence);
    });

    it('should have reasonable confidence bounds', async () => {
      const result = await parser.parseComplexQuery('high priority clients with JavaScript tasks');
      
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty queries gracefully', async () => {
      const result = await parser.parseComplexQuery('');
      
      expect(result.complexity).toBe('simple');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle queries with special characters', async () => {
      const result = await parser.parseComplexQuery('workers with Node.js skills');
      
      expect(result.components.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'high priority enterprise clients with React and TypeScript tasks requiring senior developers with more than 5 years experience in Q1 and Q2';
      const result = await parser.parseComplexQuery(longQuery);
      
      expect(result.complexity).toBe('temporal');
      expect(result.components.length).toBeGreaterThan(5);
    });

    it('should handle queries with no recognizable patterns', async () => {
      const result = await parser.parseComplexQuery('asdfgh qwerty');
      
      expect(result.complexity).toBe('simple');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Performance', () => {
    it('should parse complex queries within reasonable time', async () => {
      const startTime = Date.now();
      await parser.parseComplexQuery('high priority clients with JavaScript tasks requiring senior developers in Q1');
      const duration = Date.now() - startTime;
      
      // Should complete within 500ms for local parsing (without AI)
      expect(duration).toBeLessThan(500);
    });

    it('should handle multiple concurrent parsing requests', async () => {
      const queries = [
        'high priority clients',
        'senior developers with React',
        'JavaScript tasks in Q1',
        'workers without Python skills'
      ];

      const startTime = Date.now();
      const results = await Promise.all(
        queries.map(query => parser.parseComplexQuery(query))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.confidence).toBeGreaterThan(0);
      });
      
      // Should handle 4 concurrent requests within 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Integration with Search Engine', () => {
    it('should produce results compatible with search engine', async () => {
      const result = await parser.parseComplexQuery('high priority clients with JavaScript tasks');
      
      // Check that the result has all required fields for ParsedQuery interface
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('entityTypes');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('filters');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('originalQuery');
      
      // Check additional complex query fields
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('relationships');
      expect(result).toHaveProperty('temporal');
      expect(result).toHaveProperty('logicalOperators');
      expect(result).toHaveProperty('complexity');
      
      // Validate data types
      expect(Array.isArray(result.entityTypes)).toBe(true);
      expect(Array.isArray(result.keywords)).toBe(true);
      expect(Array.isArray(result.filters)).toBe(true);
      expect(Array.isArray(result.components)).toBe(true);
      expect(Array.isArray(result.relationships)).toBe(true);
      expect(Array.isArray(result.temporal)).toBe(true);
      expect(Array.isArray(result.logicalOperators)).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.originalQuery).toBe('string');
    });
  });
});
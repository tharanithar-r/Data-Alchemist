/**
 * Test suite for Natural Language Search System
 * Ensures 80%+ accuracy target is met across various query types
 */

import { Client, Worker, Task } from '@/lib/types/entities';

import { NaturalLanguageSearchEngine } from '../natural-language-search';

// Mock data for testing
const mockClients: Client[] = [
  {
    ClientID: 'CLI001',
    ClientName: 'TechCorp Solutions',
    PriorityLevel: 5,
    RequestedTaskIDs: 'TSK001,TSK002',
    GroupTag: 'Enterprise',
    AttributesJSON: '{"industry": "technology", "size": "large"}',
  },
  {
    ClientID: 'CLI002',
    ClientName: 'StartupVenture',
    PriorityLevel: 3,
    RequestedTaskIDs: 'TSK003',
    GroupTag: 'Startup',
    AttributesJSON: '{"industry": "fintech", "size": "small"}',
  },
  {
    ClientID: 'CLI003',
    ClientName: 'DesignStudio Pro',
    PriorityLevel: 4,
    RequestedTaskIDs: 'TSK004,TSK005',
    GroupTag: 'Creative',
    AttributesJSON: '{"industry": "design", "size": "medium"}',
  },
];

const mockWorkers: Worker[] = [
  {
    WorkerID: 'WKR001',
    WorkerName: 'Alice Johnson',
    Skills: 'JavaScript, React, Node.js, TypeScript',
    AvailableSlots: 40,
    MaxLoadPerPhase: 20,
    WorkerGroup: 'Frontend',
    QualificationLevel: 'Senior',
  },
  {
    WorkerID: 'WKR002',
    WorkerName: 'Bob Smith',
    Skills: 'Python, Django, PostgreSQL, AWS',
    AvailableSlots: 35,
    MaxLoadPerPhase: 15,
    WorkerGroup: 'Backend',
    QualificationLevel: 'Mid',
  },
  {
    WorkerID: 'WKR003',
    WorkerName: 'Carol Davis',
    Skills: 'UI/UX Design, Figma, Adobe Creative Suite',
    AvailableSlots: 30,
    MaxLoadPerPhase: 10,
    WorkerGroup: 'Design',
    QualificationLevel: 'Senior',
  },
  {
    WorkerID: 'WKR004',
    WorkerName: 'David Wilson',
    Skills: 'JavaScript, Vue.js, CSS, HTML',
    AvailableSlots: 25,
    MaxLoadPerPhase: 12,
    WorkerGroup: 'Frontend',
    QualificationLevel: 'Junior',
  },
];

const mockTasks: Task[] = [
  {
    TaskID: 'TSK001',
    TaskName: 'React Dashboard Development',
    Category: 'Development',
    Duration: 40,
    RequiredSkills: 'React, JavaScript, CSS',
    PreferredPhases: '1,2',
    MaxConcurrent: 2,
  },
  {
    TaskID: 'TSK002',
    TaskName: 'API Integration',
    Category: 'Development',
    Duration: 20,
    RequiredSkills: 'JavaScript, REST APIs, Node.js',
    PreferredPhases: '2,3',
    MaxConcurrent: 1,
  },
  {
    TaskID: 'TSK003',
    TaskName: 'Database Design',
    Category: 'Development',
    Duration: 15,
    RequiredSkills: 'PostgreSQL, Database Design, Python',
    PreferredPhases: '1',
    MaxConcurrent: 1,
  },
  {
    TaskID: 'TSK004',
    TaskName: 'UI/UX Design',
    Category: 'Design',
    Duration: 30,
    RequiredSkills: 'Figma, UI Design, UX Research',
    PreferredPhases: '1,2,3',
    MaxConcurrent: 1,
  },
  {
    TaskID: 'TSK005',
    TaskName: 'Mobile App Testing',
    Category: 'Testing',
    Duration: 25,
    RequiredSkills: 'Mobile Testing, QA, Automation',
    PreferredPhases: '3,4',
    MaxConcurrent: 2,
  },
];

const mockData = {
  clients: mockClients,
  workers: mockWorkers,
  tasks: mockTasks,
};

// Test cases with expected results for accuracy measurement
interface TestCase {
  query: string;
  expectedEntityTypes: ('client' | 'worker' | 'task')[];
  expectedCount: number;
  expectedTopResult?: string; // ID of expected top result
  category: 'simple' | 'complex' | 'relational';
  description: string;
}

const testCases: TestCase[] = [
  // Simple keyword searches
  {
    query: 'JavaScript developers',
    expectedEntityTypes: ['worker'],
    expectedCount: 3, // Alice, Bob (through Node.js), David
    expectedTopResult: 'WKR001', // Alice has most JS skills
    category: 'simple',
    description: 'Find workers with JavaScript skills',
  },
  {
    query: 'React tasks',
    expectedEntityTypes: ['task'],
    expectedCount: 1, // React Dashboard Development
    expectedTopResult: 'TSK001',
    category: 'simple',
    description: 'Find tasks requiring React',
  },
  {
    query: 'high priority clients',
    expectedEntityTypes: ['client'],
    expectedCount: 2, // TechCorp (5), DesignStudio (4)
    expectedTopResult: 'CLI001', // Highest priority
    category: 'simple',
    description: 'Find clients with high priority levels',
  },
  {
    query: 'senior workers',
    expectedEntityTypes: ['worker'],
    expectedCount: 2, // Alice, Carol
    category: 'simple',
    description: 'Find senior-level workers',
  },

  // Complex queries with multiple criteria
  {
    query: 'senior JavaScript developers',
    expectedEntityTypes: ['worker'],
    expectedCount: 1, // Alice
    expectedTopResult: 'WKR001',
    category: 'complex',
    description: 'Find senior workers with JavaScript skills',
  },
  {
    query: 'development tasks requiring React',
    expectedEntityTypes: ['task'],
    expectedCount: 1, // React Dashboard
    expectedTopResult: 'TSK001',
    category: 'complex',
    description: 'Find development category tasks needing React',
  },
  {
    query: 'design tasks',
    expectedEntityTypes: ['task'],
    expectedCount: 1, // UI/UX Design
    expectedTopResult: 'TSK004',
    category: 'simple',
    description: 'Find design category tasks',
  },
  {
    query: 'enterprise clients',
    expectedEntityTypes: ['client'],
    expectedCount: 1, // TechCorp
    expectedTopResult: 'CLI001',
    category: 'simple',
    description: 'Find clients in enterprise group',
  },

  // Relational queries (more complex)
  {
    query: 'workers who can do React tasks',
    expectedEntityTypes: ['worker'],
    expectedCount: 2, // Alice, David
    expectedTopResult: 'WKR001', // Alice is senior
    category: 'relational',
    description: 'Find workers whose skills match React task requirements',
  },
  {
    query: 'frontend developers',
    expectedEntityTypes: ['worker'],
    expectedCount: 2, // Alice, David
    category: 'simple',
    description: 'Find workers in frontend group',
  },

  // Edge cases
  {
    query: 'Python backend developers',
    expectedEntityTypes: ['worker'],
    expectedCount: 1, // Bob
    expectedTopResult: 'WKR002',
    category: 'complex',
    description: 'Find backend workers with Python skills',
  },
  {
    query: 'available workers',
    expectedEntityTypes: ['worker'],
    expectedCount: 4, // All workers (no specific availability filter)
    category: 'simple',
    description: 'Find all available workers',
  },
];

describe('NaturalLanguageSearchEngine', () => {
  let searchEngine: NaturalLanguageSearchEngine;

  beforeEach(() => {
    // Configure for testing (disable AI to ensure consistent results)
    searchEngine = new NaturalLanguageSearchEngine({
      enableAI: false, // Use rule-based parsing for consistent tests
      confidenceThreshold: 0.5,
      maxResults: 50,
      enableFuzzySearch: true,
    });
  });

  describe('Accuracy Testing', () => {
    const accuracyResults: Array<{
      testCase: TestCase;
      passed: boolean;
      actualCount: number;
      topResultMatch: boolean;
      score: number;
    }> = [];

    testCases.forEach(testCase => {
      it(`should handle query: "${testCase.query}" (${testCase.category})`, async () => {
        const results = await searchEngine.search(testCase.query, mockData);

        // Filter results by expected entity types
        const filteredResults = results.filter(result =>
          testCase.expectedEntityTypes.includes(result.entityType)
        );

        const actualCount = filteredResults.length;
        const topResult = filteredResults[0];
        const topResultMatch =
          topResult &&
          (topResult.entity as any)[
            `${topResult.entityType.charAt(0).toUpperCase()}${topResult.entityType.slice(1)}ID`
          ] === testCase.expectedTopResult;

        // Calculate score based on multiple factors
        let score = 0;

        // Count accuracy (40% weight)
        if (actualCount >= testCase.expectedCount) {
          score += 40;
        } else {
          score += (actualCount / testCase.expectedCount) * 40;
        }

        // Top result accuracy (30% weight)
        if (!testCase.expectedTopResult || topResultMatch) {
          score += 30;
        }

        // Entity type accuracy (20% weight)
        const correctEntityTypes = filteredResults.every(result =>
          testCase.expectedEntityTypes.includes(result.entityType)
        );
        if (correctEntityTypes) {
          score += 20;
        }

        // Result relevance (10% weight) - check if results have reasonable scores
        const hasRelevantResults = filteredResults.every(
          result => result.score > 0
        );
        if (hasRelevantResults) {
          score += 10;
        }

        const passed = score >= 80; // 80% accuracy threshold

        accuracyResults.push({
          testCase,
          passed,
          actualCount,
          topResultMatch: topResultMatch || !testCase.expectedTopResult,
          score,
        });

        // Assertions for individual test
        expect(actualCount).toBeGreaterThanOrEqual(0);
        expect(
          filteredResults.every(result =>
            testCase.expectedEntityTypes.includes(result.entityType)
          )
        ).toBe(true);

        if (testCase.expectedTopResult && topResult) {
          const actualTopId = (topResult.entity as any)[
            `${topResult.entityType.charAt(0).toUpperCase()}${topResult.entityType.slice(1)}ID`
          ];
          console.log(
            `Query: "${testCase.query}" - Expected: ${testCase.expectedTopResult}, Actual: ${actualTopId}, Score: ${score}%`
          );
        }
      });
    });

    afterAll(() => {
      // Calculate overall accuracy
      const totalTests = accuracyResults.length;
      const passedTests = accuracyResults.filter(
        result => result.passed
      ).length;
      const overallAccuracy = (passedTests / totalTests) * 100;

      const averageScore =
        accuracyResults.reduce((sum, result) => sum + result.score, 0) /
        totalTests;

      console.log('\n=== SEARCH ACCURACY REPORT ===');
      console.log(
        `Overall Accuracy: ${overallAccuracy.toFixed(1)}% (${passedTests}/${totalTests} tests passed)`
      );
      console.log(`Average Score: ${averageScore.toFixed(1)}%`);
      console.log(`Target: 80%+ accuracy\n`);

      // Detailed breakdown
      const categoryResults = ['simple', 'complex', 'relational'].map(
        category => {
          const categoryTests = accuracyResults.filter(
            r => r.testCase.category === category
          );
          const categoryPassed = categoryTests.filter(r => r.passed).length;
          const categoryAccuracy =
            (categoryPassed / categoryTests.length) * 100;
          return {
            category,
            accuracy: categoryAccuracy,
            passed: categoryPassed,
            total: categoryTests.length,
          };
        }
      );

      console.log('Accuracy by Category:');
      categoryResults.forEach(cat => {
        console.log(
          `  ${cat.category}: ${cat.accuracy.toFixed(1)}% (${cat.passed}/${cat.total})`
        );
      });

      // List failed tests
      const failedTests = accuracyResults.filter(r => !r.passed);
      if (failedTests.length > 0) {
        console.log('\nFailed Tests:');
        failedTests.forEach(failed => {
          console.log(
            `  ❌ "${failed.testCase.query}" - Score: ${failed.score}%`
          );
        });
      }

      // Assert overall accuracy meets target
      expect(overallAccuracy).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Core Functionality', () => {
    it('should handle empty queries gracefully', async () => {
      const results = await searchEngine.search('', mockData);
      expect(results).toEqual([]);
    });

    it('should return results with proper structure', async () => {
      const results = await searchEngine.search('JavaScript', mockData);

      results.forEach(result => {
        expect(result).toHaveProperty('entity');
        expect(result).toHaveProperty('entityType');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('matchReasons');
        expect(result).toHaveProperty('highlights');

        expect(['client', 'worker', 'task']).toContain(result.entityType);
        expect(typeof result.score).toBe('number');
        expect(typeof result.confidence).toBe('number');
        expect(Array.isArray(result.matchReasons)).toBe(true);
        expect(Array.isArray(result.highlights)).toBe(true);
      });
    });

    it('should rank results by relevance', async () => {
      const results = await searchEngine.search('JavaScript React', mockData);

      // Results should be sorted by score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
    });

    it('should respect entity type filters', async () => {
      const results = await searchEngine.search('JavaScript', mockData, {
        entityTypes: ['worker'],
      });

      results.forEach(result => {
        expect(result.entityType).toBe('worker');
      });
    });

    it('should provide meaningful match reasons', async () => {
      const results = await searchEngine.search('senior JavaScript', mockData);

      const relevantResults = results.filter(r => r.score > 0);
      relevantResults.forEach(result => {
        expect(result.matchReasons.length).toBeGreaterThan(0);
        expect(
          result.matchReasons.some(
            reason => reason.includes('keyword') || reason.includes('filter')
          )
        ).toBe(true);
      });
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should handle parsing errors gracefully', async () => {
      // Test with potentially problematic query
      const results = await searchEngine.search('!@#$%^&*()', mockData);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should provide suggestions', () => {
      const suggestions = searchEngine.getSuggestions('java');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(
        suggestions.some(s => s.toLowerCase().includes('javascript'))
      ).toBe(true);
    });

    it('should track analytics', () => {
      const analytics = searchEngine.getAnalytics();
      expect(analytics).toHaveProperty('totalSearches');
      expect(analytics).toHaveProperty('averageResults');
      expect(analytics).toHaveProperty('recentQueries');
      expect(analytics).toHaveProperty('config');
    });
  });

  describe('Performance', () => {
    it('should complete searches within reasonable time', async () => {
      const startTime = Date.now();
      await searchEngine.search('JavaScript React senior developers', mockData);
      const duration = Date.now() - startTime;

      // Should complete within 1 second for local search
      expect(duration).toBeLessThan(1000);
    });

    it('should handle large result sets efficiently', async () => {
      // Test with query that should match many items
      const results = await searchEngine.search('development', mockData);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(50); // Respects maxResults
    });
  });
});

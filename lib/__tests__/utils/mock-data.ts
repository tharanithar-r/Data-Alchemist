// Mock data for testing Data Alchemist components

export const mockClients = [
  {
    ClientID: 'C001',
    ClientName: 'Acme Corp',
    PriorityLevel: 5,
    RequestedTaskIDs: 'T001,T002',
    GroupTag: 'enterprise',
    AttributesJSON: '{"industry": "tech", "size": "large"}'
  },
  {
    ClientID: 'C002',
    ClientName: 'Small Business Inc',
    PriorityLevel: 3,
    RequestedTaskIDs: 'T003',
    GroupTag: 'small-business',
    AttributesJSON: '{"industry": "retail", "size": "small"}'
  }
]

export const mockWorkers = [
  {
    WorkerID: 'W001',
    WorkerName: 'John Doe',
    Skills: 'JavaScript,React,TypeScript',
    AvailableSlots: '[1,2,3]',
    MaxLoadPerPhase: 3,
    WorkerGroup: 'frontend',
    QualificationLevel: 'senior'
  },
  {
    WorkerID: 'W002',
    WorkerName: 'Jane Smith',
    Skills: 'Python,Django,PostgreSQL',
    AvailableSlots: '[2,3,4]',
    MaxLoadPerPhase: 2,
    WorkerGroup: 'backend',
    QualificationLevel: 'mid'
  }
]

export const mockTasks = [
  {
    TaskID: 'T001',
    TaskName: 'Frontend Development',
    Category: 'development',
    Duration: 2,
    RequiredSkills: 'JavaScript,React',
    PreferredPhases: '[1,2]',
    MaxConcurrent: 2
  },
  {
    TaskID: 'T002',
    TaskName: 'Backend API',
    Category: 'development',
    Duration: 3,
    RequiredSkills: 'Python,Django',
    PreferredPhases: '2-4',
    MaxConcurrent: 1
  },
  {
    TaskID: 'T003',
    TaskName: 'Database Design',
    Category: 'architecture',
    Duration: 1,
    RequiredSkills: 'PostgreSQL',
    PreferredPhases: '[1]',
    MaxConcurrent: 1
  }
]

// CSV data as strings for file upload testing
export const mockClientsCSV = `ClientID,ClientName,PriorityLevel,RequestedTaskIDs,GroupTag,AttributesJSON
C001,Acme Corp,5,"T001,T002",enterprise,"{""industry"": ""tech"", ""size"": ""large""}"
C002,Small Business Inc,3,T003,small-business,"{""industry"": ""retail"", ""size"": ""small""}"`

export const mockWorkersCSV = `WorkerID,WorkerName,Skills,AvailableSlots,MaxLoadPerPhase,WorkerGroup,QualificationLevel
W001,John Doe,"JavaScript,React,TypeScript","[1,2,3]",3,frontend,senior
W002,Jane Smith,"Python,Django,PostgreSQL","[2,3,4]",2,backend,mid`

export const mockTasksCSV = `TaskID,TaskName,Category,Duration,RequiredSkills,PreferredPhases,MaxConcurrent
T001,Frontend Development,development,2,"JavaScript,React","[1,2]",2
T002,Backend API,development,3,"Python,Django",2-4,1
T003,Database Design,architecture,1,PostgreSQL,"[1]",1`

// Mock validation errors for testing
export const mockValidationErrors = [
  {
    id: 'error-1',
    type: 'missing-column',
    severity: 'error' as const,
    entity: 'clients',
    field: 'ClientID',
    message: 'Missing required column: ClientID',
    row: null,
    suggestion: 'Add ClientID column to your CSV file'
  },
  {
    id: 'error-2',
    type: 'duplicate-id',
    severity: 'error' as const,
    entity: 'workers',
    field: 'WorkerID',
    message: 'Duplicate WorkerID found: W001',
    row: 3,
    suggestion: 'Ensure all WorkerIDs are unique'
  },
  {
    id: 'warning-1',
    type: 'malformed-json',
    severity: 'warning' as const,
    entity: 'clients',
    field: 'AttributesJSON',
    message: 'Invalid JSON format in AttributesJSON',
    row: 2,
    suggestion: 'Check JSON syntax in AttributesJSON field'
  }
]

// Mock file objects for testing file upload
export const createMockFile = (
  content: string,
  filename: string,
  type = 'text/csv'
): File => {
  return new File([content], filename, { type })
}

// Mock Gemini AI responses for testing
export const mockAIResponses = {
  naturalLanguageSearch: {
    query: 'high priority clients with JavaScript tasks',
    confidence: 0.95,
    results: [
      { entity: 'clients', id: 'C001', relevance: 0.9 }
    ]
  },
  ruleGeneration: {
    input: 'Tasks T001 and T002 must run together',
    confidence: 0.85,
    rule: {
      type: 'coRun',
      tasks: ['T001', 'T002']
    }
  },
  errorCorrection: {
    error: mockValidationErrors[0],
    suggestions: [
      { action: 'add-column', column: 'ClientID', confidence: 0.9 },
      { action: 'rename-column', from: 'Client_ID', to: 'ClientID', confidence: 0.7 }
    ]
  }
}
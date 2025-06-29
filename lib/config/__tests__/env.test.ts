/**
 * @jest-environment node
 */

describe('Environment Configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should validate required environment variables', async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key'
    
    const { env, geminiConfig, appConfig } = await import('../env')
    
    expect(env.GOOGLE_GEMINI_API_KEY).toBe('test-api-key')
    expect(geminiConfig.apiKey).toBe('test-api-key')
    expect(appConfig.name).toBe('Data Alchemist')
  })

  it('should throw error when required variables are missing', async () => {
    delete process.env.GOOGLE_GEMINI_API_KEY
    
    await expect(async () => {
      await import('../env')
    }).rejects.toThrow('Environment validation failed')
  })

  it('should use default values for optional variables', async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key'
    
    const { env, geminiConfig } = await import('../env')
    
    expect(env.GEMINI_MAX_REQUESTS_PER_MINUTE).toBe(15)
    expect(geminiConfig.maxRequestsPerMinute).toBe(15)
  })

  it('should parse numeric environment variables correctly', async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key'
    process.env.GEMINI_MAX_REQUESTS_PER_MINUTE = '30'
    process.env.GEMINI_MAX_TOKENS_PER_REQUEST = '500000'
    
    const { geminiConfig } = await import('../env')
    
    expect(geminiConfig.maxRequestsPerMinute).toBe(30)
    expect(geminiConfig.maxTokensPerRequest).toBe(500000)
  })

  it('should validate NODE_ENV values', async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key'
    ;(process.env as any).NODE_ENV = 'production'
    
    const { appConfig } = await import('../env')
    
    expect(appConfig.isProduction).toBe(true)
    expect(appConfig.isDevelopment).toBe(false)
  })

  it('should validate API endpoint URL format', async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key'
    process.env.GEMINI_API_ENDPOINT = 'invalid-url'
    
    await expect(async () => {
      await import('../env')
    }).rejects.toThrow('Environment validation failed')
  })
})
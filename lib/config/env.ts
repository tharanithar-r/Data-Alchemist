import { z } from 'zod';

// Load environment variables from .env file when on server-side
if (typeof window === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
}

// Environment variable schema
const envSchema = z.object({
  // Google Gemini API (server-side only for security)
  GOOGLE_GEMINI_API_KEY: z.string().optional(),

  // Application config
  NEXT_PUBLIC_APP_NAME: z.string().default('Data Alchemist'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('0.1.0'),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Optional configuration
  GEMINI_API_ENDPOINT: z.string().url().optional(),
  GEMINI_MAX_REQUESTS_PER_MINUTE: z.coerce.number().min(1).max(60).default(15),
  GEMINI_MAX_TOKENS_PER_REQUEST: z.coerce.number().min(1000).default(1000000),
});

// Validate environment variables
function validateEnv() {
  try {
    const result = envSchema.parse(process.env);
    return result;
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Export individual config objects for easier imports
const apiKey = env.GOOGLE_GEMINI_API_KEY || null;
const isValidApiKey =
  apiKey && typeof apiKey === 'string' && apiKey.length > 10;

export const geminiConfig = {
  apiKey,
  endpoint:
    env.GEMINI_API_ENDPOINT ||
    'https://generativelanguage.googleapis.com/v1beta/models',
  maxRequestsPerMinute: env.GEMINI_MAX_REQUESTS_PER_MINUTE,
  maxTokensPerRequest: env.GEMINI_MAX_TOKENS_PER_REQUEST,
  isEnabled: !!isValidApiKey,
} as const;

export const appConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  version: env.NEXT_PUBLIC_APP_VERSION,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
} as const;

// Type exports for better developer experience
export type Env = z.infer<typeof envSchema>;
export type GeminiConfig = typeof geminiConfig;
export type AppConfig = typeof appConfig;

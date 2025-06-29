import { NextRequest, NextResponse } from 'next/server'

import { NaturalLanguageSearchEngine } from '@/lib/ai/natural-language-search'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, entities, options } = body
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Create search engine on server-side where API key is available
    const searchEngine = new NaturalLanguageSearchEngine()
    
    // Execute search with provided data and options
    const results = await searchEngine.search(query, entities || {}, options || {})
    
    return NextResponse.json(results)
  } catch (error) {
    console.error('API Error in /api/ai/search:', error)
    return NextResponse.json(
      { error: 'Failed to process search query', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    )
  }
}
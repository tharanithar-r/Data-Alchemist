import { NextRequest, NextResponse } from 'next/server'

import { NaturalLanguageSearchEngine } from '@/lib/ai/natural-language-search'

export async function POST(request: NextRequest) {
  console.log('🔍 API /api/ai/search called');
  
  try {
    const body = await request.json()
    console.log('📝 Request body:', JSON.stringify(body, null, 2));
    
    const { query, entities, options } = body
    
    if (!query || typeof query !== 'string') {
      console.log('❌ Invalid query:', query);
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    console.log('🤖 Creating search engine...');
    // Create search engine on server-side where API key is available
    const searchEngine = new NaturalLanguageSearchEngine()
    
    console.log('🔍 Executing search...');
    // Execute search with provided data and options
    const results = await searchEngine.search(query, entities || {}, options || {})
    
    console.log(`✅ Search completed: ${results.length} results`);
    return NextResponse.json(results)
  } catch (error) {
    console.error('❌ API Error in /api/ai/search:', error)
    return NextResponse.json(
      { error: 'Failed to process search query', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    )
  }
}
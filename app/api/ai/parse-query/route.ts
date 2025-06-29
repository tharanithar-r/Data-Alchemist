import { NextRequest, NextResponse } from 'next/server'

import { ComplexQueryParser } from '@/lib/ai/complex-query-parser'

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const parser = new ComplexQueryParser()
    const result = await parser.parseComplexQuery(query)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('API Error in /api/ai/parse-query:', error)
    return NextResponse.json(
      { error: 'Failed to parse complex query' }, 
      { status: 500 }
    )
  }
}
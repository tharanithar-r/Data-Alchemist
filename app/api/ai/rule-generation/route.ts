import { NextRequest, NextResponse } from 'next/server'

import { generateRuleFromNaturalLanguage } from '@/lib/ai/rule-generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userInput, availableData } = body
    
    if (!userInput || typeof userInput !== 'string') {
      return NextResponse.json({ error: 'User input is required' }, { status: 400 })
    }

    if (!availableData) {
      return NextResponse.json({ error: 'Available data is required' }, { status: 400 })
    }

    // Generate rule on server-side where API key is available
    const result = await generateRuleFromNaturalLanguage(userInput, availableData)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('API Error in /api/ai/rule-generation:', error)
    return NextResponse.json(
      { error: 'Failed to generate rule', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    )
  }
}
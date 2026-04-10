import { NextRequest, NextResponse } from 'next/server'
import { getExperiments, createExperiment } from '@/lib/supabase'

export async function GET() {
  try {
    const experiments = await getExperiments()
    return NextResponse.json(experiments)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const experiment = await createExperiment(body)
    return NextResponse.json(experiment)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

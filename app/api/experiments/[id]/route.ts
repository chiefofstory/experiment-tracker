import { NextRequest, NextResponse } from 'next/server'
import { getExperiment, updateExperiment } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const experiment = await getExperiment(id)
    return NextResponse.json(experiment)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const experiment = await updateExperiment(id, body)
    return NextResponse.json(experiment)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

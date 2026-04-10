import { NextRequest, NextResponse } from 'next/server'
import { addMeasurement } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const measurement = await addMeasurement(body)
    return NextResponse.json(measurement)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

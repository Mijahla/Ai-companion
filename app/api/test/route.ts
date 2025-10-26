import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    return NextResponse.json(
        { message: 'Hello World', route: '/api/test', method: 'GET' },
        { status: 200 }
    )
}

export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}))
    return NextResponse.json(
        { message: 'Hello World', route: '/api/test', method: 'POST', body },
        { status: 200 }
    )
}
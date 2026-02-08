// app/api/v1/conversations/[conversation_id]/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Use NEXT_PUBLIC_BACKEND_BASE_URL which should be just http://host:port without /api/v1
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:11211';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversation_id: string }> }
) {
  const { conversation_id: conversationId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get('limit') || '50';
  const offset = searchParams.get('offset') || '0';
  const userId = searchParams.get('user_id') || '';

  if (!conversationId) {
    return NextResponse.json(
      { error: 'conversation_id is required' },
      { status: 400 }
    );
  }

  try {
    const backendParams = new URLSearchParams({
      limit,
      offset,
    });
    if (userId) backendParams.set('user_id', userId);

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/v1/conversations/${encodeURIComponent(conversationId)}/sessions?${backendParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!backendResponse.ok) {
      console.error('[sessions API] Backend error:', backendResponse.statusText);
      // Return empty list on error (fallback mode)
      return NextResponse.json({
        items: [],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[sessions API] Failed to fetch sessions:', error);
    // Return empty list on error (fallback mode)
    return NextResponse.json({
      items: [],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  }
}

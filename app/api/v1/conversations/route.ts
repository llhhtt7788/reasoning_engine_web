// app/api/v1/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Use NEXT_PUBLIC_BACKEND_BASE_URL which should be just http://host:port without /api/v1
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:11211';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');
  const appId = searchParams.get('app_id');
  const limit = searchParams.get('limit') || '20';
  const offset = searchParams.get('offset') || '0';

  if (!userId) {
    return NextResponse.json(
      { error: 'user_id is required' },
      { status: 400 }
    );
  }

  try {
    const backendParams = new URLSearchParams({
      user_id: userId,
      limit,
      offset,
    });

    if (appId) {
      backendParams.set('app_id', appId);
    }

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/v1/conversations?${backendParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!backendResponse.ok) {
      console.error('[conversations API] Backend error:', backendResponse.statusText);
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
    console.error('[conversations API] Failed to fetch conversations:', error);
    // Return empty list on error (fallback mode)
    return NextResponse.json({
      items: [],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  }
}

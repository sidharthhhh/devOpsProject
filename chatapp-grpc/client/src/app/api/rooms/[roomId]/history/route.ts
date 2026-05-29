import { NextRequest, NextResponse } from 'next/server';
import { roomClient, unaryCall } from '@/lib/grpc';
import * as grpc from '@grpc/grpc-js';

function getMetadata(req: NextRequest): grpc.Metadata {
  const meta = new grpc.Metadata();
  const token = req.headers.get('authorization');
  if (token) meta.add('authorization', token);
  return meta;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const metadata = getMetadata(req);
    const cursor = req.nextUrl.searchParams.get('cursor') || '';
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
    const response = await unaryCall(
      roomClient,
      'GetRoomHistory',
      { room_id: roomId, cursor, limit },
      metadata
    );
    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { roomClient, unaryCall } from '@/lib/grpc';
import * as grpc from '@grpc/grpc-js';

function getMetadata(req: NextRequest): grpc.Metadata {
  const meta = new grpc.Metadata();
  const token = req.headers.get('authorization');
  if (token) meta.add('authorization', token);
  return meta;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const metadata = getMetadata(req);
    const response = await unaryCall(
      roomClient,
      'CreateDirectMessage',
      body,
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

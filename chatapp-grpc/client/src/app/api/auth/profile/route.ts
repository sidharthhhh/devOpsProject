import { NextRequest, NextResponse } from 'next/server';
import { authClient, unaryCall } from '@/lib/grpc';
import * as grpc from '@grpc/grpc-js';

function getMetadata(req: NextRequest): grpc.Metadata {
  const meta = new grpc.Metadata();
  const token = req.headers.get('authorization');
  if (token) meta.add('authorization', token);
  return meta;
}

export async function GET(req: NextRequest) {
  try {
    const metadata = getMetadata(req);
    const userId = req.nextUrl.searchParams.get('user_id');
    const response = await unaryCall(authClient, 'GetProfile', { user_id: userId }, metadata);
    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.code === 5 ? 404 : 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const metadata = getMetadata(req);
    const response = await unaryCall(authClient, 'UpdateProfile', body, metadata);
    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: 500 }
    );
  }
}

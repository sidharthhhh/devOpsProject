import { NextRequest, NextResponse } from 'next/server';
import { authClient, unaryCall } from '@/lib/grpc';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await unaryCall(authClient, 'Login', body);
    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.code === 16 ? 401 : err.code === 5 ? 404 : 500 }
    );
  }
}

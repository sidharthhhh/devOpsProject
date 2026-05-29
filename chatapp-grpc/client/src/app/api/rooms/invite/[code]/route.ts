import { NextRequest, NextResponse } from 'next/server';
import { roomClient, unaryCall } from '@/lib/grpc';
import * as grpc from '@grpc/grpc-js';
import * as mysql from 'mysql2/promise';

// Singleton pool - created once, reused across requests
let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'chatdb',
      connectionLimit: 3,
    });
  }
  return pool;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Validate invite code format (6 digits only)
    if (!/^\d{6}$/.test(code) && code.length > 36) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
    }

    const db = getPool();
    const [rows] = await db.execute(
      'SELECT id, name, member_count, invite_code FROM rooms WHERE invite_code = ?',
      [code]
    ) as any;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Validate invite code format
    if (!/^\d{6}$/.test(code) && code.length > 36) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
    }

    // Require auth
    const token = req.headers.get('authorization');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getPool();
    const [rows] = await db.execute(
      'SELECT id FROM rooms WHERE invite_code = ?',
      [code]
    ) as any;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    const roomId = rows[0].id;

    // Join the room via gRPC
    const meta = new grpc.Metadata();
    meta.add('authorization', token);

    try {
      const response = await unaryCall(roomClient, 'JoinRoom', { room_id: roomId }, meta);
      return NextResponse.json({ ...response, room_id: roomId });
    } catch (grpcErr: any) {
      // Already a member is fine
      if (grpcErr.code === 6) {
        return NextResponse.json({ success: true, already_member: true, room_id: roomId });
      }
      return NextResponse.json({ error: grpcErr.message }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

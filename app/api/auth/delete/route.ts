import { NextResponse } from 'next/server';
import { verifyOTP, clearOTP, getUserByPhone, sql, ensureDB } from '@/lib/db';

export async function POST(request: Request) {
  try {
    await ensureDB();
    const { phone, code, adminPassword } = await request.json();

    // Verify admin password (hardcoded for now)
    const adminRow = await sql`SELECT * FROM users WHERE id = 'admin' AND role = 'admin'`;
    if (!adminRow || (adminRow as any)[0]?.password !== 'Mr.Hawk') {
      return NextResponse.json({ error: 'Admin auth required' }, { status: 401 });
    }

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and verification code required' }, { status: 400 });
    }

    const isValid = await verifyOTP(phone, '+0', code);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 401 });
    }

    const existingUser = await getUserByPhone(phone, '+0');
    if (!existingUser) {
      await clearOTP(phone, '+0');
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Prevent admin from deleting themselves accidentally? Allow it per request.
    await sql`DELETE FROM users WHERE id = ${existingUser.id}`;
    await clearOTP(phone, '+0');

    return NextResponse.json({ message: 'Account deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

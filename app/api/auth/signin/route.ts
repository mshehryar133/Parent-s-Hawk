import { NextResponse } from 'next/server';
import { getUserByPhone } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { countryCode, phone, password } = await request.json();
    
    const user = await getUserByPhone(phone, countryCode);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check password (in real app, compare hashed passwords)
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { message: 'Login successful', user: { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone, countryCode: user.countryCode, role: user.role || 'parent' } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
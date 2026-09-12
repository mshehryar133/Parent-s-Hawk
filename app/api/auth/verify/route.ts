import { NextResponse } from 'next/server';
import { verifyOTP, clearOTP, createUser, getUserByPhone } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { phone, countryCode, code, firstName, lastName, password } = await request.json();
    
    // Verify OTP
    const isValid = await verifyOTP(phone, countryCode, code);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 401 }
      );
    }
    
    // Check if user already exists
    const existingUser = await getUserByPhone(phone, countryCode);
    if (existingUser) {
      await clearOTP(phone, countryCode);
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 409 }
      );
    }
    
    // Create user
    const user = await createUser({ firstName, lastName, phone, countryCode, password, role: 'parent' });
    await clearOTP(phone, countryCode);
    
    return NextResponse.json(
      { message: 'Account created successfully', user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
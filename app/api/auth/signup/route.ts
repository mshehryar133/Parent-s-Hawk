import { NextResponse } from 'next/server';
import { getUserByPhone, createUser, saveOTP, clearOTP } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { countryCode, phone, firstName, lastName, password, role } = await request.json();

    // Check if user already exists
    const existingUser = await getUserByPhone(phone, countryCode);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 409 }
      );
    }

    // Default role: 'parent' if not specified, otherwise use provided role
    const userRole = role === 'child' ? 'child' : 'parent';

    // Generate OTP — don't create user yet
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOTP(phone, countryCode, otp);

    // Do NOT create user yet — wait for OTP verification
    return NextResponse.json(
      { message: 'Verification code sent. Enter code to complete registration.', phone, countryCode, firstName, lastName, password, role: userRole },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
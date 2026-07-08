import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  // 1. Parse body safely
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const email = body?.email?.trim()?.toLowerCase();
  const password = body?.password;
  const name = body?.name?.trim() || undefined;

  // 2. Validate required fields — ONLY email and password
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }

  // 3. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    );
  }

  // 4. Validate password length
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 }
    );
  }

  try {
    // 5. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If user exists via Google (no password set), allow password linking
      if (!existingUser.password) {
        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.user.update({
          where: { email },
          data: { password: hashedPassword },
        });
        return NextResponse.json(
          { message: 'Password set for existing account' },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // 6. Hash password and create user — ONLY required fields
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        // All other fields use schema defaults:
        // role: USER, tier: FREE, usageTokens: 3,
        // subscriptionStatus: "NONE", createdAt: now(), updatedAt: auto
      },
    });

    return NextResponse.json(
      { message: 'Account created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Register API Error]', error?.message || error);

    // Prisma-specific error handling
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Database foreign key constraint failed' },
        { status: 400 }
      );
    }

    if (error?.code?.startsWith?.('P')) {
      return NextResponse.json(
        { error: 'Database error. Please try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}

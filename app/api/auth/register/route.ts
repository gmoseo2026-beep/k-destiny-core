import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If user exists with Google (no password), allow them to set a password
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

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { message: 'Account created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Register API Error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adminSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Admin authorization check
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { amount, paymentMethod, paymentAddress, notes } = body;

    // Validate required fields
    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required', code: 'MISSING_AMOUNT' },
        { status: 400 }
      );
    }

    if (!paymentMethod || paymentMethod.trim() === '') {
      return NextResponse.json(
        { error: 'Payment method is required', code: 'MISSING_PAYMENT_METHOD' },
        { status: 400 }
      );
    }

    if (!paymentAddress || paymentAddress.trim() === '') {
      return NextResponse.json(
        { error: 'Payment address is required', code: 'MISSING_PAYMENT_ADDRESS' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    if (amount < 5) {
      return NextResponse.json(
        { error: 'Minimum withdrawal amount is $5', code: 'AMOUNT_TOO_LOW' },
        { status: 400 }
      );
    }

    // Get admin settings
    const settings = await db
      .select()
      .from(adminSettings)
      .limit(1);

    if (settings.length === 0) {
      return NextResponse.json(
        { error: 'Admin settings not found', code: 'SETTINGS_NOT_FOUND' },
        { status: 404 }
      );
    }

    const currentSettings = settings[0];
    const previousBalance = currentSettings.totalEarnings;

    // Check if sufficient balance
    if (previousBalance < amount) {
      return NextResponse.json(
        {
          error: 'Insufficient balance for withdrawal',
          code: 'INSUFFICIENT_BALANCE',
          details: {
            requested: amount,
            available: previousBalance,
            shortfall: amount - previousBalance
          }
        },
        { status: 409 }
      );
    }

    // Calculate new balance
    const newBalance = previousBalance - amount;

    // Update admin settings with new balance
    const updated = await db
      .update(adminSettings)
      .set({
        totalEarnings: newBalance,
        updatedAt: new Date()
      })
      .where(eq(adminSettings.id, currentSettings.id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update admin settings', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        withdrawal: {
          amount,
          paymentMethod: paymentMethod.trim(),
          paymentAddress: paymentAddress.trim(),
          notes: notes ? notes.trim() : undefined,
          previousBalance,
          newBalance,
          createdAt: new Date().toISOString()
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adminWallets, walletTransactions } from '@/db/schema';
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
    const { amount, currencyType, paymentMethod, paymentAddress, bankName, accountNumber, notes } = body;

    // Validate required fields
    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required', code: 'MISSING_AMOUNT' },
        { status: 400 }
      );
    }

    if (!currencyType) {
      return NextResponse.json(
        { error: 'Currency type is required', code: 'MISSING_CURRENCY_TYPE' },
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

    // Validate currency type
    if (currencyType !== 'USD' && currencyType !== 'USDT_TRC20') {
      return NextResponse.json(
        { error: 'Currency type must be USD or USDT_TRC20', code: 'INVALID_CURRENCY_TYPE' },
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

    // Get admin wallet for specified currency
    const adminWallet = await db
      .select()
      .from(adminWallets)
      .where(eq(adminWallets.currencyType, currencyType))
      .limit(1);

    if (adminWallet.length === 0) {
      return NextResponse.json(
        { 
          error: `Admin wallet not found for ${currencyType}`, 
          code: 'WALLET_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const currentWallet = adminWallet[0];
    const previousBalance = currentWallet.balance;

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
    const timestamp = new Date().toISOString();

    // Update admin wallet with new balance
    const updated = await db
      .update(adminWallets)
      .set({
        balance: newBalance,
        totalWithdrawn: currentWallet.totalWithdrawn + amount,
        updatedAt: timestamp
      })
      .where(eq(adminWallets.id, currentWallet.id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update admin wallet', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    // Build withdrawal description
    let description = `Admin withdrawal to ${paymentMethod}: ${paymentAddress}`;
    if (bankName) description += ` (Bank: ${bankName})`;
    if (accountNumber) description += ` (Account: ${accountNumber})`;
    if (notes) description += `. Notes: ${notes}`;

    // Return success response
    return NextResponse.json(
      {
        success: true,
        withdrawal: {
          amount,
          currencyType,
          paymentMethod: paymentMethod.trim(),
          paymentAddress: paymentAddress.trim(),
          bankName: bankName ? bankName.trim() : undefined,
          accountNumber: accountNumber ? accountNumber.trim() : undefined,
          notes: notes ? notes.trim() : undefined,
          previousBalance,
          newBalance,
          totalWithdrawn: updated[0].totalWithdrawn,
          createdAt: timestamp
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/admin/wallet/withdraw error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
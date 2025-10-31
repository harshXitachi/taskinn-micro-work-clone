import { NextRequest, NextResponse } from 'next/server';
import { capturePayPalOrder } from '@/lib/paypal';
import { db } from '@/db';
import { wallets, walletTransactions, adminSettings, adminWallets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, userId } = body;

    if (!orderId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Capture PayPal order
    const captureResult = await capturePayPalOrder(orderId);

    if (!captureResult.success) {
      return NextResponse.json(
        { success: false, error: captureResult.error },
        { status: 500 }
      );
    }

    const depositAmount = captureResult.amount;

    // Get commission rate
    const settings = await db.select().from(adminSettings).limit(1);
    const commissionRate = settings[0]?.commissionRate || 0.05;

    const commissionAmount = depositAmount * commissionRate;
    const netAmount = depositAmount - commissionAmount;

    // Update or create user wallet
    const existingWallet = await db.select()
      .from(wallets)
      .where(and(
        eq(wallets.userId, userId),
        eq(wallets.currencyType, 'USD')
      ))
      .limit(1);

    let walletId: number;

    if (existingWallet.length > 0) {
      const wallet = existingWallet[0];
      await db.update(wallets)
        .set({
          balance: wallet.balance + netAmount,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(wallets.id, wallet.id));
      walletId = wallet.id;
    } else {
      const newWallet = await db.insert(wallets).values({
        userId,
        currencyType: 'USD',
        balance: netAmount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning();
      walletId = newWallet[0].id;
    }

    // Record transaction
    await db.insert(walletTransactions).values({
      walletId,
      transactionType: 'deposit',
      amount: netAmount,
      currencyType: 'USD',
      status: 'completed',
      referenceId: captureResult.captureId,
      description: `PayPal deposit - Commission: $${commissionAmount.toFixed(2)}`,
      transactionHash: captureResult.captureId,
      createdAt: new Date().toISOString(),
    });

    // Update admin wallet with commission
    const adminWalletRecord = await db.select()
      .from(adminWallets)
      .where(eq(adminWallets.currencyType, 'USD'))
      .limit(1);

    if (adminWalletRecord.length > 0) {
      const admin = adminWalletRecord[0];
      await db.update(adminWallets)
        .set({
          balance: admin.balance + commissionAmount,
          totalEarned: admin.totalEarned + commissionAmount,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(adminWallets.id, admin.id));
    } else {
      await db.insert(adminWallets).values({
        currencyType: 'USD',
        balance: commissionAmount,
        totalEarned: commissionAmount,
        totalWithdrawn: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      deposit: {
        depositedAmount: depositAmount,
        commissionAmount,
        netAmount,
        captureId: captureResult.captureId,
      },
    });
  } catch (error: any) {
    console.error('Capture PayPal order error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

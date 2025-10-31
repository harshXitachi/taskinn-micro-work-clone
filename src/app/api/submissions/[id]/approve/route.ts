import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { taskSubmissions, tasks, wallets, walletTransactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submissionId = parseInt(id);

    // Validate submission ID
    if (!submissionId || isNaN(submissionId)) {
      return NextResponse.json(
        { error: 'Valid submission ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { employerId, reviewerNotes } = body;

    // Validate required fields
    if (!employerId) {
      return NextResponse.json(
        { error: 'employerId is required', code: 'MISSING_EMPLOYER_ID' },
        { status: 400 }
      );
    }

    // Get submission
    const submission = await db
      .select()
      .from(taskSubmissions)
      .where(eq(taskSubmissions.id, submissionId))
      .limit(1);

    if (submission.length === 0) {
      return NextResponse.json(
        { error: 'Submission not found', code: 'SUBMISSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    const currentSubmission = submission[0];

    // Validate submission status
    if (currentSubmission.status !== 'pending') {
      return NextResponse.json(
        {
          error: 'Only pending submissions can be approved',
          code: 'INVALID_STATUS',
        },
        { status: 409 }
      );
    }

    // Get task details
    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, currentSubmission.taskId!))
      .limit(1);

    if (task.length === 0) {
      return NextResponse.json(
        { error: 'Associated task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 }
      );
    }

    const currentTask = task[0];

    // Verify employer matches task employer
    if (currentTask.employerId !== employerId) {
      return NextResponse.json(
        {
          error: 'Employer ID does not match task employer',
          code: 'UNAUTHORIZED_EMPLOYER',
        },
        { status: 403 }
      );
    }

    // Update submission
    const updatedSubmission = await db
      .update(taskSubmissions)
      .set({
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        reviewerNotes: reviewerNotes || null,
      })
      .where(eq(taskSubmissions.id, submissionId))
      .returning();

    // Initialize payment status
    let paymentStatus = 'not_processed';
    let transactionDetails = null;

    // Process payment
    try {
      const taskPrice = currentTask.price;
      const currencyType = 'USD';

      // Find employer wallet
      const employerWallet = await db
        .select()
        .from(wallets)
        .where(
          and(
            eq(wallets.userId, employerId),
            eq(wallets.currencyType, currencyType)
          )
        )
        .limit(1);

      // Find worker wallet
      const workerWallet = await db
        .select()
        .from(wallets)
        .where(
          and(
            eq(wallets.userId, currentSubmission.workerId!),
            eq(wallets.currencyType, currencyType)
          )
        )
        .limit(1);

      if (employerWallet.length === 0) {
        paymentStatus = 'failed';
        transactionDetails = { error: 'Employer wallet not found' };
      } else if (workerWallet.length === 0) {
        paymentStatus = 'failed';
        transactionDetails = { error: 'Worker wallet not found' };
      } else if (employerWallet[0].balance < taskPrice) {
        paymentStatus = 'failed';
        transactionDetails = { error: 'Insufficient employer wallet balance' };
      } else {
        // Process payment
        const referenceId = `task_${currentTask.id}_submission_${submissionId}`;
        const timestamp = new Date().toISOString();

        // Deduct from employer wallet
        const updatedEmployerWallet = await db
          .update(wallets)
          .set({
            balance: employerWallet[0].balance - taskPrice,
            updatedAt: timestamp,
          })
          .where(eq(wallets.id, employerWallet[0].id))
          .returning();

        // Add to worker wallet
        const updatedWorkerWallet = await db
          .update(wallets)
          .set({
            balance: workerWallet[0].balance + taskPrice,
            updatedAt: timestamp,
          })
          .where(eq(wallets.id, workerWallet[0].id))
          .returning();

        // Create employer transaction (debit)
        const employerTransaction = await db
          .insert(walletTransactions)
          .values({
            walletId: employerWallet[0].id,
            transactionType: 'task_payment',
            amount: -taskPrice,
            currencyType: currencyType,
            status: 'completed',
            referenceId: referenceId,
            description: `Payment for task: ${currentTask.title}`,
            createdAt: timestamp,
          })
          .returning();

        // Create worker transaction (credit)
        const workerTransaction = await db
          .insert(walletTransactions)
          .values({
            walletId: workerWallet[0].id,
            transactionType: 'task_payment',
            amount: taskPrice,
            currencyType: currencyType,
            status: 'completed',
            referenceId: referenceId,
            description: `Payment received for task: ${currentTask.title}`,
            createdAt: timestamp,
          })
          .returning();

        paymentStatus = 'success';
        transactionDetails = {
          employerTransaction: employerTransaction[0],
          workerTransaction: workerTransaction[0],
          employerBalance: updatedEmployerWallet[0].balance,
          workerBalance: updatedWorkerWallet[0].balance,
        };
      }
    } catch (paymentError) {
      console.error('Payment processing error:', paymentError);
      paymentStatus = 'failed';
      transactionDetails = {
        error:
          'Payment processing failed: ' +
          (paymentError instanceof Error ? paymentError.message : 'Unknown error'),
      };
    }

    // Increment task slots filled
    const newSlotsFilled = currentTask.slotsFilled + 1;
    let taskStatus = currentTask.status;

    // Check if task should be completed
    if (newSlotsFilled >= currentTask.slots) {
      taskStatus = 'completed';
    }

    // Update task
    const updatedTask = await db
      .update(tasks)
      .set({
        slotsFilled: newSlotsFilled,
        status: taskStatus,
      })
      .where(eq(tasks.id, currentTask.id))
      .returning();

    return NextResponse.json(
      {
        submission: updatedSubmission[0],
        task: updatedTask[0],
        paymentStatus,
        transactionDetails,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      {
        error:
          'Internal server error: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}
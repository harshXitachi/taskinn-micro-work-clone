import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, taskSubmissions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' },
        { status: 401 }
      );
    }

    // Validate task ID from params
    const taskId = params.id;
    if (!taskId || isNaN(parseInt(taskId))) {
      return NextResponse.json(
        { error: 'Valid task ID is required', code: 'INVALID_TASK_ID' },
        { status: 400 }
      );
    }

    const parsedTaskId = parseInt(taskId);

    // Parse request body
    const body = await request.json();

    // Security check: Reject if workerId provided in body
    if ('workerId' in body || 'worker_id' in body) {
      return NextResponse.json(
        {
          error: 'Worker ID cannot be provided in request body',
          code: 'WORKER_ID_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    // Use authenticated user's ID as workerId
    const workerId = user.id;

    // Fetch the task
    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parsedTaskId))
      .limit(1);

    if (task.length === 0) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 }
      );
    }

    const taskData = task[0];

    // Validate task status is "open"
    if (taskData.status !== 'open') {
      return NextResponse.json(
        {
          error: 'Task is not accepting applications',
          code: 'TASK_NOT_OPEN',
        },
        { status: 400 }
      );
    }

    // Check worker is not applying to their own task
    if (taskData.employerId === workerId) {
      return NextResponse.json(
        {
          error: 'Cannot apply to your own task',
          code: 'CANNOT_APPLY_OWN_TASK',
        },
        { status: 400 }
      );
    }

    // Check if worker has already applied
    const existingSubmission = await db
      .select()
      .from(taskSubmissions)
      .where(
        and(
          eq(taskSubmissions.taskId, parsedTaskId),
          eq(taskSubmissions.workerId, workerId)
        )
      )
      .limit(1);

    if (existingSubmission.length > 0) {
      return NextResponse.json(
        {
          error: 'You have already applied to this task',
          code: 'DUPLICATE_APPLICATION',
        },
        { status: 409 }
      );
    }

    // Check if task has available slots
    if (taskData.slotsFilled >= taskData.slots) {
      return NextResponse.json(
        {
          error: 'No available slots for this task',
          code: 'SLOTS_FULL',
        },
        { status: 409 }
      );
    }

    // Create the submission
    const newSubmission = await db
      .insert(taskSubmissions)
      .values({
        taskId: parsedTaskId,
        workerId: workerId,
        status: 'applied',
        submissionData: null,
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewerNotes: null,
      })
      .returning();

    return NextResponse.json(newSubmission[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks/[id]/apply error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
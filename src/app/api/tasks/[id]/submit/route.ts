import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { taskSubmissions, tasks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);

    // Validate task ID
    if (!taskId || isNaN(taskId)) {
      return NextResponse.json(
        { 
          error: "Valid task ID is required",
          code: "INVALID_TASK_ID" 
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { workerId, submissionData } = body;

    // Validate required fields
    if (!workerId) {
      return NextResponse.json(
        { 
          error: "workerId is required",
          code: "MISSING_WORKER_ID" 
        },
        { status: 400 }
      );
    }

    if (!submissionData) {
      return NextResponse.json(
        { 
          error: "submissionData is required",
          code: "MISSING_SUBMISSION_DATA" 
        },
        { status: 400 }
      );
    }

    // Validate submissionData is valid JSON string
    try {
      if (typeof submissionData === 'string') {
        JSON.parse(submissionData);
      } else {
        // If it's an object, stringify it
        JSON.stringify(submissionData);
      }
    } catch {
      return NextResponse.json(
        { 
          error: "submissionData must be valid JSON",
          code: "INVALID_JSON" 
        },
        { status: 400 }
      );
    }

    // Check if task exists and get its details
    const taskResult = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (taskResult.length === 0) {
      return NextResponse.json(
        { 
          error: "Task not found",
          code: "TASK_NOT_FOUND" 
        },
        { status: 404 }
      );
    }

    const task = taskResult[0];

    // Validate task status
    if (task.status !== 'open' && task.status !== 'in_progress') {
      return NextResponse.json(
        { 
          error: "Task is not accepting submissions",
          code: "TASK_NOT_ACCEPTING_SUBMISSIONS" 
        },
        { status: 400 }
      );
    }

    // Check if slots are full
    if (task.slotsFilled >= task.slots) {
      return NextResponse.json(
        { 
          error: "Task slots are full",
          code: "SLOTS_FULL" 
        },
        { status: 409 }
      );
    }

    // Check if worker has already submitted this task
    const existingSubmission = await db.select()
      .from(taskSubmissions)
      .where(
        and(
          eq(taskSubmissions.taskId, taskId),
          eq(taskSubmissions.workerId, workerId)
        )
      )
      .limit(1);

    if (existingSubmission.length > 0) {
      return NextResponse.json(
        { 
          error: "Worker has already submitted this task",
          code: "DUPLICATE_SUBMISSION" 
        },
        { status: 409 }
      );
    }

    // Ensure submissionData is stored as a string
    const submissionDataString = typeof submissionData === 'string' 
      ? submissionData 
      : JSON.stringify(submissionData);

    // Create the submission
    const newSubmission = await db.insert(taskSubmissions)
      .values({
        taskId,
        workerId,
        submissionData: submissionDataString,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      })
      .returning();

    // Calculate new slotsFilled value
    const newSlotsFilled = task.slotsFilled + 1;
    const newTaskStatus = newSlotsFilled >= task.slots 
      ? 'completed' 
      : (task.status === 'open' ? 'in_progress' : task.status);

    // Update task status and slotsFilled
    await db.update(tasks)
      .set({
        status: newTaskStatus,
        slotsFilled: newSlotsFilled,
      })
      .where(eq(tasks.id, taskId));

    return NextResponse.json(newSubmission[0], { status: 201 });

  } catch (error) {
    console.error('POST task submission error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}
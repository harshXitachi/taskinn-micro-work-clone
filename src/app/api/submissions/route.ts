import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { taskSubmissions } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single submission by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const submission = await db.select()
        .from(taskSubmissions)
        .where(eq(taskSubmissions.id, parseInt(id)))
        .limit(1);

      if (submission.length === 0) {
        return NextResponse.json({ 
          error: 'Submission not found',
          code: "SUBMISSION_NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(submission[0], { status: 200 });
    }

    // List submissions with filtering
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const status = searchParams.get('status');
    const workerId = searchParams.get('workerId');
    const taskId = searchParams.get('taskId');

    let query = db.select().from(taskSubmissions);

    // Build filter conditions
    const conditions = [];

    if (status) {
      conditions.push(eq(taskSubmissions.status, status));
    }

    if (workerId) {
      conditions.push(eq(taskSubmissions.workerId, workerId));
    }

    if (taskId) {
      if (isNaN(parseInt(taskId))) {
        return NextResponse.json({ 
          error: "Valid task ID is required",
          code: "INVALID_TASK_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(taskSubmissions.taskId, parseInt(taskId)));
    }

    // Apply filters if any
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Sort by submittedAt DESC (newest first) and apply pagination
    const results = await query
      .orderBy(desc(taskSubmissions.submittedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}
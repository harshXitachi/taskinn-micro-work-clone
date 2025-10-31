import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adminSettings } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        },
        { status: 401 }
      );
    }

    // Authorization check - must be admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          error: 'Not authorized. Admin access required.',
          code: 'FORBIDDEN'
        },
        { status: 403 }
      );
    }

    // Get admin settings
    const settings = await db.select().from(adminSettings).limit(1);

    if (settings.length === 0) {
      return NextResponse.json(
        {
          error: 'Admin settings not found',
          code: 'ADMIN_SETTINGS_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const adminData = settings[0];

    // Return admin commission statistics
    return NextResponse.json({
      success: true,
      stats: {
        totalEarnings: adminData.totalEarnings,
        commissionRate: adminData.commissionRate,
        adminUsername: adminData.adminUsername,
        adminEmail: adminData.adminEmail,
        createdAt: adminData.createdAt,
        updatedAt: adminData.updatedAt
      }
    }, { status: 200 });

  } catch (error) {
    console.error('GET /api/admin/wallet-stats error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}
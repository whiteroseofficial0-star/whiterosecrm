import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.enum([
    "FOLLOW_UP_REMINDER", "OVERDUE_FOLLOW_UP", "DEMO_REMINDER",
    "MEETING_REMINDER", "TASK_DEADLINE", "PROPOSAL_EXPIRATION",
    "PAYMENT_DUE", "PROJECT_DEADLINE",
  ]),
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const countOnly = searchParams.get("count") === "true";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  const where = { userId: session.user.id, ...(unreadOnly ? { isRead: false } : {}) };

  if (countOnly) {
    const count = await prisma.notification.count({ where });
    return NextResponse.json({ count });
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return NextResponse.json({
    notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createNotificationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const notification = await prisma.notification.create({
    data: parsed.data,
  });

  return NextResponse.json(notification, { status: 201 });
}

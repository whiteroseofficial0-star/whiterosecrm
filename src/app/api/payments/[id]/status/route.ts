import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  installmentId: z.string().optional(),
  paidDate: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "payments.markPaid")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.payment.findUnique({
    where: { id },
    include: { installments: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const { status, installmentId, paidDate } = parsed.data;

  if (installmentId) {
    const installment = existing.installments.find((i) => i.id === installmentId);
    if (!installment) {
      return NextResponse.json({ error: "Installment not found" }, { status: 404 });
    }

    const paidDateObj = paidDate ? new Date(paidDate) : new Date();

    await prisma.paymentInstallment.update({
      where: { id: installmentId },
      data: {
        status: "PAID",
        paidDate: paidDateObj,
      },
    });

    const allInstallments = await prisma.paymentInstallment.findMany({
      where: { paymentId: id },
    });

    const totalPaid = allInstallments.reduce((sum, inst) => {
      const amount = inst.status === "PAID" ? Number(inst.amount) : 0;
      return sum + amount;
    }, 0);

    const installmentPaid = allInstallments.find((i) => i.id === installmentId);
    if (installmentPaid) {
      const paidAmount = Number(existing.paidAmount) + Number(installmentPaid.amount);
      const totalAmount = Number(existing.totalAmount);

      let newStatus: "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED" = existing.status;
      if (paidAmount >= totalAmount) {
        newStatus = "PAID";
      } else if (paidAmount > 0) {
        newStatus = "PARTIALLY_PAID";
      }

      await prisma.payment.update({
        where: { id },
        data: { paidAmount, status: newStatus },
      });
    }

    const updatedPayment = await prisma.payment.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, businessName: true, contactPerson: true } },
        project: { select: { id: true, name: true } },
        installments: true,
      },
    });

    return NextResponse.json(updatedPayment);
  }

  if (status) {
    const paidAmount = status === "PAID" ? existing.totalAmount : existing.paidAmount;

    const payment = await prisma.payment.update({
      where: { id },
      data: { status, paidAmount },
      include: {
        client: { select: { id: true, businessName: true, contactPerson: true } },
        project: { select: { id: true, name: true } },
        installments: true,
      },
    });

    return NextResponse.json(payment);
  }

  return NextResponse.json({ error: "Provide status or installmentId" }, { status: 400 });
}

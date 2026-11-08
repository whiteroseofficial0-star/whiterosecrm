"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import PaymentDetailClient from "@/components/payments/payment-detail";

export default function PaymentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
        </div>
      }
    >
      <PaymentDetailClient paymentId={id} />
    </Suspense>
  );
}

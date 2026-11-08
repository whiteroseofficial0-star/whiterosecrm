"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import ClientDetailClient from "@/components/clients/client-detail";

export default function ClientDetailPage() {
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
      <ClientDetailClient clientId={id} />
    </Suspense>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { useCallback } from "react";

import { useAuth } from "../hooks/useAuth";
import { useQuickCapture } from "../hooks/useQuickCapture";

import { QuickCaptureForm } from "../components/QuickCaptureForm";

export default function QuickCapturePage() {
  const cleanup = useCallback(() => {}, []);

  const auth = useAuth(cleanup);
  const capture = useQuickCapture(auth.supabase, auth.coreConfigReady, auth.authStatus, auth.session);

  return (
    <main className="app-shell" aria-labelledby="page-title">
      <section className="entry-panel">
        <QuickCaptureForm
          activityDate={capture.activityDate}
          amount={capture.amount}
          authStatus={auth.authStatus}
          coreConfigReady={auth.coreConfigReady}
          currentModeConfigReady={capture.currentModeConfigReady}
          description={capture.description}
          mode={capture.quickCaptureMode}
          submitState={capture.submitState}
          categoryId={capture.categoryId}
          categories={capture.categories}
          onAmountChange={capture.setAmount}
          onDescriptionChange={capture.setDescription}
          onModeChange={capture.setQuickCaptureMode}
          onCategoryChange={capture.setCategoryId}
          onSubmit={capture.handleSubmit}
        />
      </section>
    </main>
  );
}

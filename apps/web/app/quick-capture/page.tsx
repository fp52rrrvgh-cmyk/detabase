"use client";

export const dynamic = "force-dynamic";

import { useCallback } from "react";

import { runtimeConfig } from "../constants";
import { runtimeEnvironmentStatus } from "../lib/runtime";

import { useAuth } from "../hooks/useAuth";
import { useQuickCapture } from "../hooks/useQuickCapture";
import { useReviewData } from "../hooks/useReviewData";

import { AuthSection } from "../components/AuthSection";
import { FinanceReviewPanel } from "../components/FinanceReviewPanel";
import { QuickCaptureForm } from "../components/QuickCaptureForm";
import { RuntimeReadiness } from "../components/RuntimeReadiness";

export default function QuickCapturePage() {
  const cleanup = useCallback(() => {
    // 登出時清除子狀態
  }, []);

  const auth = useAuth(cleanup);
  const review = useReviewData(auth.supabase, auth.coreConfigReady, auth.authStatus, auth.session);
  const capture = useQuickCapture(auth.supabase, auth.coreConfigReady, auth.authStatus, auth.session, review.loadReviewData);

  const runtimeStatusItems = runtimeEnvironmentStatus(runtimeConfig);
  const runtimeReady = runtimeStatusItems.every((item) => item.configured);

  return (
    <main className="app-shell" aria-labelledby="page-title">
      <section className="entry-panel">
        <div className="page-heading">
          <p className="eyebrow">Staging 快速輸入</p>
          <h1 id="page-title">財務快速記錄</h1>
          <p className="summary">
            支出為預設，可切換收入；每次送出一筆整數 TWD 紀錄。
          </p>
        </div>

        <div className="setup-stack" aria-label="Staging 設定與登入狀態">
          <RuntimeReadiness configured={runtimeReady} items={runtimeStatusItems} />

          <AuthSection
            authLoading={auth.authLoading}
            authMessage={auth.authMessage}
            authStatus={auth.authStatus}
            coreConfigReady={auth.coreConfigReady}
            email={auth.email}
            hasSession={Boolean(auth.session)}
            password={auth.password}
            onEmailChange={auth.setEmail}
            onPasswordChange={auth.setPassword}
            onSignIn={auth.handleSignIn}
            onSignOut={auth.handleSignOut}
          />
        </div>

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

      <FinanceReviewPanel
        canLoad={auth.coreConfigReady && auth.authStatus === "signed_in"}
        endDate={review.reviewEndDate}
        movementFilter={review.movementFilter}
        onBeginVoidCorrection={review.handleBeginVoidCorrection}
        onCancelVoidCorrection={review.handleCancelVoidCorrection}
        onEndDateChange={review.setReviewEndDate}
        onMovementFilterChange={review.setMovementFilter}
        onRefresh={() => void review.loadReviewData()}
        onStartDateChange={review.setReviewStartDate}
        onVoidCorrectionSubmit={review.handleVoidCorrectionSubmit}
        onVoidReasonChange={review.handleVoidReasonChange}
        onToggleVoidAudit={() => review.setShowVoidAudit(!review.showVoidAudit)}
        reviewState={review.reviewState}
        showVoidAudit={review.showVoidAudit}
        startDate={review.reviewStartDate}
        voidState={review.voidState}
      />
    </main>
  );
}

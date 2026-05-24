import type { QuickCaptureMode, RuntimeConfig, RuntimeStatusItem } from "../types";
import { RUNTIME_ENVIRONMENT_FIELDS } from "../constants";

export function hasRuntimeFields(
  config: RuntimeConfig,
  keys: Array<keyof RuntimeConfig>,
): boolean {
  return keys.every((key) => config[key].trim().length > 0);
}

export function runtimeEnvironmentStatus(config: RuntimeConfig): RuntimeStatusItem[] {
  return RUNTIME_ENVIRONMENT_FIELDS.map(({ name, key }) => ({
    name,
    configured: config[key].trim().length > 0,
  }));
}


export function runtimeRefsForMode(
  config: RuntimeConfig,
  mode: QuickCaptureMode,
): { accountId: string; categoryId: string } {
  return mode === "income"
    ? {
        accountId: config.incomeAccountId,
        categoryId: config.incomeCategoryId,
      }
    : {
        accountId: config.expenseAccountId,
        categoryId: config.expenseCategoryId,
      };
}

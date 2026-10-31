export * from "./types";
export * from "./api";
export { useLeadsWorkspace } from "./hooks/useLeadsWorkspace";
export { LeadsWorkspaceView } from "./components/LeadsWorkspaceView";
export { StatsCards } from "./components/StatsCards";
export { LeadFilters } from "./components/LeadFilters";
export { LeadTable } from "./components/LeadTable";
export { AiQuickLeadBar } from "./components/AiQuickLeadBar";
export type { AiLeadDraft } from "./components/AiQuickLeadBar";
export { LeadDetailAuditTab } from "./components/LeadDetailAuditTab";
export * from "./components/lead-detail-constants";
export { openPrintableQuoteWindow } from "./components/printable-quote";

// Lazy loaders for heavy Lead modals so entry points import only from the module's public barrel
// while keeping the modals code-split into separate chunks.
export const loadLeadDetailModal = () =>
  import("./components/LeadDetailModal").then((m) => m.LeadDetailModal);
export const loadNewLeadModal = () =>
  import("./components/NewLeadModal").then((m) => m.NewLeadModal);
export const loadImportLeadsModal = () =>
  import("./components/ImportLeadsModal").then((m) => m.ImportLeadsModal);

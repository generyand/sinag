// 🎯 Shared Components - App-wide reusable components
export { AssessorAvatars } from "./AssessorAvatars";
export { ConfirmationDialog } from "./ConfirmationDialog";
export { default as DataTable } from "./DataTable";
export { ErrorBoundary, ErrorBoundaryWrapper } from "./ErrorBoundary";
export { FilePreviewerModal } from "./FilePreviewerModal";
export { default as FileUploader } from "./FileUploader";
export { default as PageHeader } from "./PageHeader";
export { ProgressBar } from "./ProgressBar";
export { StatusBadge } from "./StatusBadge";
export { ThemeToggle } from "./ThemeToggle";
export { default as UserNav } from "./UserNav";

// 🔄 Skeleton Components for loading states
export {
  ValidationPanelSkeleton,
  IndicatorFormSkeleton,
  ChartSkeleton,
  MovFilesPanelSkeleton,
  DashboardCardSkeleton,
  DashboardSkeleton,
  TableSkeleton,
  PanelSkeleton,
} from "./skeletons";

// 🔄 Loading state wrappers
export { WithLoading, QueryWrapper } from "./WithLoading";

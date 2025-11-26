/**
 * Rework Workflow Type Definitions
 *
 * Types for the BLGU rework workflow, including failed indicator tracking,
 * navigation helpers, and progress metrics.
 */

import type { ReworkComment } from '@sinag/shared';

/**
 * MOV annotation with file metadata
 */
export interface MOVAnnotationWithFile {
  annotation_id: number;
  mov_file_id: number;
  mov_filename: string;
  mov_file_type: string;
  annotation_type: 'pdfRect' | 'imageRect';
  page?: number;
  rect?: { x1: number; y1: number; x2: number; y2: number };
  rects?: any;
  comment: string;
  indicator_id: number;
  indicator_name: string;
  created_at: string | null;
}

/**
 * Enhanced type for failed indicators with grouped feedback
 */
export interface FailedIndicator {
  indicator_id: number;
  indicator_name: string;
  governance_area_id: number;
  governance_area_name: string;
  is_complete: boolean;

  // Assessor feedback
  comments: ReworkComment[];
  annotations: MOVAnnotationWithFile[];

  // Derived metadata
  total_feedback_items: number;
  has_mov_issues: boolean;
  has_field_issues: boolean;

  // Navigation
  route_path: string;
}

/**
 * Rework workflow progress
 */
export interface ReworkProgress {
  total_failed: number;
  fixed_count: number;
  remaining_count: number;
  completion_percentage: number;

  // Current indicator context
  current_indicator_id?: number;
  current_index?: number;
  has_next: boolean;
  has_previous: boolean;
  next_indicator_id?: number;
  previous_indicator_id?: number;
}

/**
 * Rework context (for URL state and navigation)
 */
export interface ReworkContext {
  from_rework: boolean;
  failed_indicators: FailedIndicator[];
  current_indicator?: FailedIndicator;
  progress: ReworkProgress;
}

/**
 * Validation status type (from backend)
 */
export type ValidationStatus = 'PASS' | 'FAIL' | 'CONDITIONAL' | null;

/**
 * Indicator with validation metadata (from dashboard API)
 */
export interface IndicatorWithValidation {
  indicator_id: number;
  indicator_name: string;
  is_complete: boolean;
  response_id: number | null;
  validation_status: ValidationStatus;
  text_comment_count: number;
  mov_annotation_count: number;
}

/**
 * Governance area group with validation metadata
 */
export interface GovernanceAreaWithValidation {
  governance_area_id: number;
  governance_area_name: string;
  indicators: IndicatorWithValidation[];
}

/**
 * BLGU Phases Components
 *
 * Components for displaying the BLGU assessment dashboard organized by phases:
 * - Phase 1: Initial Assessment (Assessor review)
 * - Phase 2: Table Validation (Validator review)
 * - Verdict: SGLGB Classification Result
 */

export { PhaseCard, type PhaseStatus } from "./PhaseCard";
export { Phase1Section } from "./Phase1Section";
export { Phase2Section } from "./Phase2Section";
export { VerdictSection } from "./VerdictSection";
export { PhaseTimeline } from "./PhaseTimeline";
export { AssessmentProgress } from "./AssessmentProgress";
export {
  BBIComplianceCard,
  type BBIComplianceData,
  type BBIComplianceResult,
  type BBIComplianceSummary,
  type SubIndicatorResult,
} from "./BBIComplianceCard";

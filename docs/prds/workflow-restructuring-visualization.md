# SINAG Workflow Restructuring - Visualization

## Design Decisions Summary

| Decision                  | Choice                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| Validator visibility      | Only after ALL 6 assessors approve their areas                     |
| Partial rework            | BLGU can submit other areas while one is in rework                 |
| Validator-BLGU assignment | Clusters assigned, validators decide IRL (no system enforcement)   |
| Calibration scope         | For specific indicators                                            |
| Status tracking           | Per-area status                                                    |
| Assessor queue            | Only see explicitly submitted areas                                |
| Migration strategy        | Clean reset - revert to first-submitted, discard rework history    |
| Field naming              | Rename `validator_area_id` → `assessor_area_id`                    |
| Notification              | Yes, notify BLGU when all 6 assessors approve (moves to validator) |
| Assessor visibility       | Don't show which assessor is assigned on BLGU dashboard            |
| Rework limit              | 1 total, compiled from all 6 assessors (all rework = 1 round)      |
| Calibration limit         | 1 total from Validator                                             |
| RE-Calibration flow       | MLGOO → BLGU → Validator → MLGOO (final approval)                  |

---

## New Assessment Workflow (Complete)

```mermaid
flowchart TD
    subgraph BLGU["BLGU USER - Per-Area Submission"]
        A[Create Assessment] --> B[Work on 6 Governance Areas]
        B --> B1[Area 1: Financial]
        B --> B2[Area 2: Disaster]
        B --> B3[Area 3: Safety]
        B --> B4[Area 4: Social]
        B --> B5[Area 5: Business]
        B --> B6[Area 6: Environment]

        B1 --> S1[Submit Area 1]
        B2 --> S2[Submit Area 2]
        B3 --> S3[Submit Area 3]
        B4 --> S4[Submit Area 4]
        B5 --> S5[Submit Area 5]
        B6 --> S6[Submit Area 6]
    end

    subgraph ASSESSORS["ASSESSOR (NEW) - 6 Users | Area-Specific | Municipal Offices"]
        S1 --> AS1[Assessor 1<br/>Financial - MTO]
        S2 --> AS2[Assessor 2<br/>Disaster - LDRRMO]
        S3 --> AS3[Assessor 3<br/>Safety - PNP]
        S4 --> AS4[Assessor 4<br/>Social - MSWDO]
        S5 --> AS5[Assessor 5<br/>Business - BPLO]
        S6 --> AS6[Assessor 6<br/>Environment - MENRO]

        AS1 --> D1{Decision}
        AS2 --> D2{Decision}
        AS3 --> D3{Decision}
        AS4 --> D4{Decision}
        AS5 --> D5{Decision}
        AS6 --> D6{Decision}
    end

    D1 -->|REWORK| R1[Return to BLGU<br/>Area 1 Unlocked<br/>Other areas can still<br/>be submitted]
    D2 -->|REWORK| R2[Return to BLGU<br/>Area 2 Unlocked]
    D3 -->|REWORK| R3[Return to BLGU<br/>Area 3 Unlocked]
    D4 -->|REWORK| R4[Return to BLGU<br/>Area 4 Unlocked]
    D5 -->|REWORK| R5[Return to BLGU<br/>Area 5 Unlocked]
    D6 -->|REWORK| R6[Return to BLGU<br/>Area 6 Unlocked]

    R1 --> B1
    R2 --> B2
    R3 --> B3
    R4 --> B4
    R5 --> B5
    R6 --> B6

    D1 -->|APPROVE| V1[Area 1 Approved]
    D2 -->|APPROVE| V2[Area 2 Approved]
    D3 -->|APPROVE| V3[Area 3 Approved]
    D4 -->|APPROVE| V4[Area 4 Approved]
    D5 -->|APPROVE| V5[Area 5 Approved]
    D6 -->|APPROVE| V6[Area 6 Approved]

    V1 & V2 & V3 & V4 & V5 & V6 --> AWAIT[All 6 Areas Approved<br/>Assessment moves to Validators]

    subgraph VALIDATORS["VALIDATOR (NEW) - 3 Users | System-Wide | DILG Municipal Assessment Team"]
        AWAIT --> VAL[Validator Reviews<br/>ALL 6 Governance Areas<br/>Assigned by BLGU cluster]
        VAL --> VD{Decision}
    end

    VD -->|CALIBRATION<br/>Specific Indicators| CAL[Return to BLGU<br/>Calibration Required<br/>For specific indicators]
    CAL --> B

    VD -->|APPROVE| MLGOO_REVIEW

    subgraph MLGOO_STAGE["MLGOO - Final Approval"]
        MLGOO_REVIEW[MLGOO Reviews Assessment] --> MD{Decision}
    end

    MD -->|RE-CALIBRATION| RECAL[Return to BLGU<br/>Re-calibration Required]
    RECAL --> B
    B -->|After RE-CAL fix| RESUBMIT_RECAL[BLGU Resubmits]
    RESUBMIT_RECAL -->|Goes to VALIDATOR first| VAL

    MD -->|APPROVE| COMPLETE[COMPLETED<br/>BBI & BGAR Generated]

    style BLGU fill:#e1f5fe
    style ASSESSORS fill:#fff3e0
    style VALIDATORS fill:#f3e5f5
    style MLGOO_STAGE fill:#e8f5e9
    style COMPLETE fill:#c8e6c9
```

---

## RE-CALIBRATION Flow (MLGOO → VALIDATOR → MLGOO)

```mermaid
flowchart LR
    subgraph Step1["Step 1"]
        MLGOO1[MLGOO requests<br/>RE-CALIBRATION]
    end

    subgraph Step2["Step 2"]
        BLGU[BLGU fixes<br/>flagged items]
    end

    subgraph Step3["Step 3"]
        VAL[VALIDATOR reviews<br/>resubmission]
    end

    subgraph Step4["Step 4"]
        MLGOO2[MLGOO gives<br/>final approval]
    end

    subgraph Step5["Step 5"]
        DONE[COMPLETED<br/>BBI & BGAR]
    end

    MLGOO1 -->|"Sends back"| BLGU
    BLGU -->|"Resubmits"| VAL
    VAL -->|"Approves"| MLGOO2
    MLGOO2 -->|"Approves"| DONE

    style Step1 fill:#e8f5e9
    style Step2 fill:#e1f5fe
    style Step3 fill:#f3e5f5
    style Step4 fill:#e8f5e9
    style Step5 fill:#c8e6c9
```

**Key Points**:

- After RE-CALIBRATION, the assessment goes back to VALIDATOR before returning to MLGOO for final
  approval.
- Only 1 CALIBRATION is allowed per assessment. After BLGU resubmits, Validator can only APPROVE.

---

## Calibration Flow (1 Round Allowed)

```mermaid
flowchart TD
    subgraph First["FIRST VALIDATOR REVIEW"]
        V1[Validator reviews<br/>all 6 governance areas]
        V1 --> D1{Decision}
        D1 -->|APPROVE| APP1[Move to MLGOO]
        D1 -->|CALIBRATION| CAL1[Request calibration<br/>for specific indicators]
    end

    subgraph Resubmit["BLGU RESUBMISSION"]
        CAL1 --> BLGU[BLGU fixes<br/>flagged indicators]
        BLGU --> RS[Resubmit]
        RS --> FLAG[calibration_round_used = TRUE]
    end

    subgraph Second["SECOND VALIDATOR REVIEW (Final)"]
        FLAG --> V2[Validator reviews<br/>resubmitted items]
        V2 -->|Can only APPROVE| APP2[Move to MLGOO]

        V2 -.->|No more calibration allowed| X[❌ CALIBRATION disabled]
    end

    APP1 --> MLGOO[MLGOO Review]
    APP2 --> MLGOO

    style First fill:#f3e5f5
    style FLAG fill:#ffcdd2
    style Second fill:#e8f5e9
    style X fill:#ffcdd2,stroke:#d32f2f,stroke-dasharray: 5 5
```

---

## Compiled Rework Flow

```mermaid
flowchart TD
    subgraph Round1["FIRST SUBMISSION"]
        S1[BLGU submits all 6 areas]
        S1 --> A1[Assessor 1 reviews Area 1]
        S1 --> A2[Assessor 2 reviews Area 2]
        S1 --> A3[Assessor 3 reviews Area 3]
        S1 --> A4[Assessor 4 reviews Area 4]
        S1 --> A5[Assessor 5 reviews Area 5]
        S1 --> A6[Assessor 6 reviews Area 6]

        A1 -->|APPROVE| AP1[Area 1 Approved]
        A2 -->|REWORK| RW2[Area 2 Needs Rework]
        A3 -->|APPROVE| AP3[Area 3 Approved]
        A4 -->|REWORK| RW4[Area 4 Needs Rework]
        A5 -->|APPROVE| AP5[Area 5 Approved]
        A6 -->|REWORK| RW6[Area 6 Needs Rework]
    end

    subgraph Compiled["COMPILED REWORK VIEW (BLGU Dashboard)"]
        RW2 & RW4 & RW6 --> COMP[Rework Required<br/>━━━━━━━━━━━━━━<br/>Area 2: Disaster - Missing MOV<br/>Area 4: Social - Incorrect data<br/>Area 6: Environment - Incomplete<br/>━━━━━━━━━━━━━━<br/>This is your 1 allowed rework]
    end

    subgraph Resubmit["REWORK RESUBMISSION"]
        COMP --> FIX[BLGU fixes all 3 areas]
        FIX --> RS[Resubmit ALL rework areas together]
        RS --> FLAG[rework_round_used = TRUE]
    end

    subgraph Round2["SECOND REVIEW (Final)"]
        FLAG --> R2A2[Assessor 2 reviews Area 2]
        FLAG --> R2A4[Assessor 4 reviews Area 4]
        FLAG --> R2A6[Assessor 6 reviews Area 6]

        R2A2 -->|Can only APPROVE| AP2[Area 2 Approved]
        R2A4 -->|Can only APPROVE| AP4[Area 4 Approved]
        R2A6 -->|Can only APPROVE| AP6[Area 6 Approved]

        AP2 & AP4 & AP6 --> NOTE[No more rework allowed<br/>Assessors must approve]
    end

    AP1 & AP3 & AP5 & AP2 & AP4 & AP6 --> DONE[All 6 Areas Approved<br/>→ Notify BLGU<br/>→ Move to Validator]

    style Compiled fill:#fff3e0
    style FLAG fill:#ffcdd2
    style DONE fill:#c8e6c9
```

---

## Per-Area Status State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: BLGU creates assessment

    state "Per-Area Tracking" as AREA_TRACKING {
        state "Area Status" as AREA_STATUS {
            [*] --> AreaDraft: Area initialized
            AreaDraft --> AreaSubmitted: BLGU submits area
            AreaSubmitted --> AreaInReview: Assessor picks up
            AreaInReview --> AreaApproved: Assessor approves
            AreaInReview --> AreaRework: Assessor requests rework
            AreaRework --> AreaSubmitted: BLGU resubmits area
        }
        note right of AREA_STATUS
            Each of the 6 areas
            has its own status
        end note
    }

    state check_all <<choice>>
    AREA_TRACKING --> check_all: Check all areas
    check_all --> AWAITING_VALIDATION: All 6 areas approved
    check_all --> AREA_TRACKING: Some areas still pending

    state "Validator Review" as VAL_REVIEW {
        [*] --> ValidatorReview
        ValidatorReview --> Approved: Validator approves all
        ValidatorReview --> Calibration: Request calibration
        Calibration --> ValidatorReview: BLGU resubmits

        note right of Calibration
            Calibration targets
            specific indicators
        end note
    }

    AWAITING_VALIDATION --> VAL_REVIEW
    VAL_REVIEW --> AWAITING_MLGOO: Validator approves

    state "MLGOO Review" as MLGOO_REVIEW {
        [*] --> MLGOOReview
        MLGOOReview --> FinalApproval: MLGOO approves
        MLGOOReview --> ReCalibration: Request re-calibration
        ReCalibration --> MLGOOReview: BLGU resubmits
    }

    AWAITING_MLGOO --> MLGOO_REVIEW
    MLGOO_REVIEW --> COMPLETED: MLGOO approves
    COMPLETED --> [*]
```

---

## Per-Area Progress View (BLGU Dashboard)

```mermaid
flowchart TB
    subgraph Dashboard["BLGU Assessment Dashboard"]
        direction TB

        subgraph Header["Assessment: 2024 SGLGB Evaluation"]
            STATUS[Overall Status: IN ASSESSOR REVIEW<br/>4/6 Areas Submitted | 2/6 Areas Approved]
        end

        subgraph Areas["Governance Areas Progress"]
            direction LR

            subgraph A1["Area 1: Financial"]
                A1S[✓ Approved]
                A1I[Ready for Validator]
            end

            subgraph A2["Area 2: Disaster"]
                A2S[⟳ In Review]
                A2I[Waiting for review]
            end

            subgraph A3["Area 3: Safety"]
                A3S[📝 Draft]
                A3I[Still working]
                A3B[Submit Area →]
            end

            subgraph A4["Area 4: Social"]
                A4S[⚠️ Rework Required]
                A4I[Changes requested]
                A4B[View Comments | Resubmit →]
            end

            subgraph A5["Area 5: Business"]
                A5S[✓ Approved]
                A5I[Ready for Validator]
            end

            subgraph A6["Area 6: Environment"]
                A6S[⟳ In Review]
                A6I[Waiting for review]
            end
        end

        subgraph ReworkPanel["Rework Summary (if any)"]
            RW[Areas requiring changes:<br/>• Area 4: Social - Please update indicator 4.2<br/><br/>Rework round: 0/1 used]
        end
    end

    style A1 fill:#c8e6c9
    style A2 fill:#fff3e0
    style A3 fill:#e3f2fd
    style A4 fill:#ffcdd2
    style A5 fill:#c8e6c9
    style A6 fill:#fff3e0
    style ReworkPanel fill:#fff8e1
```

Note: Assessor names/assignments are NOT shown to BLGU users.

---

## Assessor Queue View

```mermaid
flowchart TB
    subgraph AssessorDashboard["Assessor Dashboard - Financial (Area 1)"]
        direction TB

        subgraph Header["My Queue - Financial Governance Area"]
            FILTER[Showing: Submitted areas for my governance area only]
        end

        subgraph Queue["Pending Reviews"]
            direction TB

            subgraph Item1["Barangay San Jose"]
                I1S[Area 1: Financial - Submitted]
                I1D[Submitted: Jan 8, 2025]
                I1B[Review →]
            end

            subgraph Item2["Barangay Santa Cruz"]
                I2S[Area 1: Financial - Resubmitted after Rework]
                I2D[Resubmitted: Jan 9, 2025]
                I2B[Review →]
            end

            subgraph Item3["Barangay Poblacion"]
                I3S[Area 1: Financial - Submitted]
                I3D[Submitted: Jan 7, 2025]
                I3B[Review →]
            end
        end

        subgraph Completed["Recently Completed"]
            C1[Barangay Rizal - Approved ✓]
            C2[Barangay Mabini - Sent to Rework ⚠️]
        end
    end

    style Item1 fill:#fff3e0
    style Item2 fill:#ffecb3
    style Item3 fill:#fff3e0
```

---

## Validator Queue View

```mermaid
flowchart TB
    subgraph ValidatorDashboard["Validator Dashboard - DILG Municipal Assessment Team"]
        direction TB

        subgraph Header["My Queue - Assigned BLGU Clusters"]
            FILTER[Showing: Assessments with ALL 6 areas approved by Assessors]
        end

        subgraph Queue["Ready for Validation"]
            direction TB

            subgraph Item1["Barangay San Jose"]
                I1S[All 6 Areas Approved by Assessors ✓]
                I1D[Ready since: Jan 9, 2025]
                I1P[6/6 Areas Complete]
                I1B[Validate All Areas →]
            end

            subgraph Item2["Barangay Poblacion"]
                I2S[All 6 Areas Approved by Assessors ✓]
                I2D[Ready since: Jan 8, 2025]
                I2P[6/6 Areas Complete]
                I2B[Validate All Areas →]
            end
        end

        subgraph InProgress["In Calibration"]
            subgraph Cal1["Barangay Rizal"]
                C1S[Calibration Requested]
                C1I[3 indicators flagged]
                C1D[Waiting for BLGU resubmission]
            end
        end
    end

    style Item1 fill:#e8f5e9
    style Item2 fill:#e8f5e9
    style Cal1 fill:#fff3e0
```

---

## Role Comparison: Current vs New

```mermaid
flowchart TB
    subgraph Current["CURRENT SYSTEM"]
        direction LR
        C_ASSESSOR[ASSESSOR<br/>━━━━━━━━━━━━━━<br/>System-wide access<br/>Reviews ALL areas<br/>Requests REWORK<br/>No area assignment]
        C_VALIDATOR[VALIDATOR<br/>━━━━━━━━━━━━━━<br/>Area-specific<br/>Reviews ASSIGNED area<br/>Requests CALIBRATION<br/>Has validator_area_id]
    end

    subgraph New["NEW SYSTEM"]
        direction LR
        N_ASSESSOR[ASSESSOR<br/>━━━━━━━━━━━━━━<br/>Area-specific - 6 users<br/>Reviews ASSIGNED area<br/>Requests REWORK<br/>Has assessor_area_id]
        N_VALIDATOR[VALIDATOR<br/>━━━━━━━━━━━━━━<br/>System-wide - 3 users<br/>Reviews ALL areas<br/>Requests CALIBRATION<br/>Assigned BLGU clusters]
    end

    C_ASSESSOR -.->|"Logic moves to"| N_VALIDATOR
    C_VALIDATOR -.->|"Logic moves to"| N_ASSESSOR

    style C_ASSESSOR fill:#ffcdd2
    style C_VALIDATOR fill:#bbdefb
    style N_ASSESSOR fill:#bbdefb
    style N_VALIDATOR fill:#ffcdd2
```

---

## Data Migration Flow

```mermaid
flowchart TD
    subgraph Migration["Migration Process"]
        direction TB

        subgraph Step1["Step 1: Role Swap"]
            R1[Current ASSESSOR users] -->|"Become"| R1N[New VALIDATOR users]
            R2[Current VALIDATOR users] -->|"Become"| R2N[New ASSESSOR users]
        end

        subgraph Step2["Step 2: Field Rename"]
            F1[validator_area_id] -->|"Rename to"| F2[assessor_area_id]
        end

        subgraph Step3["Step 3: Assessment Reset"]
            A1[Assessments in REWORK status] -->|"Clean reset"| A2[Reset to SUBMITTED status]
            A3[Discard rework_comments] -->|"Clear"| A4[Empty rework history]
            A5[Reset rework_count] -->|"Set to"| A6[rework_count = 0]
        end

        subgraph Step4["Step 4: New Fields"]
            N1[Add area_submission_status JSON]
            N2[Add area_assessor_approved JSON]
            N3[Initialize existing assessments]
        end
    end

    Step1 --> Step2 --> Step3 --> Step4

    style Step1 fill:#e3f2fd
    style Step2 fill:#fff3e0
    style Step3 fill:#ffcdd2
    style Step4 fill:#e8f5e9
```

---

## New Database Schema Changes

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email
        enum role "ASSESSOR|VALIDATOR|MLGOO_DILG|BLGU_USER"
        int assessor_area_id FK "NEW: renamed from validator_area_id"
        int barangay_id FK
    }

    ASSESSMENTS {
        int id PK
        int barangay_id FK
        enum status
        json area_submission_status "NEW: per-area status tracking"
        json area_assessor_approved "NEW: per-area approval tracking"
        json rework_by_area "NEW: area-specific rework tracking"
    }

    GOVERNANCE_AREAS {
        int id PK
        string name
        string code
        enum area_type
    }

    USERS ||--o| GOVERNANCE_AREAS : "assessor_area_id"
    ASSESSMENTS ||--o{ GOVERNANCE_AREAS : "tracks per-area status"
```

---

## Area Submission Status JSON Structure

```json
{
  "area_submission_status": {
    "1": {
      "status": "approved",
      "submitted_at": "2025-01-08T10:00:00Z",
      "approved_at": "2025-01-09T14:30:00Z",
      "assessor_id": "uuid-assessor-1"
    },
    "2": {
      "status": "in_review",
      "submitted_at": "2025-01-09T09:00:00Z"
    },
    "3": {
      "status": "draft"
    },
    "4": {
      "status": "rework",
      "submitted_at": "2025-01-07T11:00:00Z",
      "rework_requested_at": "2025-01-08T16:00:00Z",
      "rework_comments": "Please provide updated MOV for indicator 4.2",
      "assessor_id": "uuid-assessor-4"
    },
    "5": {
      "status": "approved",
      "submitted_at": "2025-01-06T08:00:00Z",
      "approved_at": "2025-01-07T10:00:00Z",
      "assessor_id": "uuid-assessor-5"
    },
    "6": {
      "status": "in_review",
      "submitted_at": "2025-01-09T11:00:00Z"
    }
  },
  "area_assessor_approved": {
    "1": true,
    "2": false,
    "3": false,
    "4": false,
    "5": true,
    "6": false
  }
}
```

### Area Status Values

| Status      | Description                          |
| ----------- | ------------------------------------ |
| `draft`     | BLGU still working on this area      |
| `submitted` | BLGU submitted, waiting for assessor |
| `in_review` | Assessor is currently reviewing      |
| `rework`    | Assessor requested changes           |
| `approved`  | Assessor approved this area          |

---

## Implementation Phases

```mermaid
gantt
    title Implementation Phases
    dateFormat  YYYY-MM-DD

    section Phase 1: Database
    Create migration script           :p1a, 2025-01-10, 2d
    Add new JSON fields               :p1b, after p1a, 1d
    Rename validator_area_id          :p1c, after p1b, 1d
    Swap role enum values             :p1d, after p1c, 1d
    Reset reworked assessments        :p1e, after p1d, 1d

    section Phase 2: Backend
    Update User model                 :p2a, after p1e, 1d
    Update Assessment model           :p2b, after p2a, 1d
    Create area_submission_service    :p2c, after p2b, 2d
    Update assessor_service           :p2d, after p2c, 2d
    Update API dependencies           :p2e, after p2d, 1d
    Add new API endpoints             :p2f, after p2e, 2d

    section Phase 3: Frontend
    Update navigation                 :p3a, after p2f, 1d
    BLGU per-area submission UI       :p3b, after p3a, 3d
    Assessor queue updates            :p3c, after p3b, 2d
    Validator queue updates           :p3d, after p3c, 2d
    User management form updates      :p3e, after p3d, 1d

    section Phase 4: Testing
    Unit tests                        :p4a, after p3e, 2d
    Integration tests                 :p4b, after p4a, 2d
    Migration testing                 :p4c, after p4b, 1d
    UAT                               :p4d, after p4c, 3d
```

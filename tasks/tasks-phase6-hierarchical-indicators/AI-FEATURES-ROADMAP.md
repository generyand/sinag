# AI Features Roadmap - Hierarchical Indicator Creation

**Created:** November 9, 2025
**Status:** Future Enhancement (Post-MVP)
**Dependencies:** MVP Phase 1 & 2 must be complete and stable

---

## Overview

This document outlines the plan for integrating AI-assisted features into the Hierarchical Indicator Creation Wizard after the MVP has been deployed and validated with real users.

### Why Add AI Features?

Based on the system architect and AI architect recommendations, AI can significantly reduce indicator creation time:
- **Time Savings**: 60% faster creation (from 120 minutes → 45 minutes for 12 indicators)
- **Reduced Errors**: AI-generated schemas validated before user edits
- **Consistency**: Templates based on DILG SGLGB standards
- **Lower Barrier to Entry**: Non-technical MLGOO users can create complex schemas without JSON knowledge

### Prerequisites Before Starting

**Must Have:**
- ✅ MVP deployed and tested with real MLGOO users
- ✅ At least 20+ indicators created manually (provides training data/examples)
- ✅ User feedback collected on pain points and desired features
- ✅ Budget allocated for Gemini API usage (~₱100/governance area)

**Should Have:**
- ✅ Performance baseline established (current creation time per indicator)
- ✅ Cost tracking system for API usage
- ✅ Error monitoring for AI-generated content
- ✅ User satisfaction metrics (NPS score, task completion rate)

---

## Phase 3: AI Template Generation (Week 4)

### Goal
Enable MLGOO users to generate complete indicator structures from governance area names using Gemini AI.

### Features to Implement

#### Feature 3.1: AI-Powered Template Suggestion

**User Flow:**
1. User selects governance area (e.g., "Financial Administration and Sustainability")
2. System shows 3 options:
   - **SGLGB Standard Template** (pre-built, no AI)
   - **AI-Generated Template** (Gemini generates custom structure)
   - **Start from Scratch** (manual creation)
3. If AI-Generated selected:
   - Loading state (1-3 seconds)
   - AI returns hierarchical structure with 10-15 indicators
   - User reviews, edits, or regenerates
4. User proceeds to configure schemas

**Backend Implementation:**

```python
# apps/api/app/services/intelligence_service.py

async def generate_indicator_template(
    governance_area_name: str,
    sglgb_year: int = 2025
) -> IndicatorTemplateResponse:
    """
    Generate hierarchical indicator structure using Gemini.

    Returns:
        IndicatorTemplateResponse with:
        - List of indicators with codes, names, descriptions
        - Hierarchical structure (parent_code relationships)
        - Confidence scores per indicator
        - Rationale for each suggestion
    """

    prompt = f"""
You are an expert in the Philippine DILG Seal of Good Local Governance for Barangays (SGLGB).

Generate a complete hierarchical indicator structure for the governance area:
"{governance_area_name}"

Requirements:
1. Follow SGLGB {sglgb_year} guidelines
2. Create 2-4 root indicators (level 1: 1.1, 1.2, 1.3, 1.4)
3. Each root should have 2-5 sub-indicators (level 2: 1.1.1, 1.1.2, etc.)
4. Use proper hierarchical numbering
5. Each indicator needs:
   - code: hierarchical code (e.g., "1.1.1")
   - title: concise title (max 80 chars)
   - description: detailed description (100-200 chars)
   - weight: scoring weight (sum to 100 across siblings)
   - level: depth in hierarchy (1, 2, 3)
   - parent_code: parent indicator code (null for root)

Output Format (JSON):
{{
  "indicators": [
    {{
      "code": "1.1",
      "title": "...",
      "description": "...",
      "weight": 50,
      "level": 1,
      "parent_code": null,
      "confidence": 0.95,
      "rationale": "Standard SGLGB requirement..."
    }},
    ...
  ],
  "source": "SGLGB {sglgb_year} Guidelines",
  "overall_confidence": 0.92
}}

Important: Return ONLY valid JSON, no markdown formatting.
"""

    response = await gemini_client.generate_content(
        prompt,
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.3,  # Low for consistency
            "top_p": 0.95,
            "top_k": 40
        }
    )

    # Parse and validate
    template = IndicatorTemplateResponse.model_validate_json(response.text)

    return template
```

**Frontend Implementation:**

```typescript
// apps/web/src/components/features/indicators/builder/AITemplateSelector.tsx

export function AITemplateSelector({ governanceAreaId, onSelect }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const generateMutation = useGenerateIndicatorTemplate();

  async function handleAIGenerate() {
    setIsGenerating(true);

    try {
      const template = await generateMutation.mutateAsync({
        governance_area_id: governanceAreaId
      });

      // Load template into store
      onSelect(template.indicators);

      toast.success(
        `Generated ${template.indicators.length} indicators (${Math.round(template.overall_confidence * 100)}% confidence)`
      );
    } catch (error) {
      toast.error('AI generation failed. Please try standard template or create manually.');
      // Fallback to standard template
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>SGLGB Standard</CardTitle>
          <CardDescription>Pre-built template following official DILG guidelines</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => onSelect('standard')}>Use Standard</Button>
        </CardFooter>
      </Card>

      <Card className="border-primary">
        <CardHeader>
          <CardTitle>
            <SparklesIcon className="inline mr-2" />
            AI-Generated
          </CardTitle>
          <CardDescription>Custom structure generated by AI based on governance area</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            onClick={handleAIGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><Loader2 className="animate-spin mr-2" /> Generating...</>
            ) : (
              'Generate with AI'
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Start from Scratch</CardTitle>
          <CardDescription>Build indicator structure manually</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={() => onSelect('blank')}>
            Create Blank
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

**Tasks:**
- [ ] Add Gemini API credentials to backend `.env`
- [ ] Create `IndicatorTemplateResponse` Pydantic schema
- [ ] Implement `generate_indicator_template()` in intelligence_service
- [ ] Add `POST /api/v1/indicators/generate-template` endpoint
- [ ] Create React Query mutation hook
- [ ] Build `AITemplateSelector` component
- [ ] Add loading states and error handling
- [ ] Test with 5+ different governance area names
- [ ] Measure API cost per generation

---

## Phase 4: AI Schema Generation (Week 5)

### Goal
Enable MLGOO users to generate form_schema and calculation_schema from natural language descriptions.

### Features to Implement

#### Feature 4.1: Form Schema AI Generator

**User Flow:**
1. User selects an indicator in the tree
2. In Form Schema Builder tab, clicks "AI Generate" button
3. Modal appears: "Describe what data this indicator should collect"
4. User types: "Number of trainings conducted, participant count, budget spent"
5. AI generates complete form_schema with appropriate field types
6. User reviews in visual builder, makes tweaks if needed
7. User saves

**Backend Implementation:**

```python
# apps/api/app/services/intelligence_service.py

async def generate_form_schema(
    indicator_title: str,
    user_description: str,
    context: dict = None
) -> FormSchemaResponse:
    """
    Generate form_schema based on indicator and user description.
    """

    # Few-shot examples for better results
    examples = """
Example 1:
Input: "Collect number of posted documents and posting dates"
Output:
{
  "fields": [
    {
      "name": "num_documents",
      "label": "Number of Documents Posted",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 100
    },
    {
      "name": "posting_dates",
      "label": "Posting Dates",
      "type": "date",
      "required": true,
      "isArray": true
    },
    {
      "name": "mov_files",
      "label": "Means of Verification (MOV)",
      "type": "file",
      "required": true,
      "isArray": true,
      "accept": [".pdf", ".jpg", ".png"],
      "maxFiles": 10
    }
  ]
}

Example 2:
Input: "Track compliance status and attach proof documents"
Output:
{
  "fields": [
    {
      "name": "is_compliant",
      "label": "Compliance Status",
      "type": "boolean",
      "required": true
    },
    {
      "name": "proof_documents",
      "label": "Means of Verification (MOV)",
      "type": "file",
      "required": true,
      "isArray": true,
      "accept": [".pdf", ".jpg", ".png"],
      "maxFiles": 10
    }
  ]
}
"""

    prompt = f"""
You are an expert in DILG SGLGB assessment form design.

Generate a form_schema for this indicator:
Title: "{indicator_title}"
Description: "{user_description}"

{examples}

Now generate the form_schema following the same JSON structure.

Rules:
1. Use appropriate field types: number, text, date, boolean, file, select, checkbox_group
2. Include validation rules (required, min, max, pattern)
3. For file uploads, always add MOV-appropriate accept types
4. Keep field names snake_case, labels Title Case
5. Add helpful descriptions where needed
6. ALWAYS include a "mov_files" field for Means of Verification

Output ONLY valid JSON matching the example format.
"""

    response = await gemini_client.generate_content(
        prompt,
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.4,
        }
    )

    # Validate against FormSchema Pydantic model
    schema = FormSchema.model_validate_json(response.text)

    # Additional backend validation
    validation_result = validate_form_schema(schema)

    return {
        "schema": schema,
        "validation": validation_result,
        "warnings": check_schema_quality(schema)
    }
```

**Frontend Implementation:**

```typescript
// apps/web/src/components/features/indicators/builder/FormSchemaBuilder.tsx

export function FormSchemaBuilder({ indicator, onChange }: Props) {
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const generateMutation = useGenerateFormSchema();

  async function handleAIGenerate(description: string) {
    try {
      const result = await generateMutation.mutateAsync({
        indicator_title: indicator.name,
        user_description: description
      });

      // Load generated schema into visual builder
      onChange(result.schema);

      // Show warnings if any
      if (result.warnings.length > 0) {
        toast.warning(
          `Schema generated with ${result.warnings.length} suggestions`,
          {
            action: {
              label: 'Review',
              onClick: () => showWarningsDialog(result.warnings)
            }
          }
        );
      } else {
        toast.success('Form schema generated successfully!');
      }
    } catch (error) {
      toast.error('AI generation failed. Please build manually.');
    } finally {
      setAiPromptOpen(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Form Fields</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAiPromptOpen(true)}
        >
          <SparklesIcon className="mr-2" />
          AI Generate
        </Button>
      </div>

      {/* Visual form builder */}
      <VisualFormBuilder schema={currentSchema} onChange={onChange} />

      {/* AI Prompt Dialog */}
      <Dialog open={aiPromptOpen} onOpenChange={setAiPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Form Schema Generator</DialogTitle>
            <DialogDescription>
              Describe what data this indicator should collect, and AI will generate the form fields.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Example: Number of trainings conducted, participant count, budget spent, training dates, completion status"
            rows={4}
            ref={promptRef}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiPromptOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleAIGenerate(promptRef.current.value)}>
              Generate Schema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

#### Feature 4.2: Calculation Schema AI Generator

Similar to form schema, but generates conditional logic from natural language scoring rules.

**Example User Input:**
"100 points if all documents posted, 50 points if at least 5 documents, 0 otherwise"

**AI Output:**
```json
{
  "type": "conditional",
  "rules": [
    {
      "condition": "documents_posted.length == 7",
      "score": 100
    },
    {
      "condition": "documents_posted.length >= 5",
      "score": 50
    }
  ],
  "default": 0
}
```

**Tasks:**
- [ ] Implement `generate_form_schema()` with few-shot prompting
- [ ] Implement `generate_calculation_schema()`
- [ ] Add `POST /api/v1/indicators/generate-form-schema` endpoint
- [ ] Add `POST /api/v1/indicators/generate-calculation-schema` endpoint
- [ ] Create AI prompt dialog components
- [ ] Add "AI Generate" buttons to schema builders
- [ ] Implement validation warnings display
- [ ] Test with 20+ different user descriptions
- [ ] Measure accuracy (% of schemas that need no edits)

---

## Phase 5: AI Validation & Suggestions (Week 6)

### Goal
Use AI to detect issues and suggest improvements across the entire indicator set.

### Features to Implement

#### Feature 5.1: Cross-Indicator AI Validation

**User Flow:**
1. User completes all indicators in wizard
2. In Step 4 (Review), clicks "AI Validate" button
3. AI analyzes entire indicator set for:
   - Semantic issues (redundant indicators, overlapping criteria)
   - Missing critical requirements
   - Inconsistent terminology
   - Calculation errors (field references, logic flaws)
4. AI returns structured suggestions with severity levels
5. User reviews and fixes issues before publishing

**Backend Implementation:**

```python
async def validate_indicator_set_ai(
    indicators: List[IndicatorDraft]
) -> AIValidationReport:
    """
    AI-powered semantic validation of entire indicator set.
    """

    # Rule-based validation first (fast)
    rule_based_issues = validate_tree_structure(indicators)

    # AI semantic validation (slower, more thorough)
    ai_prompt = f"""
Analyze this SGLGB indicator set for semantic issues:

{json.dumps([i.dict() for i in indicators], indent=2)}

Check for:
1. Redundant or overlapping indicators
2. Missing critical SGLGB requirements
3. Inconsistent terminology across indicators
4. Unclear or ambiguous descriptions
5. Calculation logic errors (field references, type mismatches)

Return issues in this JSON format:
{{
  "issues": [
    {{
      "indicator_code": "1.1",
      "type": "warning",
      "category": "redundancy",
      "message": "...",
      "suggestion": "..."
    }}
  ]
}}
"""

    ai_response = await gemini_client.generate_content(
        ai_prompt,
        generation_config={"response_mime_type": "application/json"}
    )

    ai_issues = json.loads(ai_response.text)["issues"]

    return AIValidationReport(
        issues=rule_based_issues + ai_issues,
        total_indicators=len(indicators),
        error_count=len([i for i in all_issues if i['type'] == 'error']),
        warning_count=len([i for i in all_issues if i['type'] == 'warning'])
    )
```

**Frontend Implementation:**

```typescript
// ValidationSummary.tsx

export function ValidationSummary({ indicators }: Props) {
  const [aiValidating, setAiValidating] = useState(false);
  const validateMutation = useAIValidateIndicators();

  async function handleAIValidate() {
    setAiValidating(true);

    try {
      const report = await validateMutation.mutateAsync({ indicators });

      // Display issues grouped by severity
      setValidationIssues(report.issues);

      if (report.error_count > 0) {
        toast.error(`Found ${report.error_count} errors that must be fixed`);
      } else if (report.warning_count > 0) {
        toast.warning(`Found ${report.warning_count} suggestions for improvement`);
      } else {
        toast.success('No issues found! Ready to publish.');
      }
    } catch (error) {
      toast.error('AI validation failed. Proceeding with basic validation only.');
    } finally {
      setAiValidating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Validation Summary</CardTitle>
          <Button
            variant="outline"
            onClick={handleAIValidate}
            disabled={aiValidating}
          >
            {aiValidating ? (
              <><Loader2 className="animate-spin mr-2" /> AI Validating...</>
            ) : (
              <><SparklesIcon className="mr-2" /> AI Validate</>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Display validation issues */}
      </CardContent>
    </Card>
  );
}
```

**Tasks:**
- [ ] Implement `validate_indicator_set_ai()` service
- [ ] Add `POST /api/v1/indicators/validate-ai` endpoint
- [ ] Create AI validation UI component
- [ ] Display issues with links to fix
- [ ] Add "Apply AI Suggestion" quick-fix buttons
- [ ] Test with intentionally flawed indicator sets

---

## Technical Architecture for AI Features

### 1. Gemini API Integration

**Configuration:**

```python
# apps/api/app/core/config.py

class Settings(BaseSettings):
    # Existing settings...

    # Gemini API settings
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"  # or gemini-1.5-pro
    GEMINI_MAX_RETRIES: int = 3
    GEMINI_TIMEOUT_SECONDS: int = 30

    # Cost tracking
    GEMINI_COST_PER_1K_INPUT_TOKENS: float = 0.00001875  # $0.00001875/1K tokens
    GEMINI_COST_PER_1K_OUTPUT_TOKENS: float = 0.000075   # $0.000075/1K tokens
    GEMINI_MONTHLY_BUDGET_PHP: float = 5000.0  # ₱5000/month limit
```

**Service Layer:**

```python
# apps/api/app/services/gemini_service.py

import google.generativeai as genai
from app.core.config import settings

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        self.total_cost = 0.0  # Track session cost

    async def generate_with_retry(
        self,
        prompt: str,
        generation_config: dict,
        max_retries: int = 3
    ) -> str:
        """Generate content with exponential backoff retry."""

        for attempt in range(max_retries):
            try:
                response = await self.model.generate_content_async(
                    prompt,
                    generation_config=generation_config
                )

                # Track cost
                self._track_cost(response.usage_metadata)

                return response.text

            except Exception as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    continue
                else:
                    raise GeminiAPIError(f"Failed after {max_retries} attempts: {e}")

    def _track_cost(self, usage: UsageMetadata):
        """Calculate and track API cost."""
        input_cost = (usage.prompt_token_count / 1000) * settings.GEMINI_COST_PER_1K_INPUT_TOKENS
        output_cost = (usage.candidates_token_count / 1000) * settings.GEMINI_COST_PER_1K_OUTPUT_TOKENS

        total = (input_cost + output_cost) * 55  # Convert USD to PHP (₱55/USD)
        self.total_cost += total

        # Log to monitoring system
        logger.info(f"Gemini API call cost: ₱{total:.4f} (Total session: ₱{self.total_cost:.2f})")

        # Check budget
        if self.total_cost > settings.GEMINI_MONTHLY_BUDGET_PHP:
            raise BudgetExceededError("Monthly Gemini API budget exceeded")

gemini_service = GeminiService()
```

### 2. Prompt Engineering Best Practices

**Key Principles:**
1. **Use Structured Output**: Always set `response_mime_type: "application/json"`
2. **Few-Shot Examples**: Include 2-3 examples in every domain-specific prompt
3. **Temperature Settings**:
   - Template generation: 0.3 (consistent structure)
   - Schema generation: 0.4 (some creativity)
   - Validation: 0.2 (strict, deterministic)
4. **Token Optimization**: Keep prompts under 2000 tokens
5. **Error Handling**: Always validate AI output with Pydantic

**Prompt Template Library:**

```python
# apps/api/app/services/prompt_templates.py

INDICATOR_TEMPLATE_PROMPT = """
You are an expert in the Philippine DILG Seal of Good Local Governance for Barangays (SGLGB) {year}.

Generate a complete hierarchical indicator structure for:
Governance Area: "{governance_area_name}"

Context:
- SGLGB assesses barangays across 10 governance areas
- Each area has 2-4 root indicators (level 1)
- Root indicators have 2-5 sub-indicators (level 2)
- Indicators use hierarchical numbering (1.1, 1.1.1, etc.)
- Total weights must sum to 100% across siblings

{few_shot_examples}

Output Format (JSON):
{{
  "indicators": [...],
  "source": "SGLGB {year} Guidelines",
  "overall_confidence": 0.92
}}

Generate indicators now for "{governance_area_name}":
"""

FORM_SCHEMA_PROMPT = """
You are an expert in DILG SGLGB assessment form design.

Generate a form_schema for this indicator:
Title: "{indicator_title}"
Description: "{user_description}"

{few_shot_examples}

Rules:
1. Use appropriate field types: number, text, date, boolean, file, select, checkbox_group
2. Include validation rules (required, min, max, pattern)
3. ALWAYS include a "mov_files" field for Means of Verification
4. Keep field names snake_case, labels Title Case

Return ONLY valid JSON.
"""
```

### 3. Error Handling & Fallbacks

```python
# apps/api/app/services/intelligence_service.py

async def safe_ai_generation(
    operation: Callable,
    fallback_value: Any,
    error_message: str
) -> Any:
    """Wrapper for AI operations with graceful degradation."""
    try:
        result = await operation()
        return result
    except GeminiAPIError as e:
        logger.error(f"{error_message}: {e}")
        # Return fallback (e.g., standard template, empty schema)
        return fallback_value
    except ValidationError as e:
        logger.error(f"AI generated invalid output: {e}")
        return fallback_value
    except BudgetExceededError as e:
        logger.warning(f"Budget exceeded: {e}")
        # Disable AI features for remainder of session
        disable_ai_features()
        return fallback_value
```

### 4. Monitoring & Analytics

**Metrics to Track:**
- AI generation success rate (%)
- Average response time (ms)
- Cost per generation (PHP)
- User edit rate (% of AI-generated content edited)
- User satisfaction with AI features (survey)

**Implementation:**

```python
# apps/api/app/services/analytics_service.py

class AIUsageTracker:
    def track_generation(
        self,
        feature: str,  # "template", "form_schema", "validation"
        success: bool,
        response_time_ms: float,
        cost_php: float,
        user_id: int
    ):
        """Log AI feature usage for analytics."""

        db.add(AIUsageLog(
            feature=feature,
            success=success,
            response_time_ms=response_time_ms,
            cost_php=cost_php,
            user_id=user_id,
            timestamp=datetime.utcnow()
        ))

        db.commit()
```

---

## Cost Analysis & Budgeting

### Estimated Costs (Gemini 2.0 Flash)

**Per Operation:**
- Template generation (12 indicators): ~2000 input tokens, ~1500 output tokens = ₱0.06
- Form schema generation: ~500 input tokens, ~300 output tokens = ₱0.015
- Calculation schema generation: ~400 input tokens, ~200 output tokens = ₱0.01
- AI validation (full set): ~3000 input tokens, ~1000 output tokens = ₱0.08

**Per Governance Area (Complete Creation with AI):**
- 1 template generation: ₱0.06
- 12 form schemas: ₱0.18
- 12 calculation schemas: ₱0.12
- 1 AI validation: ₱0.08
- **Total: ~₱0.44 per governance area**

**Monthly Estimates:**
- 10 governance areas created/month: ₱4.40
- 50 schema regenerations/month: ₱0.75
- 20 AI validations/month: ₱1.60
- **Total: ~₱7/month**

**Buffer for errors/retries:** 3x = ₱21/month

**Recommended Budget:** ₱50-100/month for safety margin

### Cost Optimization Strategies

1. **Caching**: Cache AI responses for identical prompts (30-day TTL)
2. **Rate Limiting**: Max 5 AI generations per user per minute
3. **Batch Operations**: Generate multiple schemas in one API call
4. **Fallback Models**: Use Gemini Flash (cheaper) instead of Pro when possible
5. **User Quotas**: Limit AI generations per user per day (e.g., 20 generations/day)

---

## Testing Strategy for AI Features

### 1. Prompt Quality Testing

**Test Cases:**
- [ ] Generate templates for all 10 SGLGB governance areas
- [ ] Verify hierarchical structure correctness (no circular refs, proper numbering)
- [ ] Check confidence scores are realistic (0.7-0.95 range)
- [ ] Validate JSON structure matches Pydantic schema

**Success Criteria:**
- 90%+ of templates require no manual restructuring
- All templates pass backend validation
- Confidence scores correlate with user satisfaction

### 2. Schema Generation Testing

**Test Cases:**
- [ ] Test with 20+ different user descriptions
- [ ] Verify generated fields have appropriate types
- [ ] Check MOV field is always included
- [ ] Test edge cases (vague descriptions, conflicting requirements)

**Success Criteria:**
- 80%+ of schemas usable with minor edits only
- All schemas pass form_schema validation
- Field names follow snake_case convention

### 3. Validation Accuracy Testing

**Test Cases:**
- [ ] Create indicator sets with known issues (missing fields, circular refs, etc.)
- [ ] Verify AI detects all seeded issues
- [ ] Check false positive rate (< 10%)
- [ ] Test with valid indicator sets (should return no issues)

**Success Criteria:**
- 95%+ issue detection rate
- < 10% false positive rate
- All critical errors (calculation refs) caught

### 4. Performance Testing

**Test Cases:**
- [ ] Measure P50, P95, P99 response times
- [ ] Test concurrent AI requests (10 users simultaneously)
- [ ] Verify timeout handling (> 30 seconds)
- [ ] Test with rate limiting active

**Success Criteria:**
- P95 response time < 5 seconds
- No 500 errors under load
- Graceful degradation when API unavailable

---

## Rollout Plan

### Phase 1: Internal Testing (Week 4)
- [ ] Deploy AI features to staging environment
- [ ] SINAG dev team tests with real data
- [ ] Collect feedback on AI quality
- [ ] Fix critical bugs

### Phase 2: Beta Testing (Week 5)
- [ ] Enable AI features for 2-3 MLGOO users (feature flag)
- [ ] Monitor usage metrics and costs
- [ ] Collect user feedback surveys
- [ ] Iterate on prompts based on feedback

### Phase 3: Limited Release (Week 6)
- [ ] Enable AI for 50% of MLGOO users (A/B test)
- [ ] Compare creation time: AI-assisted vs. manual
- [ ] Measure error rates and user satisfaction
- [ ] Adjust quotas/budgets based on usage

### Phase 4: General Availability (Week 7)
- [ ] Enable AI for all MLGOO users
- [ ] Add AI usage to onboarding/tutorials
- [ ] Monitor costs and performance
- [ ] Plan next AI enhancements based on data

---

## Decision Criteria: When to Add AI Features

**Go Ahead if:**
- ✅ MVP has been live for 30+ days
- ✅ At least 50 indicators created manually (provides examples)
- ✅ User feedback indicates schema creation is a pain point
- ✅ Budget approved for ₱50-100/month API costs
- ✅ Development team has bandwidth for 3 weeks of work

**Hold Off if:**
- ❌ MVP still has critical bugs or performance issues
- ❌ Users completing indicator creation in < 30 minutes already
- ❌ Budget constraints prevent AI API spending
- ❌ Team focused on higher-priority features

---

## Future AI Enhancements (Post-Phase 5)

### 1. Learning from User Edits
- Track which AI-generated schemas get edited
- Fine-tune prompts based on common corrections
- Build custom templates from frequently used patterns

### 2. Intelligent Auto-Complete
- As user types in form builder, suggest next field based on context
- Pre-fill field properties (label, type) using AI

### 3. Natural Language Calculation Builder
- "If completion rate is above 80% and all documents submitted, then Pass"
- AI converts to structured calculation_schema

### 4. Cross-Language Support
- Generate indicators in English and Filipino
- Translate existing indicators using AI

### 5. MOV Requirement Generator
- AI suggests appropriate MOVs based on indicator type
- Auto-generate photo requirements, document checklists

---

## Key Files & Endpoints (AI Features)

### Backend Files
```
apps/api/app/
├── core/
│   └── gemini_client.py (Gemini SDK wrapper)
├── services/
│   ├── gemini_service.py (AI service with cost tracking)
│   ├── prompt_templates.py (Prompt library)
│   └── intelligence_service.py (extend with AI methods)
├── schemas/
│   └── ai_schemas.py (AI request/response models)
└── api/v1/
    └── indicators.py (add AI endpoints)
```

### New API Endpoints
```
POST /api/v1/indicators/generate-template
  Request: { governance_area_id: int }
  Response: IndicatorTemplateResponse

POST /api/v1/indicators/generate-form-schema
  Request: { indicator_title: str, user_description: str }
  Response: FormSchemaResponse

POST /api/v1/indicators/generate-calculation-schema
  Request: { form_schema: dict, scoring_description: str }
  Response: CalculationSchemaResponse

POST /api/v1/indicators/validate-ai
  Request: { indicators: List[IndicatorDraft] }
  Response: AIValidationReport
```

### Frontend Files
```
apps/web/src/
├── components/features/indicators/builder/
│   ├── AITemplateSelector.tsx
│   ├── AISchemaGenerator.tsx (reusable)
│   └── AIValidationPanel.tsx
├── hooks/
│   └── useAIGeneration.ts (wrapper for AI mutations)
└── lib/
    └── ai-utils.ts (AI-related utilities)
```

---

## Summary Checklist

**Before Starting AI Implementation:**
- [ ] MVP deployed and stable
- [ ] User feedback collected
- [ ] Budget approved (₱50-100/month)
- [ ] Gemini API credentials obtained
- [ ] Development team allocated (3 weeks)

**Phase 3 (Week 4): Template Generation**
- [ ] Backend: intelligence_service.py with generate_indicator_template()
- [ ] Backend: POST /api/v1/indicators/generate-template endpoint
- [ ] Frontend: AITemplateSelector component
- [ ] Testing: 10 governance areas, measure accuracy

**Phase 4 (Week 5): Schema Generation**
- [ ] Backend: generate_form_schema(), generate_calculation_schema()
- [ ] Backend: Schema generation endpoints
- [ ] Frontend: AI Generate buttons in schema builders
- [ ] Testing: 20+ descriptions, measure edit rate

**Phase 5 (Week 6): AI Validation**
- [ ] Backend: validate_indicator_set_ai()
- [ ] Backend: POST /api/v1/indicators/validate-ai endpoint
- [ ] Frontend: AI Validate button in review step
- [ ] Testing: Seeded issues, false positive rate

**Rollout:**
- [ ] Internal testing (dev team)
- [ ] Beta testing (2-3 users)
- [ ] A/B testing (50% rollout)
- [ ] General availability

---

**Last Updated:** November 9, 2025
**Estimated Timeline:** 3 weeks (after MVP completion)
**Estimated Budget:** ₱50-100/month ongoing

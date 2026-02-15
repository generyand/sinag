# 🧠 Intelligence Service
# Business logic for SGLGB compliance classification and AI-powered insights

import json
import re
import threading
import time
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

import google.generativeai as genai
from loguru import logger
from prometheus_client import Counter, Gauge, Histogram
from pybreaker import CircuitBreaker, CircuitBreakerError
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy.orm.attributes import flag_modified

from app.core.config import settings
from app.db.enums import ComplianceStatus, ValidationStatus
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.governance_area import GovernanceArea, Indicator
from app.schemas.calculation_schema import (
    AndAllRule,
    BBIFunctionalityCheckRule,
    CalculationRule,
    CalculationSchema,
    ConditionGroup,
    CountThresholdRule,
    MatchValueRule,
    OrAnyRule,
    PercentageThresholdRule,
)

# ========================================
# OBSERVABILITY METRICS (Prometheus)
# ========================================

# Counter for total Gemini API requests
gemini_requests_total = Counter(
    "gemini_api_requests_total",
    "Total Gemini API requests",
    ["status", "language", "operation"],
)

# Histogram for API latency
gemini_latency_seconds = Histogram(
    "gemini_api_duration_seconds",
    "Gemini API call duration in seconds",
    ["operation"],
    buckets=[0.5, 1, 2, 5, 10, 20, 30, 60],
)

# Counter for cache operations
cache_operations_total = Counter(
    "intelligence_cache_operations_total",
    "Cache hit/miss counter",
    ["operation", "result"],  # operation: insights/rework/capdev, result: hit/miss
)

# Gauge for circuit breaker state
circuit_breaker_state = Gauge(
    "gemini_circuit_breaker_state",
    "Circuit breaker state (0=closed, 1=open, 2=half-open)",
)

# Counter for rate limit events
rate_limit_events = Counter(
    "intelligence_rate_limit_events_total",
    "Rate limit events",
    ["action"],  # allowed, denied
)

# ========================================
# CIRCUIT BREAKER CONFIGURATION
# ========================================

# Circuit breaker for Gemini API calls
# Opens after 5 consecutive failures, stays open for 60 seconds
gemini_circuit_breaker = CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    name="gemini_api",
)

# ========================================
# RATE LIMITER (Token Bucket Algorithm)
# ========================================


class RateLimiter:
    """
    Thread-safe token bucket rate limiter for Gemini API calls.

    Default: 10 requests per minute per operation type.
    This prevents API quota exhaustion and provides cost control.
    """

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def acquire(self, key: str = "default") -> bool:
        """
        Try to acquire a rate limit token.

        Args:
            key: Identifier for rate limiting (e.g., user_id, operation_type)

        Returns:
            True if request is allowed, False if rate limited
        """
        with self._lock:
            now = time.time()
            window_start = now - self.window_seconds

            # Initialize or clean up old requests
            if key not in self._requests:
                self._requests[key] = []

            # Remove requests outside the window
            self._requests[key] = [t for t in self._requests[key] if t > window_start]

            # Check if we're within the limit
            if len(self._requests[key]) >= self.max_requests:
                rate_limit_events.labels(action="denied").inc()
                return False

            # Record this request
            self._requests[key].append(now)
            rate_limit_events.labels(action="allowed").inc()
            return True

    def get_remaining(self, key: str = "default") -> int:
        """Get remaining requests in the current window."""
        with self._lock:
            now = time.time()
            window_start = now - self.window_seconds

            if key not in self._requests:
                return self.max_requests

            # Count requests in window
            active_requests = [t for t in self._requests[key] if t > window_start]
            return max(0, self.max_requests - len(active_requests))


# Global rate limiter instance (10 requests per minute)
gemini_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)

# ========================================
# SUPPORTED LANGUAGES
# ========================================

SUPPORTED_LANGUAGES = {"ceb", "en", "fil"}

# Core governance areas (must all pass for compliance)
CORE_AREAS = [
    "Financial Administration and Sustainability",
    "Disaster Preparedness",
    "Safety, Peace and Order",
]

# Essential governance areas (at least one must pass for compliance)
ESSENTIAL_AREAS = [
    "Social Protection and Sensitivity",
    "Business-Friendliness and Competitiveness",
    "Environmental Management",
]

# Language instructions for AI-generated summaries
LANGUAGE_INSTRUCTIONS = {
    "ceb": """
IMPORTANTE: Isulat ang TANAN nga output sa Binisaya (Cebuano).

LANGUAGE REQUIREMENTS:
1. Gamita ang CONVERSATIONAL Bisaya - ang klase nga ginasulti sa adlaw-adlaw
2. Isulat nga daw nagpasabot sa barangay kagawad sa regular meeting
3. Ayaw gamita ang deep/literary Bisaya - simple lang nga mga pulong

CRITICAL - DUAL AUDIENCE CONSIDERATION:
4. Para sa "key_issues": Gamita ang 3rd person POV (ikatolong tawo)
   - TAMA: "Kulang ang Annual Budget sa barangay"
   - SAYOP: "Kulang ang imong Annual Budget"
   - NGANO: Ang "key_issues" makita sa dashboard sa MLGOO officials nga nagtan-aw sa DAGHANG barangay

5. Para sa "suggested_actions": Gamita ang 2nd person active voice (ikaduhang tawo)
   - TAMA: "Kinahanglan nimo i-upload ang updated Annual Budget"
   - NGANO: Ang "suggested_actions" direkta nga gipakita sa BLGU users

TECHNICAL TERMS - Gamita kini nga mga translation:
- governance area = "lugar sa pagdumala"
- compliance = "pagsunod sa mga lagda"
- assessment = "pagsusi"
- indicator = "timaan"
- validation = "pagpamatud"
- capacity development = "pagpalambo sa abilidad"
- intervention = "aksyon o programa"
- priority = "prayoridad"
- weakness = "kahuyang"
- recommendation = "rekomendasyon"
- training = "training"

PABILIN SA ENGLISH (ayaw i-translate):
- Agency acronyms: DILG, SGLGB, LGA, MDRRMO, DBM
- "MOV" (Means of Verification)
- Proper nouns: pangalan sa barangay, pangalan sa tawo
- JSON keys (e.g., "area_name", "description", "severity")

SPECIFICITY REQUIREMENTS (IMPORTANTE KAAYO):
- SEMPRE isulat ang ngalan sa specific indicator/document/plan sa key_issues
- AYAW paggamit sa vague terms nga walay context
- TAMA: "Kulang ang Disaster Preparedness Plan sa barangay"
- SAYOP: "walay husto nga plano" (UNSA NGA plano?)
- TAMA: "Wala gi-upload ang Annual Investment Plan 2024"
- SAYOP: "Missing documents" (UNSA NGA dokumento?)

EXAMPLES SA MAAYO NGA KEY_ISSUES (3rd person, specific):
- "Kulang ang Disaster Preparedness Plan sa barangay"
- "Wala gi-upload ang Annual Budget Ordinance para sa 2024"
- "Ang Barangay Development Plan wala'y klaro nga timeline"
- "Incomplete ang dokumentasyon sa BDRRMC training records"

EXAMPLES SA MAAYO NGA SUGGESTED_ACTIONS (2nd person, actionable):
- "Kinahanglan nimo i-upload ang updated Disaster Preparedness Plan"
- "Importante nga ang barangay treasurer mag-attend sa training mahitungod sa financial management"
- "I-update ang Barangay Development Plan ug ibutang ang timeline para sa matag proyekto"

EXAMPLES SA DILI MAAYO (ayaw sunda):
- "walay husto nga plano" (vague - unsa nga plano?)
- "Kinahanglan ang barangay mag-update sa ilang records" (2nd person sa key_issues - SAYOP)
- "Missing documents" (vague - unsa nga dokumento?)
- "Kulang ang imong budget" (2nd person sa key_issues - SAYOP)

JSON VALUES: Kinahanglan sa Bisaya. JSON KEYS: Pabilin sa English.
""",
    "fil": """
IMPORTANTE: Isulat ang LAHAT ng output sa Filipino (Tagalog).

LANGUAGE REQUIREMENTS:
1. Gumamit ng NATURAL na Filipino - ang Filipino na ginagamit sa pang-araw-araw na usapan
2. Isulat na parang nagpapaliwanag sa isang barangay kagawad sa regular na pulong
3. Iwasan ang malalim o pormal na Tagalog - simple lang

CRITICAL - DUAL AUDIENCE CONSIDERATION:
4. Para sa "key_issues": Gumamit ng 3rd person POV (ikatlong panauhan)
   - TAMA: "Kulang ang Annual Budget ng barangay"
   - MALI: "Kulang ang iyong Annual Budget"
   - BAKIT: Ang "key_issues" ay makikita sa dashboard ng MLGOO officials na tumitingin sa MARAMING barangay

5. Para sa "suggested_actions": Gumamit ng 2nd person active voice (ikalawang panauhan)
   - TAMA: "Kailangan mong i-upload ang updated Annual Budget"
   - BAKIT: Ang "suggested_actions" ay direktang ipinapakita sa BLGU users

TECHNICAL TERMS - Gamitin ang mga sumusunod:
- governance area = "larangan ng pamamahala"
- compliance = "pagsunod sa mga pamantayan"
- assessment = "pagsusuri"
- indicator = "tagapagpahiwatig"
- validation = "pagpapatunay"
- capacity development = "pagpapaunlad ng kakayahan"
- intervention = "interbensyon"
- priority = "prayoridad"
- weakness = "kahinaan"
- recommendation = "rekomendasyon"
- training = "pagsasanay"

PANATILIHING ENGLISH (walang salin):
- Agency acronyms: DILG, SGLGB, LGA, MDRRMO, DBM
- "MOV" (Means of Verification)
- Proper nouns: pangalan ng barangay, pangalan ng tao
- JSON keys (e.g., "area_name", "description", "severity")

SPECIFICITY REQUIREMENTS (NAPAKA-IMPORTANTE):
- PALAGING isulat ang pangalan ng specific indicator/document/plan sa key_issues
- HUWAG gumamit ng vague terms na walang context
- TAMA: "Kulang ang Disaster Preparedness Plan ng barangay"
- MALI: "walang wastong plano" (ALING plano?)
- TAMA: "Hindi pa na-upload ang Annual Investment Plan 2024"
- MALI: "Missing documents" (ALING dokumento?)

HALIMBAWA NG MAGANDANG KEY_ISSUES (3rd person, specific):
- "Kulang ang Disaster Preparedness Plan ng barangay"
- "Hindi pa na-upload ang Annual Budget Ordinance para sa 2024"
- "Ang Barangay Development Plan ay walang malinaw na timeline"
- "Incomplete ang dokumentasyon ng BDRRMC training records"

HALIMBAWA NG MAGANDANG SUGGESTED_ACTIONS (2nd person, actionable):
- "Kailangan mong i-upload ang updated Disaster Preparedness Plan"
- "Mahalagang mag-attend ang barangay treasurer sa training tungkol sa financial management"
- "I-update ang Barangay Development Plan at lagyan ng timeline ang bawat proyekto"

HALIMBAWA NG DI-MAGANDA (iwasan):
- "walang wastong plano" (vague - aling plano?)
- "Kailangan ng barangay na mag-update ng kanilang records" (2nd person sa key_issues - MALI)
- "Missing documents" (vague - aling dokumento?)
- "Kulang ang iyong budget" (2nd person sa key_issues - MALI)

JSON VALUES: Dapat Filipino. JSON KEYS: Panatilihing English.
""",
    "en": """
IMPORTANT: Generate ALL text output in clear, simple English.

LANGUAGE REQUIREMENTS:
1. Use PLAIN English - avoid jargon and bureaucratic language
2. Write at a 10th-grade reading level
3. Write as if explaining to a barangay official during a meeting

CRITICAL - DUAL AUDIENCE CONSIDERATION:
4. For "key_issues": Use 3rd person POV (third person)
   - CORRECT: "Barangay lacks Annual Budget documentation"
   - WRONG: "You need to provide Annual Budget documentation"
   - WHY: "key_issues" are aggregated and shown on the MLGOO dashboard where DILG officials view data ABOUT multiple barangays

5. For "suggested_actions": Use 2nd person active voice (second person)
   - CORRECT: "You should upload the updated Annual Budget"
   - WHY: "suggested_actions" are shown directly TO the BLGU users

TARGET AUDIENCE: Barangay officials with varying education levels

SPECIFICITY REQUIREMENTS (CRITICAL):
- ALWAYS include the specific indicator/document/plan name in key_issues
- NEVER use vague terms without context
- CORRECT: "Barangay lacks Disaster Preparedness Plan"
- WRONG: "no proper plan" (WHICH plan?)
- CORRECT: "Annual Investment Plan 2024 not uploaded"
- WRONG: "Missing documents" (WHICH documents?)

EXAMPLES OF GOOD KEY_ISSUES (3rd person, specific):
- "Barangay lacks Disaster Preparedness Plan"
- "Annual Budget Ordinance for 2024 not uploaded"
- "Barangay Development Plan missing clear timeline"
- "BDRRMC training records documentation incomplete"

EXAMPLES OF GOOD SUGGESTED_ACTIONS (2nd person, actionable):
- "Upload the updated Disaster Preparedness Plan with evacuation routes"
- "The barangay treasurer should attend training on financial management"
- "Update the Barangay Development Plan and add timeline for each project"

EXAMPLES OF BAD OUTPUT (avoid these):
- "no proper plan" (vague - which plan?)
- "The barangay needs to update its records" (2nd person in key_issues - WRONG)
- "Missing documents" (vague - which documents?)
- "Your budget is incomplete" (2nd person in key_issues - WRONG)
- "The barangay must facilitate the updating of budgetary allocations..." (too formal)
- "Compliance with financial management protocols requires..." (bureaucratic)

JSON KEYS: Keep in English. JSON VALUES: Must be in clear, simple English.
""",
}

# Default languages to generate upfront (Bisaya + English)
DEFAULT_LANGUAGES = ["ceb", "en"]


class IntelligenceService:
    # ========================================
    # HELPER METHODS (Security, Validation, Utilities)
    # ========================================

    def _sanitize_for_prompt(self, text: str, max_length: int = 500) -> str:
        """
        Sanitize user-supplied text before including in AI prompts.

        Prevents prompt injection attacks by:
        - Removing potential instruction override patterns
        - Limiting text length to prevent token abuse
        - Removing control characters

        Args:
            text: User-supplied text to sanitize
            max_length: Maximum allowed length (default 500 chars)

        Returns:
            Sanitized text safe for inclusion in prompts
        """
        if not text:
            return ""

        # Convert to string if needed
        text = str(text)

        # Remove common prompt injection patterns (case-insensitive)
        injection_patterns = [
            r"(?i)ignore\s+(all\s+)?previous\s+instructions?",
            r"(?i)you\s+are\s+now",
            r"(?i)new\s+instructions?:",
            r"(?i)system\s*:",
            r"(?i)assistant\s*:",
            r"(?i)user\s*:",
            r"(?i)forget\s+(everything|all)",
            r"(?i)disregard\s+(all|previous)",
            r"(?i)override\s+instructions?",
        ]

        for pattern in injection_patterns:
            text = re.sub(pattern, "[FILTERED]", text)

        # Remove markdown code block delimiters that could confuse JSON parsing
        text = text.replace("```", "")

        # Remove control characters except newlines and tabs
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

        # Truncate to max length
        if len(text) > max_length:
            text = text[: max_length - 3] + "..."

        return text.strip()

    def _validate_language(self, language: str) -> str:
        """
        Validate and normalize language code.

        Args:
            language: Language code to validate

        Returns:
            Validated language code

        Raises:
            ValueError: If language is not supported
        """
        if language not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language: {language}. "
                f"Must be one of: {', '.join(sorted(SUPPORTED_LANGUAGES))}"
            )
        return language

    def _extract_json_from_response(self, response_text: str) -> str:
        """
        Extract JSON from Gemini API response, handling markdown code blocks.

        Args:
            response_text: Raw response text from Gemini API

        Returns:
            Extracted JSON string
        """
        if "```json" in response_text:
            # Extract JSON from ```json code block
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            if end == -1:
                # No closing delimiter, take rest of string
                return response_text[start:].strip()
            return response_text[start:end].strip()
        elif "```" in response_text:
            # Extract from generic code block
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            if end == -1:
                return response_text[start:].strip()
            return response_text[start:end].strip()
        else:
            # Assume entire response is JSON
            return response_text.strip()

    def _validate_capdev_response(
        self, parsed_response: dict[str, Any], assessment_id: int
    ) -> dict[str, Any]:
        """
        Validate CapDev insights response structure and content.

        Ensures all required keys are present and validates:
        - Array lengths are within acceptable ranges
        - Enum values match expected values
        - Required object fields are present

        Args:
            parsed_response: Parsed JSON response from Gemini
            assessment_id: Assessment ID for logging

        Returns:
            Validated and potentially cleaned response

        Raises:
            ValueError: If response fails validation
        """
        # Required keys check
        required_keys = [
            "summary",
            "governance_weaknesses",
            "recommendations",
            "capacity_development_needs",
            "suggested_interventions",
            "priority_actions",
        ]
        missing_keys = [key for key in required_keys if key not in parsed_response]
        if missing_keys:
            raise ValueError(
                f"Gemini API response missing required keys: {missing_keys}. "
                f"Got: {list(parsed_response.keys())}"
            )

        # Validate summary is a non-empty string
        if (
            not isinstance(parsed_response.get("summary"), str)
            or not parsed_response["summary"].strip()
        ):
            logger.warning(
                f"Assessment {assessment_id}: summary is empty or invalid, using default"
            )
            parsed_response["summary"] = (
                "Assessment analysis completed. Please review the detailed recommendations below."
            )

        # Validate arrays have reasonable lengths (warn but don't fail)
        array_fields = [
            ("governance_weaknesses", 1, 10),
            ("recommendations", 1, 10),
            ("capacity_development_needs", 1, 8),
            ("suggested_interventions", 1, 8),
            ("priority_actions", 1, 7),
        ]

        for field_name, min_len, max_len in array_fields:
            field_value = parsed_response.get(field_name, [])
            if not isinstance(field_value, list):
                logger.warning(
                    f"Assessment {assessment_id}: {field_name} is not a list, converting"
                )
                parsed_response[field_name] = [field_value] if field_value else []
                field_value = parsed_response[field_name]

            if len(field_value) < min_len:
                logger.warning(
                    f"Assessment {assessment_id}: {field_name} has only {len(field_value)} items (expected >= {min_len})"
                )
            elif len(field_value) > max_len:
                logger.warning(
                    f"Assessment {assessment_id}: {field_name} has {len(field_value)} items, truncating to {max_len}"
                )
                parsed_response[field_name] = field_value[:max_len]

        # Validate capacity_development_needs structure
        valid_categories = {"Training", "Resources", "Technical Assistance", "Policy"}
        for i, need in enumerate(parsed_response.get("capacity_development_needs", [])):
            if isinstance(need, dict):
                # Validate category
                category = need.get("category", "")
                if category not in valid_categories:
                    logger.warning(
                        f"Assessment {assessment_id}: capacity_development_needs[{i}].category "
                        f"'{category}' not in valid categories, defaulting to 'Training'"
                    )
                    need["category"] = "Training"

                # Ensure required fields exist
                if "description" not in need:
                    need["description"] = "Capacity development need identified"
                if "affected_indicators" not in need:
                    need["affected_indicators"] = []
                if "suggested_providers" not in need:
                    need["suggested_providers"] = ["DILG"]

        # Validate suggested_interventions structure
        valid_priorities = {"Immediate", "Short-term", "Long-term"}
        for i, intervention in enumerate(parsed_response.get("suggested_interventions", [])):
            if isinstance(intervention, dict):
                # Validate priority
                priority = intervention.get("priority", "")
                if priority not in valid_priorities:
                    logger.warning(
                        f"Assessment {assessment_id}: suggested_interventions[{i}].priority "
                        f"'{priority}' not in valid priorities, defaulting to 'Short-term'"
                    )
                    intervention["priority"] = "Short-term"

                # Ensure required fields exist
                if "title" not in intervention:
                    intervention["title"] = f"Intervention {i + 1}"
                if "description" not in intervention:
                    intervention["description"] = "Recommended intervention"
                if "governance_area" not in intervention:
                    intervention["governance_area"] = "General"
                if "estimated_duration" not in intervention:
                    intervention["estimated_duration"] = "To be determined"
                if "resource_requirements" not in intervention:
                    intervention["resource_requirements"] = "To be assessed"

        logger.info(
            f"Assessment {assessment_id}: CapDev response validated successfully - "
            f"weaknesses: {len(parsed_response.get('governance_weaknesses', []))}, "
            f"recommendations: {len(parsed_response.get('recommendations', []))}, "
            f"needs: {len(parsed_response.get('capacity_development_needs', []))}, "
            f"interventions: {len(parsed_response.get('suggested_interventions', []))}, "
            f"priority_actions: {len(parsed_response.get('priority_actions', []))}"
        )

        return parsed_response

    def _handle_gemini_error(self, e: Exception, context: str, assessment_id: int) -> Exception:
        """
        Convert Gemini API errors to user-friendly exceptions.

        Categorizes errors and logs appropriately without exposing
        sensitive information like API keys.

        Args:
            e: Original exception
            context: Description of operation that failed
            assessment_id: ID of the assessment being processed

        Returns:
            User-friendly exception to raise
        """
        error_message = str(e).lower()

        if "quota" in error_message or "rate limit" in error_message:
            logger.warning(
                f"Gemini API quota/rate limit hit for assessment {assessment_id}: {context}"
            )
            return Exception("Gemini API quota exceeded or rate limit hit. Please try again later.")
        elif "network" in error_message or "connection" in error_message:
            logger.error(
                f"Network error calling Gemini API for assessment {assessment_id}: {context}"
            )
            return Exception(
                "Network error connecting to Gemini API. Please check your internet connection."
            )
        elif "permission" in error_message or "unauthorized" in error_message:
            logger.error(
                f"Gemini API authentication failed for assessment {assessment_id}: {context}"
            )
            return Exception("Gemini API authentication failed. Please check your API key.")
        else:
            logger.error(
                f"Gemini API call failed for assessment {assessment_id} ({context}): {str(e)}"
            )
            return Exception(f"Gemini API call failed: {context}")

    def _check_rate_limit(self, operation: str) -> None:
        """
        Check if rate limit allows the operation, raise if not.

        Args:
            operation: Name of the operation (for rate limit bucketing)

        Raises:
            Exception: If rate limit exceeded
        """
        if not gemini_rate_limiter.acquire(operation):
            remaining = gemini_rate_limiter.get_remaining(operation)
            logger.warning(f"Rate limit exceeded for operation: {operation}")
            raise Exception(
                f"Rate limit exceeded for AI operations. "
                f"Please wait before retrying. Remaining: {remaining}"
            )

    def _call_gemini_with_circuit_breaker(
        self,
        prompt: str,
        operation: str,
        language: str,
        max_output_tokens: int = 8192,
    ) -> str:
        """
        Call Gemini API with circuit breaker and rate limiting protection.

        This is the core protected API call method that all AI operations should use.

        Args:
            prompt: The prompt to send to Gemini
            operation: Name of operation for metrics/logging
            language: Language code for metrics
            max_output_tokens: Maximum output tokens (default 8192)

        Returns:
            Raw response text from Gemini

        Raises:
            Exception: If API call fails, circuit breaker is open, or rate limited
        """
        # Check rate limit first
        self._check_rate_limit(operation)

        # Update circuit breaker state metric
        if gemini_circuit_breaker.current_state == "open":
            circuit_breaker_state.set(1)
        elif gemini_circuit_breaker.current_state == "half-open":
            circuit_breaker_state.set(2)
        else:
            circuit_breaker_state.set(0)

        # Check if circuit breaker is open
        if gemini_circuit_breaker.current_state == "open":
            logger.warning(f"Circuit breaker is OPEN for Gemini API - skipping {operation}")
            gemini_requests_total.labels(
                status="circuit_breaker_open", language=language, operation=operation
            ).inc()
            raise Exception(
                "Gemini API is temporarily unavailable due to repeated failures. "
                "Please try again in a few minutes."
            )

        # Configure Gemini
        genai.configure(api_key=settings.GEMINI_API_KEY)  # type: ignore
        model = genai.GenerativeModel("gemini-2.5-flash")  # type: ignore

        # Temperature settings:
        # - 0.3-0.4: More consistent, factual outputs (ideal for CapDev insights)
        # - 0.7+: More creative but less consistent (avoid for compliance data)
        generation_config = {
            "temperature": 0.4,
            "max_output_tokens": max_output_tokens,
            "top_p": 0.9,  # Nucleus sampling for better quality
            "top_k": 40,  # Limit token selection for coherence
        }

        start_time = time.time()

        try:
            # Make the API call within circuit breaker context
            @gemini_circuit_breaker
            def _protected_call():
                return model.generate_content(
                    prompt,
                    generation_config=generation_config,  # type: ignore
                )

            response = _protected_call()

            # Record success metrics
            duration = time.time() - start_time
            gemini_latency_seconds.labels(operation=operation).observe(duration)
            gemini_requests_total.labels(
                status="success", language=language, operation=operation
            ).inc()

            # Validate response
            if not response or not hasattr(response, "text") or not response.text:
                raise Exception("Gemini API returned empty or invalid response")

            return response.text

        except CircuitBreakerError:
            # Circuit breaker triggered
            circuit_breaker_state.set(1)
            gemini_requests_total.labels(
                status="circuit_breaker_triggered",
                language=language,
                operation=operation,
            ).inc()
            raise Exception(
                "Gemini API circuit breaker triggered due to repeated failures. "
                "Service will recover automatically."
            )
        except Exception:
            # Record failure metrics
            duration = time.time() - start_time
            gemini_latency_seconds.labels(operation=operation).observe(duration)
            gemini_requests_total.labels(
                status="error", language=language, operation=operation
            ).inc()
            raise

    # ========================================
    # CALCULATION RULE ENGINE
    # ========================================

    def evaluate_rule(self, rule: CalculationRule, assessment_data: dict[str, Any]) -> bool:
        """
        Recursively evaluate a calculation rule against assessment data.

        This is the core evaluation engine that handles all 6 rule types:
        - AND_ALL: All nested conditions must be true
        - OR_ANY: At least one nested condition must be true
        - PERCENTAGE_THRESHOLD: Number field comparison
        - COUNT_THRESHOLD: Checkbox count comparison
        - MATCH_VALUE: Field value matching
        - BBI_FUNCTIONALITY_CHECK: BBI status check (placeholder)

        Args:
            rule: The calculation rule to evaluate (discriminated union type)
            assessment_data: Dictionary containing assessment response data
                            Format: {"field_id": value, ...}

        Returns:
            Boolean indicating if the rule evaluates to true

        Raises:
            ValueError: If rule type is unknown or field_id not found in data
        """
        # Handle AND_ALL rule: all conditions must be true
        if isinstance(rule, AndAllRule):
            return self._evaluate_and_all_rule(rule, assessment_data)

        # Handle OR_ANY rule: at least one condition must be true
        elif isinstance(rule, OrAnyRule):
            return self._evaluate_or_any_rule(rule, assessment_data)

        # Handle PERCENTAGE_THRESHOLD rule: number field comparison
        elif isinstance(rule, PercentageThresholdRule):
            return self._evaluate_percentage_threshold_rule(rule, assessment_data)

        # Handle COUNT_THRESHOLD rule: checkbox count comparison
        elif isinstance(rule, CountThresholdRule):
            return self._evaluate_count_threshold_rule(rule, assessment_data)

        # Handle MATCH_VALUE rule: field value matching
        elif isinstance(rule, MatchValueRule):
            return self._evaluate_match_value_rule(rule, assessment_data)

        # Handle BBI_FUNCTIONALITY_CHECK rule: BBI status check
        elif isinstance(rule, BBIFunctionalityCheckRule):
            return self._evaluate_bbi_functionality_check_rule(rule, assessment_data)

        else:
            raise ValueError(f"Unknown rule type: {type(rule).__name__}")

    def _evaluate_and_all_rule(self, rule: AndAllRule, assessment_data: dict[str, Any]) -> bool:
        """
        Evaluate AND_ALL rule: all nested conditions must be true.

        Args:
            rule: The AndAllRule instance
            assessment_data: Dictionary containing assessment response data

        Returns:
            True if all conditions evaluate to true, False otherwise
        """
        for condition in rule.conditions:
            if not self.evaluate_rule(condition, assessment_data):
                return False
        return True

    def _evaluate_or_any_rule(self, rule: OrAnyRule, assessment_data: dict[str, Any]) -> bool:
        """
        Evaluate OR_ANY rule: at least one nested condition must be true.

        Args:
            rule: The OrAnyRule instance
            assessment_data: Dictionary containing assessment response data

        Returns:
            True if at least one condition evaluates to true, False otherwise
        """
        for condition in rule.conditions:
            if self.evaluate_rule(condition, assessment_data):
                return True
        return False

    def _evaluate_percentage_threshold_rule(
        self, rule: PercentageThresholdRule, assessment_data: dict[str, Any]
    ) -> bool:
        """
        Evaluate PERCENTAGE_THRESHOLD rule: check if number field meets threshold.

        Args:
            rule: The PercentageThresholdRule instance
            assessment_data: Dictionary containing assessment response data

        Returns:
            True if the field value meets the threshold condition, False otherwise

        Raises:
            ValueError: If field_id not found in assessment_data or value is not numeric
        """
        if rule.field_id not in assessment_data:
            raise ValueError(
                f"Field '{rule.field_id}' not found in assessment data. "
                f"Available fields: {list(assessment_data.keys())}"
            )

        field_value = assessment_data[rule.field_id]

        # Ensure field value is numeric
        try:
            numeric_value = float(field_value)
        except (TypeError, ValueError):
            raise ValueError(f"Field '{rule.field_id}' has non-numeric value: {field_value}")

        # Apply the comparison operator
        if rule.operator == ">=":
            return numeric_value >= rule.threshold
        elif rule.operator == ">":
            return numeric_value > rule.threshold
        elif rule.operator == "<=":
            return numeric_value <= rule.threshold
        elif rule.operator == "<":
            return numeric_value < rule.threshold
        elif rule.operator == "==":
            return numeric_value == rule.threshold
        else:
            raise ValueError(f"Unknown operator: {rule.operator}")

    def _evaluate_count_threshold_rule(
        self, rule: CountThresholdRule, assessment_data: dict[str, Any]
    ) -> bool:
        """
        Evaluate COUNT_THRESHOLD rule: check if checkbox count meets threshold.

        Expects field value to be a list of selected checkbox values.

        Args:
            rule: The CountThresholdRule instance
            assessment_data: Dictionary containing assessment response data
                            Field value should be a list: ["value1", "value2", ...]

        Returns:
            True if the count of selected checkboxes meets the threshold, False otherwise

        Raises:
            ValueError: If field_id not found or value is not a list
        """
        if rule.field_id not in assessment_data:
            raise ValueError(
                f"Field '{rule.field_id}' not found in assessment data. "
                f"Available fields: {list(assessment_data.keys())}"
            )

        field_value = assessment_data[rule.field_id]

        # Ensure field value is a list (for checkbox groups)
        if not isinstance(field_value, list):
            raise ValueError(
                f"Field '{rule.field_id}' expected list for checkbox count, "
                f"got {type(field_value).__name__}: {field_value}"
            )

        count = len(field_value)

        # Apply the comparison operator
        if rule.operator == ">=":
            return count >= rule.threshold
        elif rule.operator == ">":
            return count > rule.threshold
        elif rule.operator == "<=":
            return count <= rule.threshold
        elif rule.operator == "<":
            return count < rule.threshold
        elif rule.operator == "==":
            return count == rule.threshold
        else:
            raise ValueError(f"Unknown operator: {rule.operator}")

    def _evaluate_match_value_rule(
        self, rule: MatchValueRule, assessment_data: dict[str, Any]
    ) -> bool:
        """
        Evaluate MATCH_VALUE rule: check if field value matches expected value.

        Supports multiple operators: ==, !=, contains, not_contains

        Args:
            rule: The MatchValueRule instance
            assessment_data: Dictionary containing assessment response data

        Returns:
            True if the field value matches the condition, False otherwise

        Raises:
            ValueError: If field_id not found in assessment_data
        """
        if rule.field_id not in assessment_data:
            raise ValueError(
                f"Field '{rule.field_id}' not found in assessment data. "
                f"Available fields: {list(assessment_data.keys())}"
            )

        field_value = assessment_data[rule.field_id]

        # Apply the comparison operator
        if rule.operator == "==":
            return field_value == rule.expected_value
        elif rule.operator == "!=":
            return field_value != rule.expected_value
        elif rule.operator == "contains":
            # For string values
            if isinstance(field_value, str):
                return str(rule.expected_value) in field_value
            # For list values (checkbox groups)
            elif isinstance(field_value, list):
                return rule.expected_value in field_value
            else:
                return False
        elif rule.operator == "not_contains":
            # For string values
            if isinstance(field_value, str):
                return str(rule.expected_value) not in field_value
            # For list values (checkbox groups)
            elif isinstance(field_value, list):
                return rule.expected_value not in field_value
            else:
                return True
        else:
            raise ValueError(f"Unknown operator: {rule.operator}")

    def _evaluate_bbi_functionality_check_rule(
        self, rule: BBIFunctionalityCheckRule, assessment_data: dict[str, Any]
    ) -> bool:
        """
        Evaluate BBI_FUNCTIONALITY_CHECK rule: check if BBI is Functional.

        This is a placeholder for Epic 4 BBI integration.
        Currently returns False as BBI data is not yet available.

        Args:
            rule: The BBIFunctionalityCheckRule instance
            assessment_data: Dictionary containing assessment response data

        Returns:
            Boolean indicating if BBI meets expected status

        Note:
            In Epic 4, this will query the BBI database table to check status.
            For now, it returns False to indicate the feature is not yet implemented.
        """
        # TODO: Epic 4 - Implement BBI database query
        # Expected implementation:
        # 1. Query BBI table by bbi_id
        # 2. Check if BBI status matches expected_status
        # 3. Return comparison result

        # Placeholder: Check if assessment_data has BBI status override
        bbi_key = f"bbi_{rule.bbi_id}_status"
        if bbi_key in assessment_data:
            actual_status = assessment_data[bbi_key]
            return actual_status == rule.expected_status

        # Default: return False (feature not yet implemented)
        return False

    def evaluate_calculation_schema(
        self,
        calculation_schema: CalculationSchema,
        assessment_data: dict[str, Any],
    ) -> bool:
        """
        Evaluate a complete calculation schema against assessment data.

        Evaluates all condition groups and returns overall Pass/Fail status.
        Top-level condition groups are evaluated with implicit AND logic.

        Args:
            calculation_schema: The CalculationSchema to evaluate
            assessment_data: Dictionary containing assessment response data

        Returns:
            True if all condition groups pass (Pass status), False otherwise (Fail status)
        """
        # Evaluate all condition groups (implicit AND between groups)
        for group in calculation_schema.condition_groups:
            if not self._evaluate_condition_group(group, assessment_data):
                return False
        return True

    def evaluate_indicator_calculation(
        self,
        db: Session,
        indicator_id: int,
        assessment_data: dict[str, Any],
    ) -> str | None:
        """
        Evaluate an indicator's calculation schema if is_auto_calculable is True.

        This is the main entry point for automatic Pass/Fail calculation during
        the assessment workflow. It checks the is_auto_calculable flag and only
        evaluates if the flag is true.

        Args:
            db: Database session
            indicator_id: ID of the indicator to evaluate
            assessment_data: Dictionary containing assessment response data

        Returns:
            "Pass" or "Fail" if is_auto_calculable is True and calculation succeeds,
            None if is_auto_calculable is False or calculation_schema is not defined

        Raises:
            ValueError: If indicator not found or evaluation fails
        """
        # Get the indicator with its calculation schema
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
        if not indicator:
            raise ValueError(f"Indicator with ID {indicator_id} not found")

        # Check is_auto_calculable flag
        if not indicator.is_auto_calculable:
            # Not auto-calculable, return None (manual validation required)
            return None

        # Check if calculation_schema exists
        if not indicator.calculation_schema:
            # No schema defined, return None
            logger.warning(
                f"Indicator {indicator_id} is marked as auto-calculable but has no calculation_schema"
            )
            return None

        # Parse calculation_schema
        try:
            calculation_schema = CalculationSchema(**indicator.calculation_schema)
        except Exception as e:
            raise ValueError(f"Invalid calculation_schema for indicator {indicator_id}: {str(e)}")

        # Evaluate the schema
        evaluation_result = self.evaluate_calculation_schema(
            calculation_schema=calculation_schema,
            assessment_data=assessment_data,
        )

        # Return status based on evaluation result
        if evaluation_result:
            return calculation_schema.output_status_on_pass
        else:
            return calculation_schema.output_status_on_fail

    def calculate_indicator_status(
        self,
        db: Session,
        indicator_id: int,
        assessment_data: dict[str, Any],
    ) -> str | None:
        """
        Alias for evaluate_indicator_calculation for backwards compatibility.

        Calculate the Pass/Fail status of an auto-calculable indicator.
        """
        return self.evaluate_indicator_calculation(db, indicator_id, assessment_data)

    def _evaluate_condition_group(
        self, group: ConditionGroup, assessment_data: dict[str, Any]
    ) -> bool:
        """
        Evaluate a condition group with its logical operator (AND/OR).

        Args:
            group: The ConditionGroup to evaluate
            assessment_data: Dictionary containing assessment response data

        Returns:
            True if the group evaluates to true based on its operator, False otherwise
        """
        if group.operator == "AND":
            # All rules in the group must be true
            for rule in group.rules:
                if not self.evaluate_rule(rule, assessment_data):
                    return False
            return True
        elif group.operator == "OR":
            # At least one rule in the group must be true
            for rule in group.rules:
                if self.evaluate_rule(rule, assessment_data):
                    return True
            return False
        else:
            raise ValueError(f"Unknown condition group operator: {group.operator}")

    # ========================================
    # REMARK GENERATION ENGINE
    # ========================================

    def generate_indicator_remark(
        self,
        db: Session,
        indicator_id: int,
        indicator_status: str | None,
        assessment_data: dict[str, Any],
    ) -> str | None:
        """
        Generate a remark for an indicator based on its remark_schema.

        This function evaluates the remark_schema and generates appropriate remarks
        based on the indicator's Pass/Fail status. Supports Jinja2 templates with
        placeholders for dynamic content.

        Args:
            db: Database session
            indicator_id: ID of the indicator
            indicator_status: Pass/Fail status of the indicator (or None)
            assessment_data: Dictionary containing assessment response data

        Returns:
            Generated remark string, or None if no remark_schema defined

        Raises:
            ValueError: If indicator not found or template rendering fails
        """
        from jinja2 import Template, TemplateSyntaxError, UndefinedError

        from app.schemas.remark_schema import RemarkSchema

        # Get the indicator with its remark schema
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
        if not indicator:
            raise ValueError(f"Indicator with ID {indicator_id} not found")

        # Check if remark_schema exists
        if not indicator.remark_schema:
            return None

        try:
            # Parse the remark schema
            remark_schema = RemarkSchema(**indicator.remark_schema)
        except Exception as e:
            raise ValueError(f"Invalid remark schema format: {str(e)}")

        # Find matching conditional remark based on status
        template_str = None
        if indicator_status:
            status_lower = indicator_status.lower()
            for conditional_remark in remark_schema.conditional_remarks:
                if conditional_remark.condition.lower() == status_lower:
                    template_str = conditional_remark.template
                    break

        # Use default template if no match found
        if template_str is None:
            template_str = remark_schema.default_template

        # Prepare template context
        context = {
            "indicator_name": indicator.name,
            "status": indicator_status or "Unknown",
            **assessment_data,  # Include all assessment data for field access
        }

        # Render the template with Jinja2
        try:
            template = Template(template_str)
            rendered_remark = template.render(context)
            return rendered_remark.strip()
        except TemplateSyntaxError as e:
            raise ValueError(f"Template syntax error in remark: {str(e)}")
        except UndefinedError as e:
            raise ValueError(f"Undefined variable in remark template: {str(e)}")
        except Exception as e:
            raise ValueError(f"Failed to render remark template: {str(e)}")

    # ========================================
    # SGLGB CLASSIFICATION (3+1 Rule)
    # ========================================

    def get_validated_responses_by_area(
        self, db: Session, assessment_id: int
    ) -> dict[str, list[AssessmentResponse]]:
        """
        Fetch all assessment responses for an assessment that count as passed.

        PASS and CONDITIONAL both count as passing (SGLGB rule: Conditional = Considered = Pass).
        Groups responses by governance area name.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            Dictionary mapping governance area name to list of passed responses
        """
        responses = (
            db.query(AssessmentResponse)
            .join(Indicator, AssessmentResponse.indicator_id == Indicator.id)
            .join(GovernanceArea, Indicator.governance_area_id == GovernanceArea.id)
            .filter(
                AssessmentResponse.assessment_id == assessment_id,
                AssessmentResponse.validation_status.in_(
                    [ValidationStatus.PASS, ValidationStatus.CONDITIONAL]
                ),
            )
            .all()
        )

        # Group by governance area name
        area_responses: dict[str, list[AssessmentResponse]] = {}
        for response in responses:
            area_name = response.indicator.governance_area.name
            if area_name not in area_responses:
                area_responses[area_name] = []
            area_responses[area_name].append(response)

        return area_responses

    def determine_area_compliance(self, db: Session, assessment_id: int, area_name: str) -> bool:
        """
        Determine if a governance area has passed (all LEAF indicators within that area must pass).

        An area passes if ALL of its LEAF indicators have validation_status = PASS or CONDITIONAL.
        An area fails if ANY leaf indicator has validation_status = FAIL or is None.
        SGLGB rule: CONDITIONAL (Considered) counts as passing.

        IMPORTANT: Only leaf indicators (indicators with no children) are checked.
        Parent/section indicators don't have responses and should be excluded.

        BBI SPECIAL RULE (4-tier system):
        For BBI indicators, FAIL only means NON_FUNCTIONAL (0%).
        LOW_FUNCTIONAL, MODERATELY_FUNCTIONAL, and HIGHLY_FUNCTIONAL all count as PASS.
        This is based on DILG MC 2024-417 4-tier BBI compliance system.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            area_name: Name of the governance area to check

        Returns:
            True if all leaf indicators in the area passed, False otherwise
        """
        from app.db.enums import BBIStatus
        from app.db.models.bbi import BBIResult

        # Get all indicators for this governance area
        area = db.query(GovernanceArea).filter(GovernanceArea.name == area_name).first()
        if not area:
            return False

        all_indicators = db.query(Indicator).filter(Indicator.governance_area_id == area.id).all()

        if not all_indicators:
            return False  # No indicators = failed area

        # Build a set of parent IDs to identify which indicators have children
        parent_ids = {ind.parent_id for ind in all_indicators if ind.parent_id is not None}

        # Filter to only leaf indicators (indicators that are NOT parents of other indicators)
        # ALSO exclude profiling-only indicators - they don't affect pass/fail status
        leaf_indicators = [
            ind for ind in all_indicators if ind.id not in parent_ids and not ind.is_profiling_only
        ]

        if not leaf_indicators:
            return False  # No leaf indicators = failed area

        # OPTIMIZATION: Batch query all responses for leaf indicators at once
        # This fixes the N+1 query problem by fetching all responses in a single query
        leaf_indicator_ids = [ind.id for ind in leaf_indicators]
        responses = (
            db.query(AssessmentResponse)
            .filter(
                AssessmentResponse.assessment_id == assessment_id,
                AssessmentResponse.indicator_id.in_(leaf_indicator_ids),
            )
            .all()
        )

        # Build a map of indicator_id -> response for O(1) lookup
        response_map = {r.indicator_id: r for r in responses}

        # Get BBI results for this assessment to check BBI 4-tier status
        # Only query if there are BBI indicators in this area
        bbi_indicator_ids = [ind.id for ind in leaf_indicators if ind.is_bbi]
        bbi_results_map = {}
        if bbi_indicator_ids:
            bbi_results = db.query(BBIResult).filter(BBIResult.assessment_id == assessment_id).all()
            # Map by indicator_id for O(1) lookup
            bbi_results_map = {r.indicator_id: r for r in bbi_results if r.indicator_id}

        # Check all leaf indicators against the response map
        for indicator in leaf_indicators:
            response = response_map.get(indicator.id)

            # If no response exists, the area fails
            if not response:
                return False

            # BBI SPECIAL RULE: For BBI indicators, use 4-tier rule
            # Only NON_FUNCTIONAL (0%) counts as FAIL
            # LOW_FUNCTIONAL, MODERATELY_FUNCTIONAL, HIGHLY_FUNCTIONAL all count as PASS
            if indicator.is_bbi:
                bbi_result = bbi_results_map.get(indicator.id)
                if bbi_result:
                    # BBI exists - check if NON_FUNCTIONAL
                    if bbi_result.compliance_rating == BBIStatus.NON_FUNCTIONAL.value:
                        return False  # Only NON_FUNCTIONAL fails
                    # Any other BBI status (LOW, MODERATE, HIGHLY) counts as pass
                    continue
                else:
                    # No BBI result yet - fall back to validation_status check
                    pass

            # Standard check for non-BBI indicators (or BBI without result)
            # PASS and CONDITIONAL both count as passing (SGLGB rule: Conditional = Considered = Pass)
            # Only FAIL status causes the area to fail
            if response.validation_status not in (
                ValidationStatus.PASS,
                ValidationStatus.CONDITIONAL,
            ):
                return False

        return True

    def get_all_area_results(self, db: Session, assessment_id: int) -> dict[str, str]:
        """
        Get pass/fail status for all six governance areas.

        Returns a dictionary mapping area names to their status ('Passed' or 'Failed').

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            Dictionary mapping area name to status
        """
        area_results: dict[str, str] = {}

        # Check all six areas
        all_areas = CORE_AREAS + ESSENTIAL_AREAS

        for area_name in all_areas:
            if self.determine_area_compliance(db, assessment_id, area_name):
                area_results[area_name] = "Passed"
            else:
                area_results[area_name] = "Failed"

        return area_results

    def check_core_areas_compliance(self, db: Session, assessment_id: int) -> bool:
        """
        Check if all three Core areas have passed.

        Returns True if all three Core areas (Financial, Disaster Prep, Safety/Peace/Order) have passed.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            True if all Core areas passed, False otherwise
        """
        for area_name in CORE_AREAS:
            if not self.determine_area_compliance(db, assessment_id, area_name):
                return False
        return True

    def check_essential_areas_compliance(self, db: Session, assessment_id: int) -> bool:
        """
        Check if at least one Essential area has passed.

        Returns True if at least one Essential area has passed.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            True if at least one Essential area passed, False otherwise
        """
        for area_name in ESSENTIAL_AREAS:
            if self.determine_area_compliance(db, assessment_id, area_name):
                return True
        return False

    def determine_compliance_status(self, db: Session, assessment_id: int) -> ComplianceStatus:
        """
        Determine overall compliance status using the "3+1" SGLGB rule.

        A barangay PASSES if:
        - All three (3) Core areas are marked as "Passed" AND
        - At least one (1) Essential area is marked as "Passed"

        A barangay FAILS if:
        - Any one of the three Core areas is failed, OR
        - All three Essential areas are failed

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            ComplianceStatus.PASSED or ComplianceStatus.FAILED
        """
        # Check Core areas compliance
        all_core_passed = self.check_core_areas_compliance(db, assessment_id)

        # Check Essential areas compliance
        at_least_one_essential_passed = self.check_essential_areas_compliance(db, assessment_id)

        # Apply "3+1" rule
        if all_core_passed and at_least_one_essential_passed:
            return ComplianceStatus.PASSED
        else:
            return ComplianceStatus.FAILED

    def classify_assessment(self, db: Session, assessment_id: int) -> dict[str, Any]:
        """
        Run the complete classification algorithm and store results.

        This method:
        1. Calculates area-level compliance (all indicators must pass)
        2. Applies the "3+1" rule to determine overall compliance status
        3. Stores results in the database

        Args:
            db: Database session
            assessment_id: ID of the assessment to classify

        Returns:
            Dictionary with classification results

        Raises:
            ValueError: If assessment not found
        """
        # Verify assessment exists
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Get area-level results
        area_results = self.get_all_area_results(db, assessment_id)

        # Determine overall compliance status using "3+1" rule
        compliance_status = self.determine_compliance_status(db, assessment_id)

        # Store results in database
        assessment.final_compliance_status = compliance_status
        assessment.area_results = area_results
        assessment.updated_at = datetime.now(UTC)

        db.commit()
        db.refresh(assessment)

        return {
            "success": True,
            "assessment_id": assessment_id,
            "final_compliance_status": compliance_status.value,
            "area_results": area_results,
        }

    def build_gemini_prompt(self, db: Session, assessment_id: int, language: str = "ceb") -> str:
        """
        Build a structured prompt for Gemini API from failed indicators.

        Creates a comprehensive prompt that includes:
        - Barangay name and assessment year
        - Failed indicators with governance area context
        - Assessor comments and feedback (sanitized for security)
        - Overall compliance status

        Args:
            db: Database session
            assessment_id: ID of the assessment
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Formatted prompt string for Gemini API

        Raises:
            ValueError: If assessment not found or language not supported
        """
        # Validate language
        self._validate_language(language)

        # Get assessment with all relationships
        from app.db.models.user import User

        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
                joinedload(Assessment.responses).joinedload(AssessmentResponse.feedback_comments),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Get barangay name (sanitize to prevent injection)
        barangay_name = "Unknown"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = self._sanitize_for_prompt(
                assessment.blgu_user.barangay.name, max_length=100
            )

        # Get assessment year
        assessment_year = "2024"  # Default
        if assessment.validated_at:
            assessment_year = str(assessment.validated_at.year)

        # Get failed indicators with feedback
        failed_indicators = []
        for response in assessment.responses:
            if response.validation_status not in (
                ValidationStatus.PASS,
                ValidationStatus.CONDITIONAL,
            ):
                indicator = response.indicator
                governance_area = indicator.governance_area

                # Get assessor comments (sanitized for security)
                comments = []
                for comment in response.feedback_comments:
                    sanitized_comment = self._sanitize_for_prompt(comment.comment, max_length=300)
                    assessor_name = self._sanitize_for_prompt(
                        comment.assessor.name if comment.assessor else "Assessor",
                        max_length=50,
                    )
                    comments.append(f"{assessor_name}: {sanitized_comment}")

                failed_indicators.append(
                    {
                        "indicator_name": self._sanitize_for_prompt(indicator.name, max_length=200),
                        "description": self._sanitize_for_prompt(
                            indicator.description or "", max_length=500
                        ),
                        "governance_area": governance_area.name,
                        "area_type": governance_area.area_type.value,
                        "assessor_comments": comments,
                    }
                )

        # Get overall compliance status
        compliance_status = (
            assessment.final_compliance_status.value
            if assessment.final_compliance_status
            else "Not yet classified"
        )

        # Get language instruction
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["ceb"])

        # Build the prompt
        prompt = f"""{lang_instruction}

You are an expert consultant analyzing SGLGB (Seal of Good Local Governance - Barangay) compliance assessment results.

BARANGAY INFORMATION:
- Name: {barangay_name}
- Assessment Year: {assessment_year}
- Overall Compliance Status: {compliance_status}

FAILED INDICATORS:
"""

        for idx, indicator in enumerate(failed_indicators, 1):
            prompt += f"""
{idx}. {indicator["indicator_name"]}
   - Governance Area: {indicator["governance_area"]} ({indicator["area_type"]})
   - Description: {indicator["description"]}
"""

            if indicator["assessor_comments"]:
                prompt += "   - Assessor Feedback:\n"
                for comment in indicator["assessor_comments"]:
                    prompt += f"     • {comment}\n"

        prompt += """

TASK:
Based on the failed indicators and assessor feedback above, provide a comprehensive analysis in the following JSON structure:

{
  "summary": "A brief 2-3 sentence summary of the barangay's compliance status and key issues",
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "..."
  ],
  "capacity_development_needs": [
    "Identified capacity building need 1",
    "Identified capacity building need 2",
    "..."
  ]
}

Focus on:
1. Identifying root causes of non-compliance
2. Providing actionable recommendations for improvement
3. Identifying specific capacity development needs for barangay officials and staff
"""

        return prompt

    def call_gemini_api(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> dict[str, Any]:
        """
        Call Gemini API with the prompt and parse the JSON response.

        Builds the prompt from failed indicators, calls Gemini API with
        circuit breaker and rate limiting protection, and returns the
        structured JSON response.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Dictionary with 'summary', 'recommendations', and 'capacity_development_needs' keys

        Raises:
            ValueError: If assessment not found or API key not configured
            Exception: If API call fails, rate limited, or response parsing fails
        """
        # Check if API key is configured
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured in environment")

        # Validate language
        self._validate_language(language)

        # Build the prompt with language instruction
        prompt = self.build_gemini_prompt(db, assessment_id, language)

        try:
            # Call Gemini API with circuit breaker and rate limiting protection
            response_text = self._call_gemini_with_circuit_breaker(
                prompt=prompt,
                operation="insights",
                language=language,
                max_output_tokens=8192,
            )

            # Extract JSON from response using helper method
            json_str = self._extract_json_from_response(response_text)

            # Parse the JSON
            parsed_response = json.loads(json_str)

            # Validate the response structure
            required_keys = ["summary", "recommendations", "capacity_development_needs"]
            if not all(key in parsed_response for key in required_keys):
                raise ValueError(
                    f"Gemini API response missing required keys. Got: {list(parsed_response.keys())}"
                )

            # Add language to response
            parsed_response["language"] = language

            return parsed_response

        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to parse Gemini API response as JSON for assessment {assessment_id}"
            )
            raise Exception("Failed to parse Gemini API response as JSON") from e
        except TimeoutError as e:
            raise Exception("Gemini API request timed out after waiting for response") from e
        except ValueError:
            # Re-raise ValueError as-is (for invalid response structure)
            raise
        except Exception as e:
            # Use helper method for error handling
            raise self._handle_gemini_error(e, "insights generation", assessment_id) from e

    def get_insights_with_caching(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> dict[str, Any]:
        """
        Get AI-powered insights for an assessment with language-aware caching.

        First checks if ai_recommendations already exists for the requested language.
        If cached data exists, returns it immediately without calling Gemini API.
        If not, calls Gemini API, stores the result under the language key, and returns it.

        This method implements cost-saving logic by avoiding duplicate API calls.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Dictionary with 'summary', 'recommendations', 'capacity_development_needs', and 'language' keys

        Raises:
            ValueError: If assessment not found or language not supported
            Exception: If API call fails or response parsing fails
        """
        # Validate language
        self._validate_language(language)

        # Get assessment to check for cached recommendations
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Check if ai_recommendations already exists for this language
        if assessment.ai_recommendations:
            # New format: keyed by language
            if isinstance(assessment.ai_recommendations, dict):
                if language in assessment.ai_recommendations:
                    cache_operations_total.labels(operation="insights", result="hit").inc()
                    logger.debug(f"Cache HIT for insights assessment {assessment_id} ({language})")
                    return assessment.ai_recommendations[language]
                # Legacy format check: if 'summary' key exists, it's old single-language format
                elif "summary" in assessment.ai_recommendations:
                    # Return legacy format as-is (it's in English)
                    if language == "en":
                        cache_operations_total.labels(operation="insights", result="hit").inc()
                        return assessment.ai_recommendations

        # Cache miss - need to call API
        cache_operations_total.labels(operation="insights", result="miss").inc()
        logger.debug(f"Cache MISS for insights assessment {assessment_id} ({language})")

        # No cached data for this language, call Gemini API
        insights = self.call_gemini_api(db, assessment_id, language)

        # Store the recommendations in the database under the language key
        if not assessment.ai_recommendations:
            assessment.ai_recommendations = {}
        elif "summary" in assessment.ai_recommendations:
            # Migrate legacy format: wrap existing data under 'en' key
            assessment.ai_recommendations = {"en": assessment.ai_recommendations}

        assessment.ai_recommendations[language] = insights
        assessment.updated_at = datetime.now(UTC)
        db.commit()
        db.refresh(assessment)

        return insights

    # ========================================
    # REWORK SUMMARY GENERATION (AI-POWERED)
    # ========================================

    def build_rework_summary_prompt(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> tuple[str, list[dict[str, Any]]]:
        """
        Build a structured prompt for Gemini API from rework feedback.

        Analyzes MOV-level notes and annotations from assessors and validators
        for indicators requiring rework and creates a comprehensive prompt for
        AI-powered summary generation.

        Args:
            db: Database session
            assessment_id: ID of the assessment in rework status
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Tuple of (prompt_string, indicator_data_list)
            - prompt_string: Formatted prompt for Gemini API
            - indicator_data_list: Raw data for each indicator (for reference)

        Raises:
            ValueError: If assessment not found or not in rework status
        """
        # Get assessment with all relationships
        from app.db.models.assessment import MOVAnnotation
        from app.db.models.user import User

        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
                selectinload(Assessment.mov_files),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Get barangay name
        barangay_name = "Unknown"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Batch-fetch all annotations for this assessment's MOV files to avoid N+1 queries
        active_mov_files = [mf for mf in assessment.mov_files if mf.deleted_at is None]
        mov_file_ids = [mf.id for mf in active_mov_files]
        all_annotations = (
            db.query(MOVAnnotation).filter(MOVAnnotation.mov_file_id.in_(mov_file_ids)).all()
            if mov_file_ids
            else []
        )
        annotations_by_mov_id: dict[int, list] = defaultdict(list)
        for a in all_annotations:
            annotations_by_mov_id[a.mov_file_id].append(a)

        # Build a lookup of MOV files by indicator_id
        mov_files_by_indicator: dict[int, list] = defaultdict(list)
        for mf in active_mov_files:
            mov_files_by_indicator[mf.indicator_id].append(mf)

        # Get indicators requiring rework with MOV-level feedback
        indicator_data = []
        for response in assessment.responses:
            if not response.requires_rework:
                continue

            indicator = response.indicator
            governance_area = indicator.governance_area

            # Get MOV files for this indicator
            indicator_mov_files = mov_files_by_indicator.get(indicator.id, [])

            # Collect MOV notes from assessors/validators
            mov_notes = []
            mov_annotations = []
            affected_mov_files = set()

            for mov_file in indicator_mov_files:
                # Collect assessor_notes (MOV-level notes from assessors/validators)
                if mov_file.assessor_notes and mov_file.assessor_notes.strip():
                    mov_notes.append(
                        {
                            "filename": mov_file.file_name,
                            "note": mov_file.assessor_notes.strip(),
                        }
                    )
                    affected_mov_files.add(mov_file.file_name)

                # Collect MOV annotations (from batch-fetched data)
                for annotation in annotations_by_mov_id.get(mov_file.id, []):
                    mov_annotations.append(
                        {
                            "filename": mov_file.file_name,
                            "comment": annotation.comment,
                            "page": annotation.page,
                        }
                    )
                    affected_mov_files.add(mov_file.file_name)

            indicator_data.append(
                {
                    "indicator_id": indicator.id,
                    "indicator_name": indicator.name,
                    "description": indicator.description,
                    "governance_area": governance_area.name,
                    "mov_notes": mov_notes,
                    "mov_annotations": mov_annotations,
                    "affected_movs": list(affected_mov_files),
                }
            )

        if not indicator_data:
            raise ValueError(f"Assessment {assessment_id} has no indicators requiring rework")

        # Get language instruction
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["ceb"])

        # Build the prompt
        prompt = f"""{lang_instruction}

You are an expert consultant analyzing SGLGB (Seal of Good Local Governance - Barangay) assessment rework feedback.

BARANGAY INFORMATION:
- Name: {barangay_name}
- Assessment ID: {assessment_id}
- Status: Rework Requested

CONTEXT:
Assessors and validators have reviewed this barangay's assessment submission and provided MOV-level feedback identifying issues that need to be addressed. Your task is to generate a clear, comprehensive, and actionable summary that helps the BLGU (Barangay Local Government Unit) understand exactly what needs to be fixed.

INDICATORS REQUIRING REWORK:
"""

        for idx, indicator in enumerate(indicator_data, 1):
            prompt += f"""
{idx}. {indicator["indicator_name"]}
   - Governance Area: {indicator["governance_area"]}
   - Description: {indicator["description"]}
"""

            if indicator["mov_notes"]:
                prompt += "   - MOV Notes (Assessor/Validator Feedback):\n"
                for note in indicator["mov_notes"]:
                    prompt += f"     • {note['filename']}: {note['note']}\n"

            if indicator["mov_annotations"]:
                prompt += "   - Document Annotations (Assessor/Validator):\n"
                for annotation in indicator["mov_annotations"]:
                    page_info = (
                        f"(Page {annotation['page']})" if annotation["page"] is not None else ""
                    )
                    prompt += (
                        f"     • {annotation['filename']} {page_info}: {annotation['comment']}\n"
                    )

        prompt += """

TASK:
Based on the assessor feedback above, generate a comprehensive rework summary in the following JSON structure:

{
  "overall_summary": "A brief 2-3 sentence summary of the main issues across all indicators. Be specific and actionable.",
  "indicator_summaries": [
    {
      "indicator_id": 1,
      "indicator_name": "Full indicator name",
      "key_issues": [
        "Barangay lacks Disaster Preparedness Plan with evacuation routes",
        "Annual Budget Ordinance for 2024 not uploaded"
      ],
      "suggested_actions": [
        "Upload the updated Disaster Preparedness Plan including evacuation routes and emergency contact list",
        "Submit the Annual Budget Ordinance 2024 with revenue and expenditure breakdown"
      ],
      "affected_movs": ["disaster_plan.pdf", "budget_ordinance_2024.pdf"]
    }
  ],
  "priority_actions": [
    "Upload missing Annual Budget Ordinance for 2024",
    "Complete Disaster Preparedness Plan with all required sections",
    "Submit BDRRMC training attendance records"
  ],
  "estimated_time": "Estimated time to complete all rework (e.g., '30-45 minutes', '1-2 hours')"
}

REMEMBER:
- key_issues: 3rd person, specific document/indicator names (e.g., "Barangay lacks X", "X not uploaded")
- suggested_actions: 2nd person, actionable steps (e.g., "Upload X", "You should Y")

GUIDELINES:
1. Be clear and specific - avoid vague language
2. Focus on actionable steps the BLGU can take immediately
3. Prioritize issues that will have the biggest impact on compliance
4. Use simple language that BLGU staff can easily understand
5. For each indicator, extract the key issues from both MOV notes and MOV annotations
6. Suggest concrete actions (e.g., "Reupload budget ordinance with clearer dates" not "Fix budget document")
7. List only the top 3-5 priority actions that address the most critical issues
8. Estimate time realistically based on the complexity and number of issues

CRITICAL - POV AND SPECIFICITY REQUIREMENTS:
9. For "key_issues": Use 3rd person POV because these are aggregated on the MLGOO dashboard
   - CORRECT: "Barangay lacks Disaster Preparedness Plan"
   - WRONG: "You need to provide Disaster Preparedness Plan"
   - WHY: MLGOO officials view aggregated issues ABOUT multiple barangays

10. For "suggested_actions": Use 2nd person active voice because these are shown TO the BLGU
   - CORRECT: "Upload the updated Disaster Preparedness Plan"
   - WHY: BLGU users see these as direct instructions for their barangay

11. ALWAYS include specific indicator/document/plan names in "key_issues"
   - CORRECT: "Annual Budget Ordinance for 2024 not uploaded"
   - WRONG: "Missing budget document" (WHICH document?)
   - CORRECT: "BDRRMC training records incomplete"
   - WRONG: "Incomplete documentation" (WHICH documentation?)

12. Include governance area context when relevant to help MLGOO officials understand the domain
   - GOOD: "Disaster Preparedness Plan lacks evacuation routes (Safety, Peace and Order)"
   - BETTER: "Barangay Disaster Preparedness Plan lacks evacuation routes"
"""

        return prompt, indicator_data

    def generate_rework_summary(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> dict[str, Any]:
        """
        Generate AI-powered rework summary from assessor feedback.

        Builds a comprehensive prompt from all rework feedback (comments and
        annotations), calls Gemini API with circuit breaker and rate limiting
        protection, and returns a structured summary that helps BLGU users
        understand what needs to be fixed.

        This method does NOT cache results - it generates a fresh summary each time.
        Caching is handled by the background worker that stores results in
        assessment.rework_summary.

        Args:
            db: Database session
            assessment_id: ID of the assessment in rework status
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Dictionary with rework summary structure matching ReworkSummaryResponse schema

        Raises:
            ValueError: If assessment not found, API key not configured, or no rework data
            Exception: If API call fails, rate limited, or response parsing fails
        """
        # Check if API key is configured
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured in environment")

        # Validate language
        self._validate_language(language)

        # Build the prompt with language instruction
        prompt, indicator_data = self.build_rework_summary_prompt(db, assessment_id, language)

        try:
            # Call Gemini API with circuit breaker and rate limiting protection
            response_text = self._call_gemini_with_circuit_breaker(
                prompt=prompt,
                operation="rework_summary",
                language=language,
                max_output_tokens=8192,
            )

            # Extract JSON from response using helper method
            json_str = self._extract_json_from_response(response_text)

            # Parse the JSON
            parsed_response = json.loads(json_str)

            # Validate the response structure
            required_keys = [
                "overall_summary",
                "indicator_summaries",
                "priority_actions",
            ]
            if not all(key in parsed_response for key in required_keys):
                raise ValueError(
                    f"Gemini API response missing required keys. Got: {list(parsed_response.keys())}"
                )

            # Add generation timestamp and language
            parsed_response["generated_at"] = datetime.now(UTC).isoformat()
            parsed_response["language"] = language

            # Ensure estimated_time exists (set default if not provided)
            if "estimated_time" not in parsed_response:
                # Estimate based on number of indicators
                num_indicators = len(parsed_response["indicator_summaries"])
                if num_indicators <= 2:
                    parsed_response["estimated_time"] = "30-45 minutes"
                elif num_indicators <= 4:
                    parsed_response["estimated_time"] = "1-2 hours"
                else:
                    parsed_response["estimated_time"] = "2-3 hours"

            logger.info(f"Successfully generated rework summary for assessment {assessment_id}")

            return parsed_response

        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to parse Gemini API response as JSON for assessment {assessment_id}"
            )
            raise Exception("Failed to parse Gemini API response as JSON") from e
        except TimeoutError as e:
            raise Exception("Gemini API request timed out after waiting for response") from e
        except ValueError:
            # Re-raise ValueError as-is
            raise
        except Exception as e:
            # Use helper method for error handling
            raise self._handle_gemini_error(e, "rework summary generation", assessment_id) from e

    def generate_default_language_summaries(
        self, db: Session, assessment_id: int
    ) -> dict[str, dict[str, Any]]:
        """
        Generate rework summaries in default languages (Bisaya + English).

        This is called by the Celery worker when an assessment enters rework status.
        Generates summaries in both Bisaya (ceb) and English (en) upfront for instant
        language switching. Tagalog is generated on-demand when requested.

        Args:
            db: Database session
            assessment_id: ID of the assessment in rework status

        Returns:
            Dictionary keyed by language code with summary data:
            {"ceb": {...}, "en": {...}}
        """
        summaries = {}
        for lang in DEFAULT_LANGUAGES:
            try:
                logger.info(f"Generating {lang} rework summary for assessment {assessment_id}")
                summaries[lang] = self.generate_rework_summary(db, assessment_id, lang)
            except Exception as e:
                logger.error(
                    f"Failed to generate {lang} rework summary for assessment {assessment_id}: {e}"
                )
                # Continue with other languages even if one fails
        return summaries

    def generate_single_language_summary(
        self, db: Session, assessment_id: int, language: str
    ) -> dict[str, Any]:
        """
        Generate rework summary for a specific language (on-demand).

        Used when a user requests a language that wasn't pre-generated
        (e.g., Tagalog which is generated on-demand).

        Args:
            db: Database session
            assessment_id: ID of the assessment in rework status
            language: Language code (ceb, fil, en)

        Returns:
            Dictionary with rework summary in the requested language
        """
        return self.generate_rework_summary(db, assessment_id, language)

    # ========================================
    # CALIBRATION SUMMARY GENERATION (AI-POWERED)
    # ========================================

    def build_calibration_summary_prompt(
        self,
        db: Session,
        assessment_id: int,
        governance_area_id: int,
        language: str = "ceb",
    ) -> tuple[str, list[dict[str, Any]]]:
        """
        Build a structured prompt for Gemini API from calibration feedback.

        Unlike rework summaries which cover all indicators, calibration summaries
        focus only on indicators in the validator's governance area that were
        marked as FAIL (Unmet). Uses MOV-level notes and annotations from both
        assessors and validators as the data source.

        Args:
            db: Database session
            assessment_id: ID of the assessment in rework/calibration status
            governance_area_id: ID of the validator's governance area
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Tuple of (prompt_string, indicator_data_list)
            - prompt_string: Formatted prompt for Gemini API
            - indicator_data_list: Raw data for each indicator (for reference)

        Raises:
            ValueError: If assessment not found or no calibration data
        """
        # Get assessment with all relationships
        from app.db.models.assessment import MOVAnnotation
        from app.db.models.user import User

        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
                selectinload(Assessment.mov_files),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Get the governance area name
        governance_area = (
            db.query(GovernanceArea).filter(GovernanceArea.id == governance_area_id).first()
        )
        governance_area_name = governance_area.name if governance_area else "Unknown"

        # Get barangay name
        barangay_name = "Unknown"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Batch-fetch all annotations for this assessment's MOV files to avoid N+1 queries
        active_mov_files = [mf for mf in assessment.mov_files if mf.deleted_at is None]
        mov_file_ids = [mf.id for mf in active_mov_files]
        all_annotations = (
            db.query(MOVAnnotation).filter(MOVAnnotation.mov_file_id.in_(mov_file_ids)).all()
            if mov_file_ids
            else []
        )
        annotations_by_mov_id: dict[int, list] = defaultdict(list)
        for a in all_annotations:
            annotations_by_mov_id[a.mov_file_id].append(a)

        # Build a lookup of MOV files by indicator_id
        mov_files_by_indicator: dict[int, list] = defaultdict(list)
        for mf in active_mov_files:
            mov_files_by_indicator[mf.indicator_id].append(mf)

        # Get indicators requiring calibration (only from the validator's governance area)
        # Filter to indicators that have requires_rework=True and are in the validator's area
        indicator_data = []
        for response in assessment.responses:
            if not response.requires_rework:
                continue

            indicator = response.indicator
            if not indicator or indicator.governance_area_id != governance_area_id:
                continue

            # Get MOV files for this indicator
            indicator_mov_files = mov_files_by_indicator.get(indicator.id, [])

            # Collect MOV notes from assessors/validators
            mov_notes = []
            mov_annotations = []
            affected_mov_files = set()

            for mov_file in indicator_mov_files:
                # Collect assessor_notes (MOV-level notes from assessors/validators)
                if mov_file.assessor_notes and mov_file.assessor_notes.strip():
                    mov_notes.append(
                        {
                            "filename": mov_file.file_name,
                            "note": mov_file.assessor_notes.strip(),
                        }
                    )
                    affected_mov_files.add(mov_file.file_name)

                # Collect MOV annotations (from batch-fetched data)
                for annotation in annotations_by_mov_id.get(mov_file.id, []):
                    mov_annotations.append(
                        {
                            "filename": mov_file.file_name,
                            "comment": annotation.comment,
                            "page": annotation.page,
                        }
                    )
                    affected_mov_files.add(mov_file.file_name)

            indicator_data.append(
                {
                    "indicator_id": indicator.id,
                    "indicator_name": indicator.name,
                    "description": indicator.description,
                    "governance_area": governance_area_name,
                    "mov_notes": mov_notes,
                    "mov_annotations": mov_annotations,
                    "affected_movs": list(affected_mov_files),
                }
            )

        if not indicator_data:
            raise ValueError(
                f"Assessment {assessment_id} has no indicators requiring calibration in governance area {governance_area_id}"
            )

        # Get language instruction
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["ceb"])

        # Build the prompt (similar to rework but emphasizing calibration context)
        prompt = f"""{lang_instruction}

You are an expert consultant analyzing SGLGB (Seal of Good Local Governance - Barangay) assessment calibration feedback.

BARANGAY INFORMATION:
- Name: {barangay_name}
- Assessment ID: {assessment_id}
- Status: Calibration Requested
- Governance Area: {governance_area_name}

CONTEXT:
Assessors and validators have reviewed this barangay's assessment during table validation and provided MOV-level feedback identifying specific issues in the "{governance_area_name}" governance area that need to be addressed. Unlike a full rework, calibration focuses only on specific indicators that were marked as "Unmet" (Failed) during validation.

Your task is to generate a clear, comprehensive, and actionable summary that helps the BLGU (Barangay Local Government Unit) understand exactly what needs to be fixed for this specific governance area.

INDICATORS REQUIRING CALIBRATION:
"""

        for idx, indicator in enumerate(indicator_data, 1):
            prompt += f"""
{idx}. {indicator["indicator_name"]}
   - Governance Area: {indicator["governance_area"]}
   - Description: {indicator["description"]}
"""

            if indicator["mov_notes"]:
                prompt += "   - MOV Notes (Assessor/Validator Feedback):\n"
                for note in indicator["mov_notes"]:
                    prompt += f"     • {note['filename']}: {note['note']}\n"

            if indicator["mov_annotations"]:
                prompt += "   - Document Annotations (Assessor/Validator):\n"
                for annotation in indicator["mov_annotations"]:
                    page_info = (
                        f"(Page {annotation['page']})" if annotation["page"] is not None else ""
                    )
                    prompt += (
                        f"     • {annotation['filename']} {page_info}: {annotation['comment']}\n"
                    )

        prompt += f"""

TASK:
Based on the validator feedback above, generate a comprehensive calibration summary in the following JSON structure:

{{
  "overall_summary": "A brief 2-3 sentence summary of the main issues in the {governance_area_name} governance area. Be specific and actionable.",
  "governance_area": "{governance_area_name}",
  "indicator_summaries": [
    {{
      "indicator_id": 1,
      "indicator_name": "Full indicator name",
      "key_issues": [
        "Barangay Annual Budget Ordinance missing revenue breakdown",
        "Investment Plan 2024 lacks project implementation timeline"
      ],
      "suggested_actions": [
        "Upload revised Annual Budget Ordinance with detailed revenue sources and amounts",
        "Update Investment Plan to include quarter-by-quarter timeline for each project"
      ],
      "affected_movs": ["budget_ordinance.pdf", "investment_plan_2024.pdf"]
    }}
  ],
  "priority_actions": [
    "Add revenue breakdown to Annual Budget Ordinance",
    "Include project timelines in Investment Plan 2024",
    "Submit signed certification from Municipal Accountant"
  ],
  "estimated_time": "Estimated time to complete calibration corrections (e.g., '15-30 minutes', '30-45 minutes')"
}}

REMEMBER:
- key_issues: 3rd person, specific document/indicator names (e.g., "Barangay X missing Y", "X lacks Y")
- suggested_actions: 2nd person, actionable steps (e.g., "Upload X with Y", "Update X to include Y")

GUIDELINES:
1. Be clear and specific - avoid vague language
2. Focus on actionable steps the BLGU can take immediately
3. Emphasize that this is a focused calibration, not a full rework
4. Use simple language that BLGU staff can easily understand
5. For each indicator, extract the key issues from both MOV notes and MOV annotations
6. Suggest concrete actions (e.g., "Reupload budget ordinance with clearer dates" not "Fix budget document")
7. List only the top 3 priority actions that address the most critical issues
8. Estimate time realistically - calibrations are typically faster than full reworks
9. Remember this is only for the {governance_area_name} governance area, not all indicators

CRITICAL - POV AND SPECIFICITY REQUIREMENTS:
10. For "key_issues": Use 3rd person POV because these are aggregated on the MLGOO dashboard
   - CORRECT: "Barangay lacks Annual Budget Ordinance"
   - WRONG: "You need to provide Annual Budget Ordinance"
   - WHY: MLGOO officials view aggregated issues ABOUT multiple barangays

11. For "suggested_actions": Use 2nd person active voice because these are shown TO the BLGU
   - CORRECT: "Upload the Annual Budget Ordinance with revenue breakdown"
   - WHY: BLGU users see these as direct instructions for their barangay

12. ALWAYS include specific indicator/document/plan names in "key_issues"
   - CORRECT: "Barangay Investment Plan 2024 missing project timelines"
   - WRONG: "Missing timelines" (FOR WHICH document?)
   - CORRECT: "BDRRMC training attendance records not documented"
   - WRONG: "No documentation" (WHAT documentation?)

13. Since calibration is area-specific, include the governance area context naturally
   - GOOD: "Annual Budget Ordinance (Financial Administration) missing revenue details"
   - BETTER: "Barangay Annual Budget Ordinance missing revenue details"
"""

        return prompt, indicator_data

    def generate_calibration_summary(
        self,
        db: Session,
        assessment_id: int,
        governance_area_id: int,
        language: str = "ceb",
    ) -> dict[str, Any]:
        """
        Generate AI-powered calibration summary from validator feedback.

        Builds a comprehensive prompt from calibration feedback (comments and
        annotations) for the specified governance area, calls Gemini API with
        circuit breaker and rate limiting protection, and returns a structured
        summary that helps BLGU users understand what needs to be fixed.

        This method does NOT cache results - it generates a fresh summary each time.
        Caching is handled by the background worker that stores results in
        assessment.calibration_summary.

        Args:
            db: Database session
            assessment_id: ID of the assessment in calibration status
            governance_area_id: ID of the validator's governance area
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Dictionary with calibration summary structure matching CalibrationSummaryResponse schema

        Raises:
            ValueError: If assessment not found, API key not configured, or no calibration data
            Exception: If API call fails, rate limited, or response parsing fails
        """
        # Check if API key is configured
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured in environment")

        # Validate language
        self._validate_language(language)

        # Build the prompt with language instruction
        prompt, indicator_data = self.build_calibration_summary_prompt(
            db, assessment_id, governance_area_id, language
        )

        try:
            # Call Gemini API with circuit breaker and rate limiting protection
            response_text = self._call_gemini_with_circuit_breaker(
                prompt=prompt,
                operation="calibration_summary",
                language=language,
                max_output_tokens=8192,
            )

            # Extract JSON from response using helper method
            json_str = self._extract_json_from_response(response_text)

            # Parse the JSON
            parsed_response = json.loads(json_str)

            # Validate the response structure
            required_keys = [
                "overall_summary",
                "indicator_summaries",
                "priority_actions",
            ]
            if not all(key in parsed_response for key in required_keys):
                raise ValueError(
                    f"Gemini API response missing required keys. Got: {list(parsed_response.keys())}"
                )

            # Add generation timestamp, language, and governance area info
            parsed_response["generated_at"] = datetime.now(UTC).isoformat()
            parsed_response["language"] = language
            parsed_response["governance_area_id"] = governance_area_id

            # Ensure estimated_time exists (set default if not provided)
            if "estimated_time" not in parsed_response:
                # Estimate based on number of indicators (calibrations are typically faster)
                num_indicators = len(parsed_response["indicator_summaries"])
                if num_indicators <= 2:
                    parsed_response["estimated_time"] = "15-30 minutes"
                elif num_indicators <= 4:
                    parsed_response["estimated_time"] = "30-45 minutes"
                else:
                    parsed_response["estimated_time"] = "1-2 hours"

            logger.info(
                f"Successfully generated calibration summary for assessment {assessment_id} "
                f"(governance area {governance_area_id})"
            )

            return parsed_response

        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to parse Gemini API response as JSON for assessment {assessment_id}"
            )
            raise Exception("Failed to parse Gemini API response as JSON") from e
        except TimeoutError as e:
            raise Exception("Gemini API request timed out after waiting for response") from e
        except ValueError:
            # Re-raise ValueError as-is
            raise
        except Exception as e:
            # Use helper method for error handling
            raise self._handle_gemini_error(
                e, "calibration summary generation", assessment_id
            ) from e

    def generate_default_language_calibration_summaries(
        self, db: Session, assessment_id: int, governance_area_id: int
    ) -> dict[str, dict[str, Any]]:
        """
        Generate calibration summaries in default languages (Bisaya + English).

        This is called by the Celery worker when an assessment enters calibration status.
        Generates summaries in both Bisaya (ceb) and English (en) upfront for instant
        language switching. Tagalog is generated on-demand when requested.

        Args:
            db: Database session
            assessment_id: ID of the assessment in calibration status
            governance_area_id: ID of the validator's governance area

        Returns:
            Dictionary keyed by language code with summary data:
            {"ceb": {...}, "en": {...}}
        """
        summaries = {}
        for lang in DEFAULT_LANGUAGES:
            try:
                logger.info(
                    f"Generating {lang} calibration summary for assessment {assessment_id} "
                    f"(governance area {governance_area_id})"
                )
                summaries[lang] = self.generate_calibration_summary(
                    db, assessment_id, governance_area_id, lang
                )
            except Exception as e:
                logger.error(
                    f"Failed to generate {lang} calibration summary for assessment {assessment_id}: {e}"
                )
                # Continue with other languages even if one fails
        return summaries

    def generate_single_language_calibration_summary(
        self, db: Session, assessment_id: int, governance_area_id: int, language: str
    ) -> dict[str, Any]:
        """
        Generate calibration summary for a specific language (on-demand).

        Used when a user requests a language that wasn't pre-generated
        (e.g., Tagalog which is generated on-demand).

        Args:
            db: Database session
            assessment_id: ID of the assessment in calibration status
            governance_area_id: ID of the validator's governance area
            language: Language code (ceb, fil, en)

        Returns:
            Dictionary with calibration summary in the requested language
        """
        return self.generate_calibration_summary(db, assessment_id, governance_area_id, language)

    # ========================================
    # CAPDEV (CAPACITY DEVELOPMENT) INSIGHTS GENERATION
    # Generated after MLGOO approval for approved assessments
    # ========================================

    def build_capdev_prompt(self, db: Session, assessment_id: int, language: str = "ceb") -> str:
        """
        Build a comprehensive prompt for CapDev insights generation.

        Creates a detailed prompt that analyzes:
        - Failed indicators and governance area weaknesses
        - Area-level compliance results
        - Assessor/Validator feedback patterns
        - Generates actionable CapDev interventions

        Args:
            db: Database session
            assessment_id: ID of the approved assessment
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Formatted prompt string for Gemini API

        Raises:
            ValueError: If assessment not found or not approved
        """
        from app.db.models.user import User

        # Get assessment with all relationships
        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
                joinedload(Assessment.responses).joinedload(AssessmentResponse.feedback_comments),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        if not assessment.mlgoo_approved_at:
            raise ValueError(f"Assessment {assessment_id} has not been approved by MLGOO")

        # Get barangay name
        barangay_name = "Unknown"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Get assessment year
        assessment_year = str(assessment.mlgoo_approved_at.year)

        # Get compliance status
        compliance_status = (
            assessment.final_compliance_status.value
            if assessment.final_compliance_status
            else "Not classified"
        )

        # Get area results
        area_results = assessment.area_results or {}

        # Group indicators by governance area and status
        area_analysis = {}
        for response in assessment.responses:
            indicator = response.indicator
            if not indicator or not indicator.governance_area:
                continue

            area_name = indicator.governance_area.name
            area_type = indicator.governance_area.area_type.value

            if area_name not in area_analysis:
                area_analysis[area_name] = {
                    "area_type": area_type,
                    "passed_indicators": [],
                    "failed_indicators": [],
                    "assessor_feedback": [],
                }

            if response.validation_status in (
                ValidationStatus.PASS,
                ValidationStatus.CONDITIONAL,
            ):
                area_analysis[area_name]["passed_indicators"].append(indicator.name)
            else:
                area_analysis[area_name]["failed_indicators"].append(
                    {
                        "name": indicator.name,
                        "description": indicator.description,
                    }
                )

                # Collect feedback for failed indicators
                for comment in response.feedback_comments:
                    if not comment.is_internal_note:
                        area_analysis[area_name]["assessor_feedback"].append(comment.comment)

        # Get language instruction
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["ceb"])

        # Build the prompt
        prompt = f"""{lang_instruction}

You are an expert consultant specializing in local governance capacity development for Philippine barangays. You are analyzing the SGLGB (Seal of Good Local Governance - Barangay) assessment results to generate comprehensive Capacity Development (CapDev) recommendations.

BARANGAY INFORMATION:
- Name: {barangay_name}
- Assessment Year: {assessment_year}
- Overall Compliance Status: {compliance_status}

AREA-LEVEL RESULTS:
"""
        for area_name, status in area_results.items():
            area_type = "Core" if area_name in CORE_AREAS else "Essential"
            prompt += f"- {area_name} ({area_type}): {status}\n"

        prompt += """

DETAILED AREA ANALYSIS:
"""
        for area_name, analysis in area_analysis.items():
            prompt += f"""
{area_name} ({analysis["area_type"]}):
  - Passed Indicators: {len(analysis["passed_indicators"])}
  - Failed Indicators: {len(analysis["failed_indicators"])}
"""
            if analysis["failed_indicators"]:
                prompt += "  - Failed Indicator Details:\n"
                for ind in analysis["failed_indicators"]:
                    desc = ind["description"] or "No description available"
                    prompt += f"    • {ind['name']}: {desc[:100]}...\n"

            if analysis["assessor_feedback"]:
                prompt += "  - Key Assessor Feedback:\n"
                for feedback in analysis["assessor_feedback"][:3]:  # Limit to 3 per area
                    prompt += f"    • {feedback[:150]}...\n"

        prompt += """

GUIDELINES (Read first before generating):
1. Focus on ROOT CAUSES of non-compliance, not just symptoms
2. Provide SPECIFIC, ACTIONABLE interventions tailored to Philippine barangay context
3. Categorize capacity development needs into: Training, Resources, Technical Assistance, Policy
4. For priority values use EXACTLY: "Immediate" (within 1 month), "Short-term" (1-3 months), "Long-term" (3-6 months)
5. Include realistic resource requirements and suggested providers (DILG, LGA, municipal government, etc.)
6. Consider the "3+1" SGLGB rule: All 3 Core areas must pass + at least 1 Essential area
7. Recommendations should be practical for a barangay-level government
8. Use simple language that barangay officials can understand
9. Generate 3-7 items per array (not too few, not too many)

TASK:
Based on the assessment results above, generate a comprehensive CapDev (Capacity Development) analysis.

REQUIRED JSON STRUCTURE:
{
  "summary": "A comprehensive 3-4 sentence summary of the barangay's key governance strengths and weaknesses. Highlight the most critical areas needing improvement and overall assessment.",
  "governance_weaknesses": [
    "Specific weakness 1 - describe the actual problem found in failed indicators",
    "Specific weakness 2 - describe another governance gap",
    "..."
  ],
  "recommendations": [
    "Actionable recommendation 1 - specific and implementable step the barangay can take",
    "Actionable recommendation 2 - another concrete action",
    "..."
  ],
  "capacity_development_needs": [
    {
      "category": "Training",
      "description": "Specific training need description",
      "affected_indicators": ["Indicator Name 1", "Indicator Name 2"],
      "suggested_providers": ["DILG", "LGA", "Municipal Government"]
    }
  ],
  "suggested_interventions": [
    {
      "title": "Clear intervention title",
      "description": "Detailed description of what this intervention involves",
      "governance_area": "Name of the affected governance area",
      "priority": "Immediate",
      "estimated_duration": "1-2 weeks",
      "resource_requirements": "Brief description of resources needed"
    }
  ],
  "priority_actions": [
    "Most critical immediate action the barangay must take first",
    "Second priority action",
    "Third priority action"
  ]
}

STRICT REQUIREMENTS:
- governance_weaknesses: Array of 3-7 strings describing specific weaknesses
- recommendations: Array of 3-7 strings with actionable steps
- capacity_development_needs: Array of 2-5 objects with category, description, affected_indicators, suggested_providers
- capacity_development_needs.category MUST be one of: "Training", "Resources", "Technical Assistance", "Policy"
- suggested_interventions: Array of 2-5 objects with title, description, governance_area, priority, estimated_duration, resource_requirements
- suggested_interventions.priority MUST be one of: "Immediate", "Short-term", "Long-term"
- priority_actions: Array of exactly 3-5 strings listing the most critical actions
- suggested_providers MUST be real Philippine agencies: DILG, LGA, MDRRMO, Municipal Government, DBM, Sangguniang Barangay, Provincial Government

EXAMPLE OUTPUT (for reference - generate based on actual data above):
{
  "summary": "Ang barangay nakapakita og maayo nga performance sa Social Protection pero adunay kritikal nga mga gaps sa Financial Administration ug Disaster Preparedness. Ang pinaka-urgent nga kinahanglan ayohon mao ang budget documentation ug pag-establish og functional disaster response team.",
  "governance_weaknesses": [
    "Kulang ang quarterly budget reports - wala kompleto ang dokumentasyon sa Q1-Q4",
    "Ang disaster response plan outdated na ug wala na-update sukad 2020",
    "Walay digital record-keeping system para sa financial transactions"
  ],
  "recommendations": [
    "Maghimo og digital budget tracking gamit ang Google Sheets o Excel nga may monthly reconciliation",
    "I-update ang disaster response plan ug i-include ang current evacuation centers",
    "Mag-schedule og training para sa barangay treasurer sa financial management"
  ],
  "capacity_development_needs": [
    {
      "category": "Training",
      "description": "Financial management ug reporting skills para sa barangay treasurer ug secretary",
      "affected_indicators": ["Quarterly Budget Reports", "Fund Utilization Documentation"],
      "suggested_providers": ["DILG Regional Office", "DBM"]
    },
    {
      "category": "Technical Assistance",
      "description": "Setup og digital record-keeping system para sa barangay",
      "affected_indicators": ["Financial Records", "Budget Documentation"],
      "suggested_providers": ["Municipal Government", "DILG"]
    }
  ],
  "suggested_interventions": [
    {
      "title": "Financial Management Training Workshop",
      "description": "3-day hands-on training sa budget preparation, fund tracking, ug audit compliance. May provision og budget templates ug 3-month mentoring.",
      "governance_area": "Financial Administration and Sustainability",
      "priority": "Immediate",
      "estimated_duration": "3 days + 3 months mentoring",
      "resource_requirements": "Training venue, DILG trainers, laptops, budget software"
    },
    {
      "title": "Disaster Response Plan Update Workshop",
      "description": "Workshop para i-review ug i-update ang existing disaster response plan. I-include ang bag-ong protocols ug evacuation procedures.",
      "governance_area": "Disaster Preparedness",
      "priority": "Short-term",
      "estimated_duration": "2 days",
      "resource_requirements": "MDRRMO facilitator, reference materials, printing costs"
    }
  ],
  "priority_actions": [
    "I-submit ang complete quarterly budget reports sa municipal accountant within 2 weeks",
    "Mag-schedule og training para sa treasurer ug secretary sa financial record-keeping",
    "I-update ang disaster response plan ug i-submit sa MDRRMO for review"
  ]
}

NOW GENERATE the CapDev analysis based on the ACTUAL assessment data provided above. Output ONLY the JSON, no additional text.
"""

        return prompt

    def generate_capdev_insights(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> dict[str, Any]:
        """
        Generate AI-powered CapDev insights for an approved assessment.

        Builds a comprehensive prompt from assessment data, calls Gemini API
        with circuit breaker and rate limiting protection, and returns structured
        CapDev insights including:
        - Summary of governance weaknesses
        - Actionable recommendations
        - Categorized capacity development needs
        - Prioritized interventions

        Args:
            db: Database session
            assessment_id: ID of the approved assessment
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Dictionary with CapDev insights structure

        Raises:
            ValueError: If assessment not found, not approved, or API key not configured
            Exception: If API call fails, rate limited, or response parsing fails
        """
        # Check if API key is configured
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured in environment")

        # Validate language
        self._validate_language(language)

        # Build the prompt
        prompt = self.build_capdev_prompt(db, assessment_id, language)

        try:
            # Call Gemini API with circuit breaker and rate limiting protection
            # CapDev uses larger output tokens for comprehensive insights
            response_text = self._call_gemini_with_circuit_breaker(
                prompt=prompt,
                operation="capdev_insights",
                language=language,
                max_output_tokens=16384,  # Larger output for comprehensive CapDev
            )

            # Extract JSON from response using helper method
            json_str = self._extract_json_from_response(response_text)

            # Parse the JSON
            parsed_response = json.loads(json_str)

            # Validate the response structure
            parsed_response = self._validate_capdev_response(parsed_response, assessment_id)

            # Add metadata
            parsed_response["generated_at"] = datetime.now(UTC).isoformat()
            parsed_response["language"] = language
            parsed_response["assessment_id"] = assessment_id

            logger.info(
                f"Successfully generated CapDev insights for assessment {assessment_id} in {language}"
            )

            return parsed_response

        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to parse Gemini API response as JSON for assessment {assessment_id}"
            )
            raise Exception("Failed to parse Gemini API response as JSON") from e
        except TimeoutError as e:
            raise Exception("Gemini API request timed out after waiting for response") from e
        except ValueError:
            raise
        except Exception as e:
            # Use helper method for error handling
            raise self._handle_gemini_error(e, "CapDev insights generation", assessment_id) from e

    def generate_default_language_capdev_insights(
        self, db: Session, assessment_id: int
    ) -> dict[str, dict[str, Any]]:
        """
        Generate CapDev insights in default languages (Bisaya + English).

        This is called by the Celery worker when MLGOO approves an assessment.
        Generates insights in both Bisaya (ceb) and English (en) upfront.

        Args:
            db: Database session
            assessment_id: ID of the approved assessment

        Returns:
            Dictionary keyed by language code with insights data:
            {"ceb": {...}, "en": {...}}
        """
        insights = {}
        for lang in DEFAULT_LANGUAGES:
            try:
                logger.info(f"Generating {lang} CapDev insights for assessment {assessment_id}")
                insights[lang] = self.generate_capdev_insights(db, assessment_id, lang)
            except Exception as e:
                logger.error(
                    f"Failed to generate {lang} CapDev insights for assessment {assessment_id}: {e}"
                )
                # Continue with other languages even if one fails
        return insights

    def get_capdev_insights_with_caching(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> dict[str, Any]:
        """
        Get CapDev insights with language-aware caching.

        First checks if capdev_insights already exists for the requested language.
        If cached data exists, returns it immediately without calling Gemini API.
        If not, calls Gemini API, stores the result, and returns it.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Dictionary with CapDev insights

        Raises:
            ValueError: If assessment not found, not approved, or language not supported
            Exception: If API call fails
        """
        # Validate language
        self._validate_language(language)

        # Get assessment to check for cached insights
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        if not assessment.mlgoo_approved_at:
            raise ValueError(f"Assessment {assessment_id} has not been approved by MLGOO")

        # Check if capdev_insights already exists for this language
        if assessment.capdev_insights:
            if isinstance(assessment.capdev_insights, dict):
                if language in assessment.capdev_insights:
                    cache_operations_total.labels(operation="capdev", result="hit").inc()
                    logger.debug(
                        f"Cache HIT for CapDev insights assessment {assessment_id} ({language})"
                    )
                    return assessment.capdev_insights[language]

        # Cache miss - need to call API
        cache_operations_total.labels(operation="capdev", result="miss").inc()
        logger.debug(f"Cache MISS for CapDev insights assessment {assessment_id} ({language})")

        # No cached data for this language, generate new insights
        insights = self.generate_capdev_insights(db, assessment_id, language)

        # Store in database under the language key
        if not assessment.capdev_insights:
            assessment.capdev_insights = {}

        assessment.capdev_insights[language] = insights
        # Mark the JSON column as modified so SQLAlchemy detects the change
        flag_modified(assessment, "capdev_insights")
        assessment.capdev_insights_generated_at = datetime.now(UTC)
        assessment.capdev_insights_status = "completed"
        assessment.updated_at = datetime.now(UTC)
        db.commit()
        db.refresh(assessment)

        return insights

    def formulate_adjustment_reasons(
        self, raw_comments: list[str], max_reasons: int = 5
    ) -> list[str]:
        """
        Use AI to formulate raw MOV notes/annotations into proper descriptive sentences.

        This method takes raw assessor/validator MOV notes and annotations and transforms
        them into well-formulated 3rd person sentences suitable for display on the MLGOO
        dashboard as "Top Reasons for Adjustment".

        Args:
            raw_comments: List of raw MOV note/annotation strings from assessors/validators
            max_reasons: Maximum number of reasons to return (default: 5)

        Returns:
            List of well-formulated reason sentences in 3rd person POV.
            Returns empty list if API key is not configured or on failure
            (graceful degradation - allows fallback to raw comments).

        Note:
            - Output NEVER includes specific barangay names (anonymized/generalized)
            - Uses 3rd person POV (e.g., "Annual Budget missing" not "You need to provide X")
            - Similar comments are compiled/merged into single generalized reasons
            - Reasons are specific and mention actual documents/indicators
            - Language is hardcoded to English for MLGOO dashboard consistency
        """
        if not raw_comments:
            return []

        # Gracefully handle missing API key (return empty for fallback to raw comments)
        if not settings.GEMINI_API_KEY:
            logger.warning(
                "GEMINI_API_KEY not configured - skipping AI formulation of adjustment reasons"
            )
            return []

        # Deduplicate and limit input comments
        unique_comments = list(dict.fromkeys(raw_comments))[:20]  # Max 20 for API efficiency

        # SECURITY: Sanitize all comments to prevent prompt injection attacks
        sanitized_comments = [
            self._sanitize_for_prompt(comment, max_length=300) for comment in unique_comments
        ]

        # Build prompt for AI formulation
        comments_list = chr(10).join(f"- {comment}" for comment in sanitized_comments)
        prompt = f"""You are analyzing assessment feedback from the SGLGB system.

TASK: Transform these raw MOV notes and annotations from assessors/validators into
clear, well-formulated "reasons for adjustment" suitable for an MLGOO dashboard.

RAW MOV NOTES AND ANNOTATIONS:
{comments_list}

REQUIREMENTS:
1. NEVER include specific barangay names - Use generic terms instead
   - WRONG: "Ang Barangay Talas walay pirma sa treasurer"
   - WRONG: "Barangay San Jose lacks Annual Budget documentation"
   - CORRECT: "Annual Budget documentation missing treasurer's signature"
   - CORRECT: "Appropriation Ordinance incomplete or lacking signatures"

2. Use 3rd PERSON POV - These are shown on a dashboard where MLGOO officials
   view aggregated data across ALL barangays
   - WRONG: "You need to provide Annual Budget documentation"
   - CORRECT: "Annual Budget documentation incomplete or missing"

3. Be SPECIFIC - Always mention the actual document, indicator, or requirement
   - WRONG: "Missing documentation"
   - CORRECT: "Annual Investment Plan missing project timelines"

4. MERGE and COMPILE similar comments into single generalized reasons
   - If multiple comments mention missing signatures on different docs, combine them
   - If multiple comments mention the same type of issue, create ONE generalized reason
   - Example: "Certification walay pirma" + "AIP walay pirma" = "Required documents missing signatures"
   - Example: "MOV wala" + "Attachment wala" = "Required MOV attachments not uploaded"

5. Keep language SIMPLE and clear - Avoid bureaucratic jargon

6. Generate at most {max_reasons} distinct reasons, prioritizing the MOST COMMON issues

OUTPUT FORMAT:
Return a JSON array of strings, each being a well-formulated reason.

EXAMPLE OUTPUT:
[
  "Annual Budget documentation incomplete or missing required signatures",
  "Disaster Preparedness Plan lacks required evacuation routes",
  "Required MOV attachments not uploaded or incomplete",
  "Financial statements missing quarterly breakdown",
  "Certifications lacking proper signatures or authentication"
]

Generate the formulated reasons based on the raw MOV notes above.
Output ONLY the JSON array, no additional text.
"""

        try:
            # Call Gemini API with circuit breaker protection
            response_text = self._call_gemini_with_circuit_breaker(
                prompt=prompt,
                operation="formulate_adjustment_reasons",
                language="en",  # Hardcoded: MLGOO dashboard is English-only
                max_output_tokens=2048,
            )

            # Use helper to extract JSON from response (handles markdown code blocks)
            json_str = self._extract_json_from_response(response_text)
            reasons = json.loads(json_str)

            if isinstance(reasons, list):
                # Ensure all items are strings and limit to max_reasons
                return [str(r) for r in reasons if r][:max_reasons]
            else:
                logger.warning(
                    f"Unexpected response format from Gemini for adjustment "
                    f"reasons: {type(reasons)}"
                )
                return []

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response for adjustment reasons: {e}")
            return []
        except Exception as e:
            logger.error(f"Failed to formulate adjustment reasons: {e}")
            # Return empty list on failure - fallback to raw comments in analytics
            return []


intelligence_service = IntelligenceService()

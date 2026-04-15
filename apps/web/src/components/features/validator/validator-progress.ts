type AnyRecord = Record<string, any>;

export interface ValidatorProgressInput {
  checklistState: Record<string, any>;
  localMovAttentionByFileId: Record<number, boolean | undefined>;
  strictChecklistRequired: boolean;
  localForm?: { status?: "Pass" | "Fail" | "Conditional"; publicComment?: string };
}

export interface ValidatorChecklistCompletion {
  isComplete: boolean;
  validatableItemCount: number;
}

export interface ValidatorIndicatorProgress {
  status: "completed" | "not_started";
  hasMovNotes: boolean;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function uploadedAtMs(file: AnyRecord): number {
  const time = file.uploaded_at ? new Date(String(file.uploaded_at)).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function getFieldKey(file: AnyRecord): string {
  return String(file.field_id ?? "__missing_field__");
}

export function isBlguEvidenceFile(file: AnyRecord): boolean {
  return file.upload_origin !== "validator";
}

export function hasValidatorFileFeedback(file: AnyRecord): boolean {
  return hasText(file.validator_notes) || file.flagged_for_calibration === true;
}

export function isSupersededBlguMovFile(file: AnyRecord, files: AnyRecord[]): boolean {
  if (!isBlguEvidenceFile(file)) return false;

  const currentTime = uploadedAtMs(file);
  const fieldKey = getFieldKey(file);

  return files.some((candidate) => {
    if (!isBlguEvidenceFile(candidate)) return false;
    if (getFieldKey(candidate) !== fieldKey) return false;
    return uploadedAtMs(candidate) > currentTime;
  });
}

function isChecklistItemFilled(
  responseId: number,
  item: AnyRecord,
  checklistState: Record<string, any>
): boolean {
  const itemKey = `checklist_${responseId}_${item.item_id}`;

  if (
    item.item_type === "document_count" ||
    item.item_type === "calculation_field" ||
    item.item_type === "date_input" ||
    item.item_type === "text_input" ||
    item.requires_document_count
  ) {
    const value = checklistState[itemKey];
    return value !== false && value != null && String(value).trim() !== "";
  }

  if (item.item_type === "assessment_field") {
    return checklistState[`${itemKey}_yes`] === true;
  }

  return checklistState[itemKey] === true;
}

export function getValidatorChecklistCompletion(
  response: AnyRecord,
  checklistState: Record<string, any>
): ValidatorChecklistCompletion {
  const responseId = Number(response.id);
  const indicator = response.indicator ?? {};
  const checklistItems: AnyRecord[] = Array.isArray(indicator.checklist_items)
    ? indicator.checklist_items
    : [];
  const validationRule = indicator.validation_rule || "ALL_ITEMS_REQUIRED";
  const validatableItems: AnyRecord[] = checklistItems.filter(
    (item: AnyRecord) =>
      item.item_type !== "info_text" && !item.mov_description?.startsWith("Note:")
  );

  if (validatableItems.length === 0) {
    return { isComplete: false, validatableItemCount: 0 };
  }

  const groupedItems: Record<string, AnyRecord[]> = {};
  const ungroupedItems: AnyRecord[] = [];

  for (const item of validatableItems) {
    if (item.option_group) {
      groupedItems[item.option_group] ??= [];
      groupedItems[item.option_group].push(item);
    } else {
      ungroupedItems.push(item);
    }
  }

  const groupNames = Object.keys(groupedItems);
  if (groupNames.length > 0) {
    const ungroupedComplete = ungroupedItems.every((item) =>
      isChecklistItemFilled(responseId, item, checklistState)
    );

    if (!ungroupedComplete) {
      return { isComplete: false, validatableItemCount: validatableItems.length };
    }

    const anyGroupComplete = groupNames.some((groupName) => {
      const group = groupedItems[groupName] ?? [];
      const hasInternalOr = groupName.includes("Option 3") || groupName.includes("OPTION 3");

      return hasInternalOr
        ? group.some((item) => isChecklistItemFilled(responseId, item, checklistState))
        : group.every((item) => isChecklistItemFilled(responseId, item, checklistState));
    });

    return { isComplete: anyGroupComplete, validatableItemCount: validatableItems.length };
  }

  if (validationRule === "ANY_ITEM_REQUIRED" || validationRule === "OR_LOGIC_AT_LEAST_1_REQUIRED") {
    return {
      isComplete: validatableItems.some((item) =>
        isChecklistItemFilled(responseId, item, checklistState)
      ),
      validatableItemCount: validatableItems.length,
    };
  }

  const requiredItems = validatableItems.filter(
    (item: AnyRecord) => item.required || validationRule === "ALL_ITEMS_REQUIRED"
  );
  const itemsToCheck = requiredItems.length > 0 ? requiredItems : validatableItems;

  return {
    isComplete: itemsToCheck.every((item) =>
      isChecklistItemFilled(responseId, item, checklistState)
    ),
    validatableItemCount: validatableItems.length,
  };
}

export function hasExistingValidationStatus(response: AnyRecord): boolean {
  const status = response.validation_status;
  if (!status) return false;
  return ["PASS", "FAIL", "CONDITIONAL"].includes(String(status).toUpperCase());
}

function hasLocalValidationStatus(localForm?: ValidatorProgressInput["localForm"]): boolean {
  return (
    localForm?.status === "Pass" ||
    localForm?.status === "Fail" ||
    localForm?.status === "Conditional"
  );
}

export function hasActiveValidatorMovAttention(
  response: AnyRecord,
  options: { localMovAttentionByFileId: Record<number, boolean | undefined> }
): boolean {
  const files = Array.isArray(response.movs) ? response.movs : [];

  return files.some((file) => {
    if (!isBlguEvidenceFile(file)) return false;
    if (isSupersededBlguMovFile(file, files)) return false;

    const fileId = Number(file.id);
    const hasLocalAttention =
      Number.isFinite(fileId) && options.localMovAttentionByFileId[fileId] === true;

    return hasValidatorFileFeedback(file) || hasLocalAttention;
  });
}

export function getValidatorIndicatorProgress(
  response: AnyRecord,
  input: ValidatorProgressInput
): ValidatorIndicatorProgress {
  const hasMovNotes = hasActiveValidatorMovAttention(response, {
    localMovAttentionByFileId: input.localMovAttentionByFileId,
  });
  const checklistCompletion = getValidatorChecklistCompletion(response, input.checklistState);
  const hasValidationStatus =
    hasLocalValidationStatus(input.localForm) || hasExistingValidationStatus(response);

  const reviewed = input.strictChecklistRequired
    ? checklistCompletion.isComplete && !hasMovNotes
    : checklistCompletion.isComplete || hasMovNotes || hasValidationStatus;

  return {
    status: reviewed ? "completed" : "not_started",
    hasMovNotes,
  };
}

import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useMOVValidation } from '../useMOVValidation';
import type {
  MOVChecklistConfig,
  MOVCheckboxItem,
  MOVGroupItem,
  MOVCurrencyInputItem,
  MOVNumberInputItem,
  MOVDateInputItem,
  MOVRadioGroupItem,
  MOVDropdownItem,
  OptionItem,
} from '@/types/mov-checklist';

/**
 * Tests for useMOVValidation Hook (Story 3.10)
 *
 * Covers:
 * - Empty checklist validation (should be valid)
 * - Label validation (all items must have labels)
 * - Group validation (must have at least 1 child)
 * - OR group validation (min_required must be set)
 * - Currency/Number validation (min <= max)
 * - Threshold validation (threshold should be between min and max)
 * - Date validation (min_date <= max_date, grace_period_days validation)
 * - Radio group validation (at least 2 options, unique values)
 * - Dropdown validation (at least 1 option, unique values)
 * - Nested validation (validates children recursively)
 * - Error/warning separation
 * - errorsByItem grouping
 */

describe('useMOVValidation', () => {
  // ============================================================================
  // Empty Checklist Tests
  // ============================================================================

  it('should return valid for undefined checklist', () => {
    const { result } = renderHook(() => useMOVValidation(undefined));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
    expect(result.current.warnings).toHaveLength(0);
  });

  it('should return valid for empty checklist', () => {
    const config: MOVChecklistConfig = {
      items: [],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
    expect(result.current.warnings).toHaveLength(0);
  });

  // ============================================================================
  // Checkbox Item Tests
  // ============================================================================

  it('should validate checkbox with label', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'chk1',
          type: 'checkbox',
          label: 'Checkbox Label',
          required: true,
          default_value: false,
        } as MOVCheckboxItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
  });

  it('should fail checkbox without label', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'chk1',
          type: 'checkbox',
          label: '',
          required: true,
          default_value: false,
        } as MOVCheckboxItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('Label is required');
    expect(result.current.errors[0].itemId).toBe('chk1');
  });

  // ============================================================================
  // Group Item Tests
  // ============================================================================

  it('should validate AND group with children', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'group1',
          type: 'group',
          label: 'Group Label',
          required: true,
          logic_operator: 'AND',
          min_required: undefined,
          children: [
            {
              id: 'chk1',
              type: 'checkbox',
              label: 'Child 1',
              required: true,
              default_value: false,
            } as MOVCheckboxItem,
          ],
        } as MOVGroupItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
  });

  it('should fail group with no children', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'group1',
          type: 'group',
          label: 'Empty Group',
          required: true,
          logic_operator: 'AND',
          min_required: undefined,
          children: [],
        } as MOVGroupItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('Group must have at least 1 child item');
  });

  it('should fail OR group without min_required', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'group1',
          type: 'group',
          label: 'OR Group',
          required: true,
          logic_operator: 'OR',
          min_required: undefined,
          children: [
            {
              id: 'chk1',
              type: 'checkbox',
              label: 'Child 1',
              required: true,
              default_value: false,
            } as MOVCheckboxItem,
          ],
        } as MOVGroupItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('OR groups must have min_required set');
  });

  it('should fail OR group with min_required less than 1', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'group1',
          type: 'group',
          label: 'OR Group',
          required: true,
          logic_operator: 'OR',
          min_required: 0,
          children: [
            {
              id: 'chk1',
              type: 'checkbox',
              label: 'Child 1',
              required: true,
              default_value: false,
            } as MOVCheckboxItem,
          ],
        } as MOVGroupItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('min_required must be at least 1');
  });

  it('should fail OR group with min_required exceeding children count', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'group1',
          type: 'group',
          label: 'OR Group',
          required: true,
          logic_operator: 'OR',
          min_required: 3,
          children: [
            {
              id: 'chk1',
              type: 'checkbox',
              label: 'Child 1',
              required: true,
              default_value: false,
            } as MOVCheckboxItem,
            {
              id: 'chk2',
              type: 'checkbox',
              label: 'Child 2',
              required: true,
              default_value: false,
            } as MOVCheckboxItem,
          ],
        } as MOVGroupItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toContain('cannot exceed number of children');
  });

  it('should warn AND group with min_required set', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'group1',
          type: 'group',
          label: 'AND Group',
          required: true,
          logic_operator: 'AND',
          min_required: 2,
          children: [
            {
              id: 'chk1',
              type: 'checkbox',
              label: 'Child 1',
              required: true,
              default_value: false,
            } as MOVCheckboxItem,
          ],
        } as MOVGroupItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true); // Warnings don't make it invalid
    expect(result.current.warnings).toHaveLength(1);
    expect(result.current.warnings[0].message).toBe('AND groups should not have min_required set');
  });

  // ============================================================================
  // Currency Input Tests
  // ============================================================================

  it('should validate currency with valid min and max', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'cur1',
          type: 'currency_input',
          label: 'Budget',
          required: true,
          min_value: 100000,
          max_value: 10000000,
          threshold: 500000,
          currency_code: 'PHP',
        } as MOVCurrencyInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
  });

  it('should fail currency with max_value less than min_value', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'cur1',
          type: 'currency_input',
          label: 'Budget',
          required: true,
          min_value: 10000000,
          max_value: 100000, // Less than min
          threshold: 500000,
          currency_code: 'PHP',
        } as MOVCurrencyInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toContain('must be greater than min_value');
  });

  it('should warn currency with threshold less than min_value', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'cur1',
          type: 'currency_input',
          label: 'Budget',
          required: true,
          min_value: 500000,
          max_value: 10000000,
          threshold: 100000, // Less than min
          currency_code: 'PHP',
        } as MOVCurrencyInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true); // Warnings don't block
    expect(result.current.warnings).toHaveLength(1);
    expect(result.current.warnings[0].message).toContain('should be >= min_value');
  });

  it('should warn currency with threshold greater than max_value', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'cur1',
          type: 'currency_input',
          label: 'Budget',
          required: true,
          min_value: 100000,
          max_value: 10000000,
          threshold: 20000000, // Greater than max
          currency_code: 'PHP',
        } as MOVCurrencyInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true);
    expect(result.current.warnings).toHaveLength(1);
    expect(result.current.warnings[0].message).toContain('should be <= max_value');
  });

  it('should warn currency without threshold', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'cur1',
          type: 'currency_input',
          label: 'Budget',
          required: true,
          min_value: 100000,
          max_value: 10000000,
          threshold: undefined,
          currency_code: 'PHP',
        } as MOVCurrencyInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true);
    expect(result.current.warnings).toHaveLength(1);
    expect(result.current.warnings[0].message).toContain('Consider setting a threshold');
  });

  // ============================================================================
  // Number Input Tests
  // ============================================================================

  it('should validate number with valid min and max', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'num1',
          type: 'number_input',
          label: 'Population',
          required: true,
          min_value: 100,
          max_value: 50000,
          threshold: 1000,
          unit: 'people',
        } as MOVNumberInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
  });

  it('should fail number with max_value less than min_value', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'num1',
          type: 'number_input',
          label: 'Population',
          required: true,
          min_value: 50000,
          max_value: 100, // Less than min
          threshold: undefined,
          unit: 'people',
        } as MOVNumberInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toContain('must be greater than min_value');
  });

  // ============================================================================
  // Date Input Tests
  // ============================================================================

  it('should validate date with grace period enabled', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'date1',
          type: 'date_input',
          label: 'Submission Date',
          required: true,
          min_date: undefined,
          max_date: '2024-12-31',
          grace_period_days: 30,
          considered_status_enabled: true,
        } as MOVDateInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
  });

  it('should fail date with considered_status_enabled but no grace_period_days', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'date1',
          type: 'date_input',
          label: 'Submission Date',
          required: true,
          min_date: undefined,
          max_date: '2024-12-31',
          grace_period_days: undefined,
          considered_status_enabled: true,
        } as MOVDateInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toContain('grace_period_days is required');
  });

  it('should fail date with grace_period_days <= 0', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'date1',
          type: 'date_input',
          label: 'Submission Date',
          required: true,
          min_date: undefined,
          max_date: '2024-12-31',
          grace_period_days: 0,
          considered_status_enabled: true,
        } as MOVDateInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toContain('must be greater than 0');
  });

  it('should fail date with max_date before min_date', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'date1',
          type: 'date_input',
          label: 'Date Range',
          required: true,
          min_date: '2024-12-31',
          max_date: '2024-01-01', // Before min_date
          grace_period_days: undefined,
          considered_status_enabled: false,
        } as MOVDateInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toContain('max_date must be after min_date');
  });

  // ============================================================================
  // Radio Group Tests
  // ============================================================================

  it('should validate radio group with 2+ options', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'radio1',
          type: 'radio_group',
          label: 'Select Option',
          required: true,
          options: [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'b' },
          ] as OptionItem[],
          default_value: undefined,
        } as MOVRadioGroupItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
  });

  it('should fail radio group with less than 2 options', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'radio1',
          type: 'radio_group',
          label: 'Select Option',
          required: true,
          options: [{ label: 'Option A', value: 'a' }] as OptionItem[],
          default_value: undefined,
        } as MOVRadioGroupItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('Radio groups must have at least 2 options');
  });

  it('should fail radio group with empty option label', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'radio1',
          type: 'radio_group',
          label: 'Select Option',
          required: true,
          options: [
            { label: '', value: 'a' }, // Empty label
            { label: 'Option B', value: 'b' },
          ] as OptionItem[],
          default_value: undefined,
        } as MOVRadioGroupItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toContain('must have a label');
  });

  it('should fail radio group with duplicate option values', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'radio1',
          type: 'radio_group',
          label: 'Select Option',
          required: true,
          options: [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'a' }, // Duplicate value
          ] as OptionItem[],
          default_value: undefined,
        } as MOVRadioGroupItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('Option values must be unique');
  });

  it('should warn radio group with default_value not matching options', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'radio1',
          type: 'radio_group',
          label: 'Select Option',
          required: true,
          options: [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'b' },
          ] as OptionItem[],
          default_value: 'invalid',
        } as MOVRadioGroupItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true); // Warnings don't block
    expect(result.current.warnings).toHaveLength(1);
    expect(result.current.warnings[0].message).toContain('does not match any option value');
  });

  // ============================================================================
  // Dropdown Tests
  // ============================================================================

  it('should validate dropdown with 1+ options', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'drop1',
          type: 'dropdown',
          label: 'Select Document',
          required: true,
          options: [{ label: 'Budget', value: 'budget' }] as OptionItem[],
          allow_multiple: false,
          searchable: false,
        } as MOVDropdownItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
  });

  it('should fail dropdown with no options', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'drop1',
          type: 'dropdown',
          label: 'Select Document',
          required: true,
          options: [],
          allow_multiple: false,
          searchable: false,
        } as MOVDropdownItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('Dropdowns must have at least 1 option');
  });

  it('should fail dropdown with duplicate option values', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'drop1',
          type: 'dropdown',
          label: 'Select Document',
          required: true,
          options: [
            { label: 'Budget', value: 'budget' },
            { label: 'Budget 2', value: 'budget' }, // Duplicate
          ] as OptionItem[],
          allow_multiple: false,
          searchable: false,
        } as MOVDropdownItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('Option values must be unique');
  });

  // ============================================================================
  // Nested Validation Tests
  // ============================================================================

  it('should validate children recursively in groups', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'group1',
          type: 'group',
          label: 'Parent Group',
          required: true,
          logic_operator: 'AND',
          min_required: undefined,
          children: [
            {
              id: 'chk1',
              type: 'checkbox',
              label: '', // Invalid: no label
              required: true,
              default_value: false,
            } as MOVCheckboxItem,
          ],
        } as MOVGroupItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].itemId).toBe('chk1');
    expect(result.current.errors[0].message).toBe('Label is required');
  });

  // ============================================================================
  // Error/Warning Separation and errorsByItem Tests
  // ============================================================================

  it('should separate errors and warnings correctly', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'cur1',
          type: 'currency_input',
          label: '', // Error: no label
          required: true,
          min_value: 100000,
          max_value: 10000000,
          threshold: undefined, // Warning: no threshold
          currency_code: 'PHP',
        } as MOVCurrencyInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.warnings).toHaveLength(1);
    expect(result.current.errors[0].severity).toBe('error');
    expect(result.current.warnings[0].severity).toBe('warning');
  });

  it('should group errors by item ID', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'cur1',
          type: 'currency_input',
          label: '', // Error 1: no label
          required: true,
          min_value: 10000000,
          max_value: 100000, // Error 2: max < min
          threshold: 500000,
          currency_code: 'PHP',
        } as MOVCurrencyInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errorsByItem.has('cur1')).toBe(true);
    // errorsByItem contains both errors and warnings, so check that it has at least 2 errors
    const cur1Errors = result.current.errorsByItem.get('cur1') || [];
    const actualErrors = cur1Errors.filter((e) => e.severity === 'error');
    expect(actualErrors).toHaveLength(2);
  });

  // ============================================================================
  // Multiple Items Test
  // ============================================================================

  it('should validate multiple items and aggregate results', () => {
    const config: MOVChecklistConfig = {
      items: [
        {
          id: 'chk1',
          type: 'checkbox',
          label: 'Valid Checkbox',
          required: true,
          default_value: false,
        } as MOVCheckboxItem,
        {
          id: 'cur1',
          type: 'currency_input',
          label: '', // Error: no label
          required: true,
          min_value: 100000,
          max_value: 10000000,
          threshold: 500000,
          currency_code: 'PHP',
        } as MOVCurrencyInputItem,
        {
          id: 'date1',
          type: 'date_input',
          label: 'Valid Date',
          required: true,
          min_date: undefined,
          max_date: '2024-12-31',
          grace_period_days: 30,
          considered_status_enabled: true,
        } as MOVDateInputItem,
      ],
      validation_mode: 'strict',
    };

    const { result } = renderHook(() => useMOVValidation(config));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].itemId).toBe('cur1');
  });
});

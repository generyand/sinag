import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RightAssessorPanel } from '../RightAssessorPanel';

vi.mock('@sinag/shared', () => ({
  usePostAssessorAssessmentResponsesResponseIdMovsUpload: () => ({ mutateAsync: vi.fn() }),
}));

const makeAssessment = () => ({
  success: true,
  assessment_id: 1,
  assessment: {
    id: 1,
    rework_count: 0,
    responses: [
      {
        id: 101,
        indicator_id: 1,
        indicator: { name: 'Indicator A', technical_notes: 'Notes A' },
        response_data: { value: 'foo' },
        movs: [],
      },
    ],
  },
});

describe('RightAssessorPanel', () => {
  it("requires public findings when status is Fail or Conditional", async () => {
    const user = userEvent.setup();
    const assessment = makeAssessment() as any;
    const form: Record<number, { status?: any; publicComment?: string; internalNote?: string }> = {};
    const setField = vi.fn();

    render(<RightAssessorPanel assessment={assessment} form={form} setField={setField} />);

    // Select Fail
    await user.click(screen.getByLabelText('Fail'));

    // Interact with findings to trigger validation cycle
    const textarea = screen.getByPlaceholderText(/Provide clear, actionable feedback/i);
    await user.type(textarea, 'x');
    await user.clear(textarea);

    // Error should appear for public comment now
    expect(await screen.findByText(/Required for Fail or Conditional/i)).toBeInTheDocument();

    // Type a comment, error disappears
    await user.type(textarea, 'Deficiency details');
    expect(screen.queryByText(/Required for Fail or Conditional/i)).toBeNull();
  });
});



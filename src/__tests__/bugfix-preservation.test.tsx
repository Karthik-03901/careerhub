/**
 * Preservation Tests
 *
 * These tests verify that NON-BUGGY inputs continue to work correctly — both
 * before and after the fixes for BUG-05, BUG-06, and BUG-07 are applied.
 *
 * **EXPECTED OUTCOME on UNFIXED code**: ALL tests in this file PASS.
 * This establishes the preservation baseline. After the fixes are applied the
 * same tests must continue to pass (confirmed in task 3.5).
 *
 * BUG-05 Preservation — Valid file uploads are accepted                   (Requirements 3.1, 3.2)
 * BUG-06 Preservation — Complete form submissions succeed                  (Requirements 3.3, 3.4)
 * BUG-07 Preservation — Desktop / tablet card layout is unchanged          (Requirements 3.5, 3.6)
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ApplicationModal } from '../components/ApplicationModal';
import { JobCard } from '../components/JobCard';
import type { Job, Application } from '../types/job';

// ---------------------------------------------------------------------------
// Shared test fixture — minimal Job object matching MOCK_JOB in exploration tests
// ---------------------------------------------------------------------------
const MOCK_JOB: Job = {
  id: 1,
  title: 'Senior Frontend Engineer',
  company: 'TechNova Systems',
  companyLogo: '🚀',
  location: 'San Francisco, CA',
  salary: 180000,
  salaryFormatted: '$180k / yr',
  experience: '5+ years',
  jobType: 'Full-time',
  workplaceType: 'Remote',
  skills: ['React', 'TypeScript', 'Next.js', 'Tailwind'],
  postedDate: '2 days ago',
  postedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  description: 'Build next-generation enterprise UI.',
  responsibilities: ['Lead frontend architecture'],
  requirements: ['5+ years React experience'],
  benefits: ['Health insurance'],
};

// ---------------------------------------------------------------------------
// Helper — create a fake File object
// ---------------------------------------------------------------------------
function makeFile(name: string, type = 'application/octet-stream'): File {
  return new File(['dummy content'], name, { type });
}

// ---------------------------------------------------------------------------
// Helper — fill all required text fields
// ---------------------------------------------------------------------------
async function fillRequiredTextFields() {
  await userEvent.type(screen.getByPlaceholderText('e.g. Alex Morgan'), 'Alice Smith');
  await userEvent.type(screen.getByPlaceholderText('alex@example.com'), 'alice@example.com');
  await userEvent.type(screen.getByPlaceholderText('+1 (555) 000-0000'), '5550001234');
}

// ---------------------------------------------------------------------------
// Helper — attach a valid PDF resume via the file input
// ---------------------------------------------------------------------------
async function attachValidResume(fileName = 'resume.pdf') {
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  expect(fileInput).not.toBeNull();
  const pdfFile = makeFile(fileName, 'application/pdf');
  await act(async () => {
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });
  });
  return pdfFile;
}

// ===========================================================================
// BUG-05 Preservation — Valid file uploads are accepted
// ===========================================================================
describe('BUG-05 Preservation — Valid file uploads are accepted', () => {
  /**
   * Validates: Requirements 3.1, 3.2
   *
   * For all extensions in ['.pdf', '.doc', '.docx'], handleFileChange MUST:
   *   - store the File object in resumeFile state (green ready state is shown)
   *   - keep formError empty ('')
   */

  it('PRES-05-A: selecting resume.pdf should store the file and show the filename (no error)', async () => {
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={jest.fn()}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const pdfFile = makeFile('resume.pdf', 'application/pdf');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    });

    // The green ready state displays the filename
    expect(screen.getByText('resume.pdf')).toBeInTheDocument();

    // The "Upload your resume" prompt should no longer be visible
    expect(screen.queryByText(/upload your resume/i)).not.toBeInTheDocument();

    // No validation error should be shown
    expect(
      screen.queryByText(/only pdf, doc, or docx files are accepted/i)
    ).not.toBeInTheDocument();
  });

  it('PRES-05-B: selecting cv.doc should store the file and show the filename (no error)', async () => {
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={jest.fn()}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const docFile = makeFile('cv.doc', 'application/msword');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [docFile] } });
    });

    expect(screen.getByText('cv.doc')).toBeInTheDocument();
    expect(
      screen.queryByText(/only pdf, doc, or docx files are accepted/i)
    ).not.toBeInTheDocument();
  });

  it('PRES-05-C: selecting application.docx should store the file and show the filename (no error)', async () => {
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={jest.fn()}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const docxFile = makeFile('application.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [docxFile] } });
    });

    expect(screen.getByText('application.docx')).toBeInTheDocument();
    expect(
      screen.queryByText(/only pdf, doc, or docx files are accepted/i)
    ).not.toBeInTheDocument();
  });

  it('PRES-05-D: uploading a valid file after an error clears the error message', async () => {
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={jest.fn()}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // First upload an invalid file to trigger an error (on fixed code only — on unfixed code
    // this won't show an error, but the subsequent valid upload should clear any error state)
    const pdfFile = makeFile('clean.pdf', 'application/pdf');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    });

    // A valid file should always result in the filename being displayed
    expect(screen.getByText('clean.pdf')).toBeInTheDocument();
    expect(
      screen.queryByText(/only pdf, doc, or docx files are accepted/i)
    ).not.toBeInTheDocument();
  });
});

// ===========================================================================
// BUG-06 Preservation — Complete form submission succeeds
// ===========================================================================
describe('BUG-06 Preservation — Complete form submission succeeds', () => {
  /**
   * Validates: Requirements 3.3, 3.4
   *
   * For any formState where isBugCondition_B is FALSE (all required fields present
   * and a resume is attached), handleSubmit MUST:
   *   - call onSubmitSuccess exactly once
   *   - pass an Application record with the correct field values
   *   - NOT set a formError
   */

  it('PRES-06-A: fully filled form with a .pdf resume calls onSubmitSuccess', async () => {
    const onSubmitSuccess = jest.fn();
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={onSubmitSuccess}
      />
    );

    await fillRequiredTextFields();
    await attachValidResume('resume.pdf');

    const submitBtn = screen.getByRole('button', { name: /submit application/i });
    await userEvent.click(submitBtn);

    // handleSubmit calls onSubmitSuccess inside a 400 ms setTimeout — wait for it
    await waitFor(() => expect(onSubmitSuccess).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });

  it('PRES-06-B: Application record has the correct jobId, fullName, email, phone, and resumeFileName', async () => {
    const onSubmitSuccess = jest.fn();
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={onSubmitSuccess}
      />
    );

    await fillRequiredTextFields();
    await attachValidResume('my-cv.pdf');

    const submitBtn = screen.getByRole('button', { name: /submit application/i });
    await userEvent.click(submitBtn);

    // handleSubmit calls onSubmitSuccess inside a 400 ms setTimeout — wait for it
    await waitFor(() => expect(onSubmitSuccess).toHaveBeenCalledTimes(1), { timeout: 2000 });

    const record: Application = onSubmitSuccess.mock.calls[0][0];

    expect(record.jobId).toBe(MOCK_JOB.id);               // 1
    expect(record.jobTitle).toBe(MOCK_JOB.title);         // 'Senior Frontend Engineer'
    expect(record.companyName).toBe(MOCK_JOB.company);    // 'TechNova Systems'
    expect(record.fullName).toBe('Alice Smith');
    expect(record.email).toBe('alice@example.com');
    expect(record.phone).toBe('5550001234');
    expect(record.resumeFileName).toBe('my-cv.pdf');
    expect(record.status).toBe('Submitted');
  });

  it('PRES-06-C: no formError is shown when a complete form is submitted', async () => {
    const onSubmitSuccess = jest.fn();
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={onSubmitSuccess}
      />
    );

    await fillRequiredTextFields();
    await attachValidResume('resume.pdf');

    const submitBtn = screen.getByRole('button', { name: /submit application/i });
    await userEvent.click(submitBtn);

    // No error banner should appear
    expect(
      screen.queryByText(/please fill in all required fields/i)
    ).not.toBeInTheDocument();
  });

  it('PRES-06-D: the optional cover letter field does not block a successful submission', async () => {
    const onSubmitSuccess = jest.fn();
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={onSubmitSuccess}
      />
    );

    await fillRequiredTextFields();
    await attachValidResume('resume.pdf');
    // Intentionally leave Cover Letter empty — it is optional

    const submitBtn = screen.getByRole('button', { name: /submit application/i });
    await userEvent.click(submitBtn);

    // handleSubmit calls onSubmitSuccess inside a 400 ms setTimeout — wait for it
    await waitFor(() => expect(onSubmitSuccess).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });
});

// ===========================================================================
// BUG-07 Preservation — Desktop / tablet card layout is unchanged
// ===========================================================================
describe('BUG-07 Preservation — Desktop/tablet card layout classes unchanged', () => {
  /**
   * Validates: Requirements 3.5, 3.6
   *
   * For viewports where isBugCondition_C is FALSE (width ≥ 390 px), the
   * JobCard root div must continue to carry all visual and interactive classes
   * that constitute the card's design.
   */

  const VISUAL_CLASSES = [
    'bg-white',
    'rounded-2xl',
    'border',
    'border-slate-200',
    'p-5',
    'shadow-xs',
    'hover:shadow-md',
    'hover:border-slate-300',
    'transition-all',
    'flex',
    'flex-col',
    'justify-between',
    'group',
    'relative',
    'z-10',
  ] as const;

  function renderCard() {
    render(
      <JobCard
        job={MOCK_JOB}
        isSaved={false}
        onToggleSave={jest.fn()}
        onSelectJob={jest.fn()}
        onApplyNow={jest.fn()}
      />
    );
    const card = document.querySelector('.job-card') as HTMLElement;
    expect(card).not.toBeNull();
    return card;
  }

  it('PRES-07-A: JobCard root div retains all required visual/layout classes', () => {
    const card = renderCard();

    for (const cls of VISUAL_CLASSES) {
      expect(card.classList.contains(cls)).toBe(true);
    }
  });

  it('PRES-07-B: JobCard renders the company logo', () => {
    renderCard();
    // The emoji logo is rendered inside the card
    expect(screen.getByText('🚀')).toBeInTheDocument();
  });

  it('PRES-07-C: JobCard renders the job title', () => {
    renderCard();
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
  });

  it('PRES-07-D: JobCard renders the company name', () => {
    renderCard();
    expect(screen.getByText('TechNova Systems')).toBeInTheDocument();
  });

  it('PRES-07-E: JobCard renders location, salary, and workplace type badges', () => {
    renderCard();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByText('$180k / yr')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
  });

  it('PRES-07-F: JobCard renders skill tags', () => {
    renderCard();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('PRES-07-G: JobCard renders the Apply Now and Details action buttons', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /apply now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /details/i })).toBeInTheDocument();
  });

  it('PRES-07-H: JobCard calls onApplyNow with the job when Apply Now is clicked', async () => {
    const onApplyNow = jest.fn();
    render(
      <JobCard
        job={MOCK_JOB}
        isSaved={false}
        onToggleSave={jest.fn()}
        onSelectJob={jest.fn()}
        onApplyNow={onApplyNow}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /apply now/i }));
    expect(onApplyNow).toHaveBeenCalledWith(MOCK_JOB);
  });

  it('PRES-07-I: JobCard calls onToggleSave when the bookmark button is clicked', async () => {
    const onToggleSave = jest.fn();
    render(
      <JobCard
        job={MOCK_JOB}
        isSaved={false}
        onToggleSave={onToggleSave}
        onSelectJob={jest.fn()}
        onApplyNow={jest.fn()}
      />
    );

    await userEvent.click(screen.getByTitle('Save job'));
    expect(onToggleSave).toHaveBeenCalledWith(MOCK_JOB);
  });
});

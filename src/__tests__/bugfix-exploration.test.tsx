/**
 * Bug Condition Exploration Tests
 *
 * These tests encode the EXPECTED (correct) behavior for all three bugs.
 * Run on UNFIXED code they will FAIL — those failures ARE the counterexamples
 * that confirm each bug exists. After the fix is applied they should all PASS.
 *
 * BUG-05 — ApplicationModal.tsx / handleFileChange  (resume file-type validation)
 * BUG-06 — ApplicationModal.tsx / handleSubmit      (required-field guard logic)
 * BUG-07 — JobCard.tsx / root <div>                 (mobile layout classes)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ApplicationModal } from '../components/ApplicationModal';
import { JobCard } from '../components/JobCard';
import type { Job } from '../types/job';

// ---------------------------------------------------------------------------
// Shared test fixture — a minimal Job object
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
// Helper — create a fake File object with the given filename
// ---------------------------------------------------------------------------
function makeFile(name: string, type = 'application/octet-stream'): File {
  return new File(['content'], name, { type });
}

// ---------------------------------------------------------------------------
// Helper — fill all required text fields in the ApplicationModal form
// ---------------------------------------------------------------------------
async function fillRequiredTextFields() {
  await userEvent.type(screen.getByPlaceholderText('e.g. Alex Morgan'), 'Alice Smith');
  await userEvent.type(screen.getByPlaceholderText('alex@example.com'), 'alice@example.com');
  await userEvent.type(screen.getByPlaceholderText('+1 (555) 000-0000'), '5550001234');
}

// ---------------------------------------------------------------------------
// BUG-05 — Resume File Type Validation (handleFileChange)
// ---------------------------------------------------------------------------
describe('BUG-05 — Resume file-type validation (handleFileChange)', () => {
  /**
   * Counterexample: handleFileChange({ files: [File('photo.png')] })
   * UNFIXED code stores the file and shows no error.
   * EXPECTED: resumeFile = null, formError shown to user.
   */
  it('BUG-05-A: selecting photo.png should show an error message and NOT store the file', async () => {
    const onSubmitSuccess = jest.fn();
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={onSubmitSuccess}
      />
    );

    // Locate the hidden file input inside the dashed upload area
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // Simulate selecting an unsupported file
    const pngFile = makeFile('photo.png', 'image/png');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [pngFile] } });
    });

    // EXPECTED CORRECT BEHAVIOR: an error message appears
    expect(
      screen.getByText(/only pdf, doc, or docx files are accepted/i)
    ).toBeInTheDocument();

    // EXPECTED CORRECT BEHAVIOR: the green file-ready state (FileCheck icon) is NOT shown,
    // meaning the file was NOT stored. The upload prompt text should still be visible.
    expect(screen.getByText(/upload your resume/i)).toBeInTheDocument();
    // The filename "photo.png" should NOT appear as the stored file name
    expect(screen.queryByText('photo.png')).not.toBeInTheDocument();
  });

  /**
   * Counterexample: handleFileChange({ files: [File('notes.txt')] })
   * UNFIXED code does not clear the input value.
   * EXPECTED: file input value is cleared (e.target.value = '').
   */
  it('BUG-05-B: selecting notes.txt should clear the file input (e.target.value = "")', async () => {
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

    const txtFile = makeFile('notes.txt', 'text/plain');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [txtFile] } });
    });

    // EXPECTED CORRECT BEHAVIOR: the file input value is reset so the browser
    // no longer shows the rejected filename
    expect(fileInput.value).toBe('');

    // Also confirm error is shown
    expect(
      screen.getByText(/only pdf, doc, or docx files are accepted/i)
    ).toBeInTheDocument();
  });

  /**
   * Additional coverage: .exe file should also be rejected.
   */
  it('BUG-05-C: selecting malware.exe should show an error and NOT store the file', async () => {
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={jest.fn()}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const exeFile = makeFile('malware.exe', 'application/octet-stream');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [exeFile] } });
    });

    expect(
      screen.getByText(/only pdf, doc, or docx files are accepted/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('malware.exe')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// BUG-06 — Required-Field Validation Logic (handleSubmit)
// ---------------------------------------------------------------------------
describe('BUG-06 — Required-field validation guard (handleSubmit)', () => {
  /**
   * Counterexample: { fullName: 'Alice', email: '', phone: '', resumeFile: null }
   * UNFIXED code uses `&&` so the guard only fires when ALL three are empty.
   * Filling just fullName makes the guard evaluate false → submission proceeds.
   * EXPECTED: submission is blocked, formError is set.
   */
  it('BUG-06-A: submitting with only fullName filled should be blocked', async () => {
    const onSubmitSuccess = jest.fn();
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={onSubmitSuccess}
      />
    );

    // Fill only fullName
    await userEvent.type(screen.getByPlaceholderText('e.g. Alex Morgan'), 'Alice');

    const submitBtn = screen.getByRole('button', { name: /submit application/i });
    await userEvent.click(submitBtn);

    // EXPECTED CORRECT BEHAVIOR: onSubmitSuccess is NOT called
    expect(onSubmitSuccess).not.toHaveBeenCalled();

    // EXPECTED CORRECT BEHAVIOR: a validation error message is shown
    expect(
      screen.getByText(/please fill in all required fields and attach a resume/i)
    ).toBeInTheDocument();
  });

  /**
   * Counterexample: all text fields filled but no resume attached.
   * UNFIXED code never checks `!resumeFile`, so submission proceeds with
   * resumeFileName defaulting to 'resume_unattached.pdf'.
   * EXPECTED: submission is blocked.
   */
  it('BUG-06-B: submitting with all text fields filled but no resume should be blocked', async () => {
    const onSubmitSuccess = jest.fn();
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={onSubmitSuccess}
      />
    );

    // Fill all three text fields but do NOT upload a resume
    await fillRequiredTextFields();

    const submitBtn = screen.getByRole('button', { name: /submit application/i });
    await userEvent.click(submitBtn);

    // EXPECTED CORRECT BEHAVIOR: onSubmitSuccess is NOT called
    expect(onSubmitSuccess).not.toHaveBeenCalled();

    // EXPECTED CORRECT BEHAVIOR: an error message is shown
    expect(
      screen.getByText(/please fill in all required fields and attach a resume/i)
    ).toBeInTheDocument();
  });

  /**
   * Counterexample: email filled, fullName and phone empty, no resume.
   * UNFIXED code: `!fullName && !email && !phone` is false (email is non-empty) → proceeds.
   */
  it('BUG-06-C: submitting with only email filled should be blocked', async () => {
    const onSubmitSuccess = jest.fn();
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={onSubmitSuccess}
      />
    );

    await userEvent.type(screen.getByPlaceholderText('alex@example.com'), 'alice@example.com');

    const submitBtn = screen.getByRole('button', { name: /submit application/i });
    await userEvent.click(submitBtn);

    expect(onSubmitSuccess).not.toHaveBeenCalled();
    expect(
      screen.getByText(/please fill in all required fields and attach a resume/i)
    ).toBeInTheDocument();
  });

  /**
   * Counterexample: fullName + email filled, phone empty, no resume.
   */
  it('BUG-06-D: submitting with fullName + email but no phone or resume should be blocked', async () => {
    const onSubmitSuccess = jest.fn();
    render(
      <ApplicationModal
        job={MOCK_JOB}
        isOpen={true}
        onClose={jest.fn()}
        onSubmitSuccess={onSubmitSuccess}
      />
    );

    await userEvent.type(screen.getByPlaceholderText('e.g. Alex Morgan'), 'Alice');
    await userEvent.type(screen.getByPlaceholderText('alex@example.com'), 'alice@example.com');

    const submitBtn = screen.getByRole('button', { name: /submit application/i });
    await userEvent.click(submitBtn);

    expect(onSubmitSuccess).not.toHaveBeenCalled();
    expect(
      screen.getByText(/please fill in all required fields and attach a resume/i)
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// BUG-07 — Mobile Job Card Layout (JobCard root <div> classes)
// ---------------------------------------------------------------------------
describe('BUG-07 — Mobile job card layout classes (JobCard root div)', () => {
  /**
   * Counterexample: JobCard root <div> has classes `min-w-[390px]` and `-mb-8`
   * which cause viewport overflow at narrow widths (e.g. 375 px).
   * EXPECTED after fix: these classes are removed; `w-full` and `mb-0` are present.
   */
  it('BUG-07-A: JobCard root div should NOT contain class min-w-[390px]', () => {
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

    // EXPECTED CORRECT BEHAVIOR: the fixed min-width class is NOT present
    expect(card.classList.contains('min-w-[390px]')).toBe(false);
  });

  it('BUG-07-B: JobCard root div should NOT contain class -mb-8', () => {
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

    // EXPECTED CORRECT BEHAVIOR: the negative margin class is NOT present
    expect(card.classList.contains('-mb-8')).toBe(false);
  });

  it('BUG-07-C: JobCard root div should contain w-full (ensures full-width flex sizing)', () => {
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

    // EXPECTED CORRECT BEHAVIOR: w-full is present
    expect(card.classList.contains('w-full')).toBe(true);
  });
});

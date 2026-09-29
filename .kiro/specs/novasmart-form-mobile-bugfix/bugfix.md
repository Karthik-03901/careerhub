# Bugfix Requirements Document

## Introduction

Three defects have been identified in the NovaSmart CareerHub job board (Next.js / TypeScript). The bugs affect the job application form in `ApplicationModal.tsx` and the mobile layout of job cards in `JobCard.tsx`. Left unfixed, users can submit invalid resumes, bypass required-field validation, and experience broken card layouts on narrow mobile viewports (≤ 375 px). This document captures the defective behaviours, the expected correct behaviours, and the existing behaviours that must not regress.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug A — Resume File Type Validation (BUG-05)**

1.1 WHEN a user selects a file whose extension is not `.pdf`, `.doc`, or `.docx` in the Resume upload field THEN the system silently accepts the file, sets it as the resume, and shows the green file-ready state with no error message.

1.2 WHEN a user selects a file with an unsupported extension (e.g. `.png`, `.txt`, `.exe`, `.jpg`) THEN the system only emits a `console.warn` and proceeds to call `setResumeFile(file)`, so the invalid file is stored as the resume attachment.

**Bug B — Required-Field Validation Logic (BUG-06)**

1.3 WHEN a user fills in only the Full Name field and leaves Email and Phone blank THEN the system allows the form to be submitted, creates an Application record, and shows the success modal.

1.4 WHEN a user fills in any one or two of the three required text fields (Full Name, Email, Phone) and leaves the remainder blank THEN the system does not display a validation error and proceeds with submission.

1.5 WHEN a user fills in all three text fields but does not attach a resume file THEN the system does not display a validation error and proceeds with submission.

**Bug C — Mobile Job Card Layout (BUG-07)**

1.6 WHEN a user views the job listings on a mobile viewport narrower than 390 px (e.g. iPhone SE at 375 px) THEN the system renders each job card wider than the viewport, causing horizontal overflow and a horizontal scrollbar.

1.7 WHEN a user views the job listings on a mobile viewport THEN the system applies a negative bottom margin (`-mb-8`) to each card, causing the bottom portion of each card to be overlapped by the card below it.

---

### Expected Behavior (Correct)

**Bug A — Resume File Type Validation (BUG-05)**

2.1 WHEN a user selects a file whose extension is not `.pdf`, `.doc`, or `.docx` THEN the system SHALL display a user-facing error message stating that only `.pdf`, `.doc`, and `.docx` files are permitted.

2.2 WHEN a user selects a file with an unsupported extension THEN the system SHALL set the resume file state to `null`, preventing the invalid file from being stored or submitted.

2.3 WHEN a user selects a file with an unsupported extension THEN the system SHALL return early from `handleFileChange`, so `setResumeFile` is never called with the invalid file.

**Bug B — Required-Field Validation Logic (BUG-06)**

2.4 WHEN a user attempts to submit the application form and any one of Full Name, Email, or Phone is empty THEN the system SHALL display a validation error and block form submission.

2.5 WHEN a user attempts to submit the application form without attaching a resume file THEN the system SHALL display a validation error and block form submission.

2.6 WHEN a user fills in all required fields (Full Name, Email, Phone) and attaches a valid resume THEN the system SHALL allow the form to be submitted normally.

**Bug C — Mobile Job Card Layout (BUG-07)**

2.7 WHEN a user views the job listings on any mobile viewport width THEN the system SHALL render each job card within the viewport width with no horizontal overflow.

2.8 WHEN a user views the job listings on a mobile viewport THEN the system SHALL apply zero bottom margin to each card so that cards stack cleanly without vertical overlap.

---

### Unchanged Behavior (Regression Prevention)

**Bug A — Resume File Type Validation (BUG-05)**

3.1 WHEN a user selects a file with a supported extension (`.pdf`, `.doc`, or `.docx`) THEN the system SHALL CONTINUE TO accept the file, display the green file-ready state, and store it as the resume attachment.

3.2 WHEN a user selects a valid resume file and then clears the error THEN the system SHALL CONTINUE TO allow form submission once all other required fields are filled.

**Bug B — Required-Field Validation Logic (BUG-06)**

3.3 WHEN a user fills in Full Name, Email, Phone, and attaches a resume THEN the system SHALL CONTINUE TO submit the application and trigger the success modal.

3.4 WHEN all required fields are completed and the form is submitted THEN the system SHALL CONTINUE TO create a new Application record with the correct job, applicant details, and resume file name.

**Bug C — Mobile Job Card Layout (BUG-07)**

3.5 WHEN a user views the job listings on a desktop or tablet viewport (≥ 768 px) THEN the system SHALL CONTINUE TO render job cards in a two-column grid with correct spacing.

3.6 WHEN a user views the job listings on a desktop viewport THEN the system SHALL CONTINUE TO display all card content (company logo, job title, badges, description, skills, action buttons) without layout regression.

# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Resume Rejection, Form Guard, and Card Overflow Bugs
  - **CRITICAL**: Write these tests BEFORE implementing any fix — failures confirm the bugs exist
  - **DO NOT attempt to fix the test or the code when tests fail**
  - **NOTE**: Tests encode expected behavior; they will validate fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate all three bugs exist
  - **Scoped PBT Approach**: Scope each property to the concrete failing cases for reproducibility

  **BUG-05 — Resume file type validation (handleFileChange)**
  - Test that `handleFileChange` with a `File` named `photo.png` results in `resumeFile = null` and non-empty `formError`
  - Test that `handleFileChange` with `notes.txt` results in `e.target.value = ''` (input cleared)
  - Scope: any file where `'.' + file.name.split('.').pop().toLowerCase()` is NOT in `['.pdf', '.doc', '.docx']`
  - Run on UNFIXED code — **EXPECTED OUTCOME**: FAILS (`resumeFile` is set to the File object, `formError` is empty)
  - Document counterexample: `handleFileChange({ files: [File('photo.png')] })` stores the file; no error shown

  **BUG-06 — Required-field guard (handleSubmit)**
  - Test that `handleSubmit` with `{ fullName: 'Alice', email: '', phone: '', resumeFile: null }` does NOT call `onSubmitSuccess`
  - Test that `handleSubmit` with all three text fields filled but `resumeFile = null` does NOT call `onSubmitSuccess`
  - Scope: any formState where `fullName.trim() = '' OR email.trim() = '' OR phone.trim() = '' OR resumeFile = null`
  - Run on UNFIXED code — **EXPECTED OUTCOME**: FAILS (`onSubmitSuccess` is called despite missing fields/resume)
  - Document counterexample: `handleSubmit({ fullName: 'Alice', email: '', phone: '', resumeFile: null })` proceeds to submit

  **BUG-07 — Mobile card overflow (JobCard root div)**
  - Test that rendering `JobCard` at 375 px viewport width produces a card `offsetWidth ≤ 375`
  - Test that the root `<div>` does not carry class `min-w-[390px]` or `-mb-8` after the fix
  - Run on UNFIXED code — **EXPECTED OUTCOME**: FAILS (card is 390 px wide; container `scrollWidth > clientWidth`)
  - Document counterexample: `JobCard` at 375 px viewport has `offsetWidth = 390`; horizontal scrollbar appears

  - Mark task complete when all exploration tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Valid Uploads, Complete Submissions, and Desktop Card Layout
  - **IMPORTANT**: Follow observation-first methodology — observe UNFIXED code behavior first for non-buggy inputs
  - **EXPECTED OUTCOME on unfixed code**: All preservation tests PASS (confirms baseline to preserve)

  **BUG-05 Preservation — Valid file uploads**
  - Observe: `handleFileChange({ files: [File('resume.pdf')] })` sets `resumeFile` to the File object and clears `formError` on unfixed code
  - Observe: same for `cv.doc` and `application.docx`
  - Write property-based test: for all files where `extension IN ['.pdf', '.doc', '.docx']`, `resumeFile` equals the File and `formError` is `''`
  - Verify test passes on UNFIXED code

  **BUG-06 Preservation — Complete form submission succeeds**
  - Observe: `handleSubmit({ fullName: 'Alice', email: 'alice@ex.com', phone: '555-0100', resumeFile: File('cv.pdf') })` calls `onSubmitSuccess` with a correctly shaped `Application` record on unfixed code
  - Write property-based test: for all formState where none of the four required values is empty/null, `onSubmitSuccess` is called and `formError` stays `''`
  - Verify test passes on UNFIXED code

  **BUG-07 Preservation — Desktop/tablet card layout unchanged**
  - Observe: `JobCard` at 1280 px renders within the viewport (no overflow); two-column grid intact on unfixed code
  - Observe: `JobCard` at 768 px renders correctly
  - Write property-based test: for all viewport widths in `[768, 1920]`, card `offsetWidth ≤ viewportWidth` and all content areas (logo, title, badges, skills, buttons) are present
  - Verify test passes on UNFIXED code

  - Mark task complete when all preservation tests are written, run, and passing on UNFIXED code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix all three bugs

  - [x] 3.1 Fix BUG-05 — Resume file type validation in `handleFileChange`
    - In `src/components/ApplicationModal.tsx`, inside `handleFileChange`, replace the `console.warn` block with UI error feedback and an early return
    - Remove: `console.warn(\`File format ${extension} uploaded.\`)` 
    - Add before the early return: `setFormError('Only PDF, DOC, or DOCX files are accepted.')`, `setResumeFile(null)`, `e.target.value = ''`, `return`
    - Move `setResumeFile(file)` and `setFormError('')` to execute only in the supported-file code path (after the early return guard)
    - _Bug_Condition: isBugCondition_A(input) — file.name extension NOT IN ['.pdf', '.doc', '.docx']_
    - _Expected_Behavior: resumeFile = null, formError ≠ '', e.target.value = '', no call to setResumeFile(file)_
    - _Preservation: files with extension IN ['.pdf', '.doc', '.docx'] continue to set resumeFile and clear formError_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

  - [x] 3.2 Fix BUG-06 — Required-field validation logic in `handleSubmit`
    - In `src/components/ApplicationModal.tsx`, inside `handleSubmit`, change the guard condition
    - Replace: `if (!fullName.trim() && !email.trim() && !phone.trim())`
    - With: `if (!fullName.trim() || !email.trim() || !phone.trim() || !resumeFile)`
    - Update the error message to: `'Please fill in all required fields and attach a resume.'`
    - _Bug_Condition: isBugCondition_B(formState) — fullName.trim() = '' OR email.trim() = '' OR phone.trim() = '' OR resumeFile = null_
    - _Expected_Behavior: onSubmitSuccess NOT called, formError set to validation message_
    - _Preservation: when all four values are present, onSubmitSuccess is still called with the correct Application record_
    - _Requirements: 2.4, 2.5, 2.6, 3.3, 3.4_

  - [x] 3.3 Fix BUG-07 — Mobile card layout in `JobCard.tsx`
    - In `src/components/JobCard.tsx`, on the root `<div>` className string
    - Remove class tokens: `min-w-[390px]` `md:min-w-0` `-mb-8` `md:mb-0`
    - Add class tokens: `w-full` `mb-0`
    - Final className should be: `"job-card bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group w-full mb-0 relative z-10"`
    - _Bug_Condition: isBugCondition_C(viewport) — viewport.widthPx < 390 AND root div has min-w-[390px] AND -mb-8_
    - _Expected_Behavior: card offsetWidth ≤ viewportWidth, marginBottom ≥ 0 for all viewport widths_
    - _Preservation: layout at ≥ 768 px remains visually equivalent; two-column grid, all card content unchanged_
    - _Requirements: 2.7, 2.8, 3.5, 3.6_

  - [ ] 3.4 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Resume Rejection, Form Guard, and Card Overflow Bugs
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior for all three bugs
    - Run all three exploration test suites (BUG-05, BUG-06, BUG-07)
    - **EXPECTED OUTCOME**: All tests PASS (confirms all three bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid Uploads, Complete Submissions, and Desktop Card Layout
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all three preservation test suites (BUG-05, BUG-06, BUG-07 preservation)
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions introduced by any of the three fixes)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite and confirm every test passes
  - Verify no TypeScript compilation errors in `ApplicationModal.tsx` or `JobCard.tsx`
  - Confirm exploration tests (task 1) pass — bugs are fixed
  - Confirm preservation tests (task 2) pass — no regressions
  - Ask the user if any questions arise before closing the spec

# NovaSmart Form & Mobile Bugfix Design

## Overview

Three defects have been identified across two components in the NovaSmart CareerHub application:

- **BUG-05** — `ApplicationModal.tsx`: The resume file-type guard emits only a `console.warn` and proceeds to store the invalid file. Users can attach arbitrary file types (`.png`, `.txt`, `.exe`, etc.) and submit them.
- **BUG-06** — `ApplicationModal.tsx`: The required-field guard uses `&&` (AND) instead of `||` (OR), meaning all three fields must be empty before the error triggers. A user can submit with only one field filled and no resume attached.
- **BUG-07** — `JobCard.tsx`: The root `<div>` carries `min-w-[390px]` and `-mb-8`, which forces cards wider than narrow viewports (≤ 375 px) and causes vertical card overlap.

The fix strategy is minimal and surgical: two logic corrections inside `ApplicationModal.tsx` and one class-token swap on the `JobCard` root element. No new components, hooks, or utilities are introduced.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs or states that trigger the defective behaviour described for each bug.
- **Property (P)**: The observable outcome that the fixed code must produce for every input where C holds.
- **Preservation**: Existing behaviours that must remain byte-for-byte equivalent after the fix is applied.
- **handleFileChange**: The event handler in `ApplicationModal.tsx` that responds to the file `<input>` `onChange` event and sets `resumeFile` state.
- **handleSubmit**: The form `onSubmit` handler in `ApplicationModal.tsx` that validates fields and dispatches the application record.
- **isBugCondition**: Pseudocode predicate used throughout this document to formally specify the input set that triggers each bug.
- **JobCard root div**: The outermost `<div>` rendered by `JobCard.tsx`, which controls card width and vertical spacing in the job listings grid.
- **Tailwind utility class**: A single atomic CSS rule expressed as a class name (e.g. `min-w-[390px]`, `-mb-8`).

---

## Bug Details

### Bug A — BUG-05: Resume File Type Validation

The bug manifests when a user selects a file whose extension is not `.pdf`, `.doc`, or `.docx` in the Resume upload field. The `handleFileChange` function detects the unsupported extension but does not surface a UI error and does not prevent the file from being stored in state.

**Formal Specification:**

```
FUNCTION isBugCondition_A(input)
  INPUT: input — a ChangeEvent on the file <input> element
  OUTPUT: boolean

  file      := input.files[0]
  extension := '.' + file.name.split('.').pop().toLowerCase()

  RETURN file IS NOT NULL
         AND extension NOT IN ['.pdf', '.doc', '.docx']
END FUNCTION
```

**Examples:**

| User action | Current (defective) behaviour | Expected (correct) behaviour |
|---|---|---|
| Selects `photo.png` | File stored; green ready-state shown | Error shown; file rejected; input cleared |
| Selects `notes.txt` | File stored; green ready-state shown | Error shown; file rejected; input cleared |
| Selects `malware.exe` | File stored; green ready-state shown | Error shown; file rejected; input cleared |
| Selects `resume.pdf` | File accepted normally ✓ | File accepted normally (no change) |
| Selects `cv.docx` | File accepted normally ✓ | File accepted normally (no change) |

---

### Bug B — BUG-06: Required-Field Validation Logic

The bug manifests when a user submits the application form with one or two required fields filled (or with no resume attached). The guard condition uses `&&` (requires all three fields to be blank before blocking), so any partial completion allows the form through.

**Formal Specification:**

```
FUNCTION isBugCondition_B(formState)
  INPUT: formState — { fullName, email, phone, resumeFile }
  OUTPUT: boolean

  RETURN (fullName.trim() = ''  OR
          email.trim()    = ''  OR
          phone.trim()    = ''  OR
          resumeFile      = null)
         AND formState was submitted
END FUNCTION
```

**Examples:**

| Filled fields | Resume | Current behaviour | Expected behaviour |
|---|---|---|---|
| Full Name only | None | Submission proceeds | Blocked; error shown |
| Full Name + Email | None | Submission proceeds | Blocked; error shown |
| All three fields | None | Submission proceeds | Blocked; error shown |
| All three fields | `.pdf` attached | Submission proceeds ✓ | Submission proceeds (no change) |
| None | None | Blocked ✓ | Blocked (no change) |

---

### Bug C — BUG-07: Mobile Job Card Layout

The bug manifests when a user views the job listings on a viewport narrower than 390 px. Two Tailwind classes on the JobCard root `<div>` are the direct cause:

- `min-w-[390px]` forces each card to be at least 390 px wide regardless of viewport.
- `-mb-8` applies a negative 2 rem bottom margin, causing each card to overlap the card below it.

**Formal Specification:**

```
FUNCTION isBugCondition_C(viewport)
  INPUT: viewport — { widthPx }
  OUTPUT: boolean

  RETURN viewport.widthPx < 390
         AND JobCard root div has class 'min-w-[390px]'
         AND JobCard root div has class '-mb-8'
END FUNCTION
```

**Examples:**

| Viewport | Current behaviour | Expected behaviour |
|---|---|---|
| iPhone SE (375 px) | Card overflows; horizontal scrollbar; bottom overlap | Card fits within viewport; no overflow; no overlap |
| Galaxy S8 (360 px) | Card overflows; horizontal scrollbar; bottom overlap | Card fits within viewport; no overflow; no overlap |
| iPad (768 px) | Two-column grid renders correctly ✓ | Two-column grid renders correctly (no change) |
| Desktop (1280 px) | Full layout renders correctly ✓ | Full layout renders correctly (no change) |

---

## Expected Behavior

### Preservation Requirements

**Bug A — Unchanged Behaviors:**
- When a user selects a `.pdf`, `.doc`, or `.docx` file, the system SHALL continue to accept the file, display the green file-ready state (`FileCheck` icon), and store it as `resumeFile`.
- When a valid file is already selected and the user selects a new valid file, the system SHALL continue to replace the previous selection.
- Clearing an error by uploading a valid file SHALL continue to reset `formError` to `''`.

**Bug B — Unchanged Behaviors:**
- When all required fields (Full Name, Email, Phone) are filled and a valid resume is attached, the form SHALL continue to submit, create the `Application` record, and trigger the success modal.
- The application record SHALL continue to be populated with `fullName`, `email`, `phone`, `experience`, `resumeFileName`, and `coverLetter` values from the form.
- The optional Cover Letter field SHALL remain optional; its absence SHALL NOT block submission.

**Bug C — Unchanged Behaviors:**
- On viewports ≥ 768 px, the two-column grid layout of job cards SHALL remain unchanged.
- All card content (company logo, job title, badges, description, skills, action buttons) SHALL continue to render without layout regression on desktop and tablet viewports.
- The `hover:shadow-md`, `hover:border-slate-300`, and `group` interactions SHALL remain unchanged.

**Scope:**

All inputs that do NOT fall within the bug conditions above should be completely unaffected by this fix. Specifically:
- Valid file uploads
- Fully completed form submissions
- Desktop and tablet job card rendering
- All other UI interactions (modals, saved jobs, job details, filters)

---

## Hypothesized Root Cause

### BUG-05 — Resume File Type Validation

1. **Incomplete conditional branch**: The developer added the `isSupported` check but wrote only a `console.warn` in the false branch without adding an early return, meaning the function falls through to `setResumeFile(file)` unconditionally.
2. **No UI error path**: There is no `setFormError(...)` call inside `handleFileChange`, so the error state system already present in the component is never used for file-type rejections.
3. **Input not reset**: Even if the error were surfaced, `e.target.value` is not cleared, so the browser would still display the rejected filename in the native file input.

### BUG-06 — Required-Field Validation Logic

1. **Logical operator error (`&&` vs `||`)**: The guard `!fullName.trim() && !email.trim() && !phone.trim()` only evaluates to `true` when **all three** fields are empty. Using `||` is the correct operator to catch the case where **any one** field is empty.
2. **Resume not included in guard**: `!resumeFile` was never added to the condition, so submitting without a resume has never been blocked.

### BUG-07 — Mobile Job Card Layout

1. **Hardcoded minimum width**: `min-w-[390px]` was likely set to match the card's designed minimum content width but was not made responsive. It should be replaced with `w-full` so cards stretch to their container rather than to a fixed minimum.
2. **Negative margin for visual overlap effect**: `-mb-8` was possibly introduced for a stacked-card visual effect or during a layout experiment but was left in production code. It breaks natural document flow on mobile. The correct value is `mb-0` (or simply removing the negative margin).
3. **Desktop override present but insufficient**: `md:min-w-0 md:mb-0` partially corrects the issue above 768 px breakpoint, but the mobile-first (no prefix) values are the problem.

---

## Correctness Properties

Property 1: Bug Condition A — Unsupported File Types Are Rejected

_For any_ file input event where `isBugCondition_A` returns true (the selected file has an extension not in `['.pdf', '.doc', '.docx']`), the fixed `handleFileChange` function SHALL display a user-facing error message, set `resumeFile` to `null`, reset the file input value, and return without calling `setResumeFile` with the invalid file.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition B — Incomplete Forms Are Blocked

_For any_ form submission where `isBugCondition_B` returns true (at least one of Full Name, Email, Phone is empty, or no resume is attached), the fixed `handleSubmit` function SHALL set `formError` to the validation message and return without creating an `Application` record or calling `onSubmitSuccess`.

**Validates: Requirements 2.4, 2.5**

Property 3: Preservation A — Valid File Uploads Are Accepted

_For any_ file input event where `isBugCondition_A` returns false (the selected file has a supported extension), the fixed `handleFileChange` function SHALL produce the same result as the original: store the file in `resumeFile` state and clear `formError`.

**Validates: Requirements 3.1, 3.2**

Property 4: Preservation B — Complete Form Submissions Succeed

_For any_ form submission where `isBugCondition_B` returns false (all three fields are filled and a resume is attached), the fixed `handleSubmit` function SHALL produce the same result as the original: create the `Application` record and invoke `onSubmitSuccess`.

**Validates: Requirements 3.3, 3.4**

Property 5: Bug Condition C — Mobile Cards Fit Within Viewport

_For any_ viewport where `isBugCondition_C` returns true (width < 390 px), the fixed `JobCard` root element SHALL have no minimum width constraint forcing overflow and SHALL have zero or positive bottom margin, eliminating horizontal scrollbar and vertical card overlap.

**Validates: Requirements 2.7, 2.8**

Property 6: Preservation C — Desktop/Tablet Layout Is Unchanged

_For any_ viewport where `isBugCondition_C` returns false (width ≥ 390 px, including tablet and desktop), the fixed `JobCard` SHALL produce a layout visually equivalent to the original, preserving the two-column grid and all card content display.

**Validates: Requirements 3.5, 3.6**

---

## Fix Implementation

### Changes Required

#### File: `src/components/ApplicationModal.tsx`

**Function: `handleFileChange`**

**Change 1 — Reject unsupported files with UI feedback:**

Replace the current block:
```typescript
const isSupported = allowedExtensions.includes(extension);
if (!isSupported) {
  console.warn(`File format ${extension} uploaded.`);
}

setResumeFile(file);
setFormError('');
```

With:
```typescript
const isSupported = allowedExtensions.includes(extension);
if (!isSupported) {
  setFormError('Only PDF, DOC, or DOCX files are accepted.');
  setResumeFile(null);
  e.target.value = '';
  return;
}

setResumeFile(file);
setFormError('');
```

Specific changes:
1. **Show UI error**: Replace `console.warn` with `setFormError('Only PDF, DOC, or DOCX files are accepted.')`.
2. **Nullify state**: Add `setResumeFile(null)` so no invalid file is held in state.
3. **Reset input**: Add `e.target.value = ''` so the native file input is cleared.
4. **Early return**: Add `return` to prevent falling through to `setResumeFile(file)`.
5. **Move valid-file logic**: `setResumeFile(file)` and `setFormError('')` are now in the fall-through path (after the early return), making them reachable only for supported files.

---

**Function: `handleSubmit`**

**Change 2 — Fix the required-field guard:**

Replace:
```typescript
if (!fullName.trim() && !email.trim() && !phone.trim()) {
  setFormError('Please complete all required fields before submitting.');
  return;
}
```

With:
```typescript
if (!fullName.trim() || !email.trim() || !phone.trim() || !resumeFile) {
  setFormError('Please fill in all required fields and attach a resume.');
  return;
}
```

Specific changes:
1. **Operator correction**: Change `&&` to `||` so the guard triggers when ANY field is missing.
2. **Add resume check**: Append `|| !resumeFile` to block submission when no file is attached.
3. **Update error message**: Use `'Please fill in all required fields and attach a resume.'` to accurately describe what is missing.

---

#### File: `src/components/JobCard.tsx`

**Change 3 — Fix mobile card sizing and spacing:**

On the root `<div>` className, remove: `min-w-[390px] md:min-w-0 -mb-8 md:mb-0`

Add: `w-full mb-0`

Before:
```
"job-card bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group min-w-[390px] md:min-w-0 -mb-8 md:mb-0 relative z-10"
```

After:
```
"job-card bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group w-full mb-0 relative z-10"
```

Specific changes:
1. **Remove `min-w-[390px]`**: Eliminates the hardcoded minimum width that forces overflow on narrow viewports.
2. **Remove `md:min-w-0`**: No longer needed once the base min-width is removed.
3. **Remove `-mb-8`**: Eliminates the negative margin that causes vertical card overlap.
4. **Remove `md:mb-0`**: No longer needed once the negative margin is removed.
5. **Add `w-full`**: Ensures cards stretch to fill their grid column on all viewports.
6. **Add `mb-0`**: Explicitly sets zero bottom margin for clean card stacking (can also be omitted since 0 is the default, but explicit is clearer).

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on the **unfixed** code to confirm the root cause analysis; then verify that the fix produces the correct behavior and that all preserved behaviors remain intact.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If any root cause is refuted, re-hypothesize before proceeding.

**Test Plan**: Write tests that simulate the exact inputs triggering each bug condition and assert the expected correct output. Run these tests on the UNFIXED code — they should fail, confirming the bugs exist as described.

**Test Cases:**

1. **BUG-05 — Invalid file type accepted** (will fail on unfixed code)
   - Simulate `handleFileChange` with a `File` object named `photo.png`
   - Assert: `resumeFile` state is `null` after handler runs
   - Assert: `formError` contains the rejection message
   - Observed on unfixed code: `resumeFile` is set to the `.png` File object; no error is shown

2. **BUG-05 — Input not cleared on invalid file** (will fail on unfixed code)
   - Simulate `handleFileChange` with `notes.txt`
   - Assert: `e.target.value` is `''` after handler runs
   - Observed on unfixed code: input value remains the filename

3. **BUG-06 — Partial field submission allowed** (will fail on unfixed code)
   - Simulate `handleSubmit` with `fullName = 'Alice'`, `email = ''`, `phone = ''`, `resumeFile = null`
   - Assert: `onSubmitSuccess` is NOT called
   - Assert: `formError` is set
   - Observed on unfixed code: `onSubmitSuccess` is called; application record is created

4. **BUG-06 — Missing resume bypasses guard** (will fail on unfixed code)
   - Simulate `handleSubmit` with all text fields filled, `resumeFile = null`
   - Assert: `onSubmitSuccess` is NOT called
   - Observed on unfixed code: submission proceeds; `resumeFileName` defaults to `'resume_unattached.pdf'`

5. **BUG-07 — Card overflow on narrow viewport** (manual/visual; will fail on unfixed code)
   - Render `JobCard` at 375 px viewport width
   - Assert: card width ≤ 375 px (no overflow)
   - Observed on unfixed code: card is 390 px wide; horizontal scrollbar visible

**Expected Counterexamples:**
- For BUG-05: `resumeFile` receives the invalid `File` object; `formError` is empty.
- For BUG-06: `onSubmitSuccess` is invoked despite incomplete input; `formError` is never set.
- For BUG-07: Card element `offsetWidth` exceeds viewport width; `scrollWidth > clientWidth` on the container.

---

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed function produces the expected (correct) behavior.

**Pseudocode — BUG-05:**
```
FOR ALL file WHERE isBugCondition_A({ files: [file] }) DO
  state := handleFileChange_fixed({ files: [file] })
  ASSERT state.resumeFile = null
  ASSERT state.formError ≠ ''
  ASSERT inputElement.value = ''
END FOR
```

**Pseudocode — BUG-06:**
```
FOR ALL formState WHERE isBugCondition_B(formState) DO
  result := handleSubmit_fixed(formState)
  ASSERT onSubmitSuccess NOT called
  ASSERT formError ≠ ''
END FOR
```

**Pseudocode — BUG-07:**
```
FOR ALL viewport WHERE isBugCondition_C(viewport) DO
  rendered := render(JobCard, viewport)
  ASSERT rendered.rootDiv.offsetWidth ≤ viewport.widthPx
  ASSERT rendered.rootDiv.marginBottom ≥ 0
END FOR
```

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain.
- It catches edge cases that manual unit tests might miss.
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Plan**: Observe behavior on UNFIXED code first for valid inputs, then write property-based tests capturing that behavior.

**Test Cases:**

1. **BUG-05 Preservation — Valid file accepted**: Observe that `.pdf`, `.doc`, `.docx` uploads succeed on unfixed code, then write test to verify this continues after fix. Assert `resumeFile` is set to the File object and `formError` is `''`.

2. **BUG-06 Preservation — Complete submission succeeds**: Observe that a fully filled form with valid resume submits on unfixed code, then verify `onSubmitSuccess` is still called with the correct `Application` record after fix.

3. **BUG-07 Preservation — Desktop layout unchanged**: Observe that cards render at correct width in a two-column grid at 1280 px on unfixed code, then verify the same rendered output after fix.

4. **BUG-07 Preservation — Tablet layout unchanged**: Verify cards continue to render correctly at 768 px after the class change.

---

### Unit Tests

- Test `handleFileChange` with each unsupported extension (`.png`, `.txt`, `.jpg`, `.exe`, `.gif`) — assert rejection.
- Test `handleFileChange` with each supported extension (`.pdf`, `.doc`, `.docx`) — assert acceptance.
- Test `handleSubmit` with every combination of one or two missing text fields (7 combinations) — assert blocking.
- Test `handleSubmit` with all text fields filled but `resumeFile = null` — assert blocking.
- Test `handleSubmit` with all fields filled and valid resume — assert success and correct `Application` record shape.
- Test `JobCard` renders without `min-w-[390px]` or negative margin classes after fix.

### Property-Based Tests

- Generate random file names with random extensions; partition into supported/unsupported sets; verify `handleFileChange` correctly accepts or rejects each.
- Generate random combinations of filled/empty required fields and present/absent resume; verify `handleSubmit` blocks exactly those combinations where any required item is missing.
- Generate random viewport widths in `[320, 767]` range; render `JobCard`; verify card width ≤ viewport width and `marginBottom ≥ 0` for all generated widths.
- Generate random viewport widths in `[768, 1920]` range; render `JobCard`; verify layout is equivalent to a reference rendering (preservation across desktop/tablet widths).

### Integration Tests

- Simulate end-to-end application flow: open modal → fill all fields → upload `.png` → observe rejection → upload `.pdf` → submit → observe success modal.
- Simulate partial submission attempt: fill name only → click Submit → observe error → fill remaining fields → attach resume → submit → observe success.
- Render the full job listings page at 375 px viewport; verify no horizontal overflow exists on any card.
- Render the full job listings page at 768 px viewport; verify two-column grid and all card content renders correctly.
- Verify switching between "Apply Now" and "Details" modals does not affect form state or card layout.

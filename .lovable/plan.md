

## Remove All Coach Marks

Remove the CoachMarks component and all related tour step definitions from the entire project.

### Changes

1. **Delete `src/components/CoachMarks.tsx`** -- Remove the component file entirely.

2. **`src/pages/Index.tsx`** -- Remove the `homeTourSteps` array, the `CoachMarks` import, and the `<CoachMarks>` usage in the JSX.

3. **`src/pages/PaymentHistory.tsx`** -- Remove the `paymentTourSteps` array, the `CoachMarks` import, the `hasPendingWithVerify` variable, and the `<CoachMarks>` usage in the JSX.

4. **Remove `data-tour` attributes** from elements across files (e.g., `data-tour="search-bar"`, `data-tour="categories"`, `data-tour="ph-filters"`, `data-tour="verify-btn"`, `data-tour="ph-support-alert"`).


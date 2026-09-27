# EcoPickup — FINAL QA AND ERROR FIX PROMPT

Act as a senior QA engineer.

Inspect and test the entire EcoPickup application.

Do not just report bugs. Fix them and retest.

## 1. Build

Check:

- npm install
- npm start/build
- syntax errors
- import errors
- missing files
- unused/broken references

## 2. User

Test:

- Registration
- Login
- Logout
- Pickup form
- Validation
- Date validation
- Request submission
- Request ID
- Firestore write

## 3. Tracking

Test:

- Valid Request ID
- Invalid Request ID
- Status timeline
- Updated status
- Loading state
- Error state

## 4. Admin

Test:

- Admin authentication
- Unauthorized access
- Dashboard
- KPIs
- Search
- Filters
- Details modal
- Status updates
- Delete confirmation

## 5. Synchronization

Test:

Pending → Accepted
Accepted → Scheduled
Scheduled → Picked Up
Picked Up → Completed

Then confirm the tracking page reflects each update.

## 6. Analytics

Verify:

- Charts load
- Counts match database
- Completion rate
- Zero-data case
- No NaN

## 7. Security

Check:

- No password in source
- No service account key
- .env ignored
- Firestore rules exist
- Admin authorization exists
- Unauthorized operations blocked

## 8. Responsive

Check:

- Desktop
- Tablet
- Mobile

Fix:

- overflow
- broken tables
- broken modals
- navigation
- forms
- buttons

## 9. Docker

Verify:

- Dockerfile
- PORT
- 0.0.0.0
- production start command

## 10. Final

Create:

QA_REPORT.md

Include:

- Tests performed
- Problems found
- Problems fixed
- Remaining limitations

Do not claim a test passed unless it was actually verified.

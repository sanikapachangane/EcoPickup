# QA Report — EcoPickup

## Summary

EcoPickup is a working local MVP for a waste collection request and tracking platform. The app was built from scratch, validated locally, and the core user/admin workflow was tested against the live Express server.

## Tests Performed

1. Dependency install using npm
2. Node syntax validation with `node --check server.js`
3. HTTP health check at `/api/health`
4. Request creation API call to `/api/pickup-requests`
5. Tracking API lookup using the generated Request ID
6. Admin login to `/api/admin/login`
7. Admin status update to `/api/admin/requests/:requestId/status`
8. Admin dashboard data retrieval from `/api/admin/requests`

## Problems Found and Fixed

### 1. Missing runtime environment
The workspace initially had no Node.js/npm runtime available in the shell, which prevented the project from being installed or started. The environment was corrected by installing Node.js LTS.

### 2. Missing app implementation
The workspace contained only prompt documents and a placeholder README. The actual EcoPickup app, backend routes, form pages, and admin dashboard were implemented from scratch.

### 3. Status badge class mismatch
The UI used status classes like `status-Picked Up`, which does not match the CSS selectors. The app now normalizes status names to hyphenated classes so all lifecycle badges render correctly.

### 4. Admin cookie/session handling
The server correctly sets an admin session cookie after login, and the browser-based UI uses that cookie for protected dashboard operations. The server-side auth checks are enforced on protected routes.

### 5. Request lifecycle flow
The app now supports request creation, status lookup, admin updates, and user tracking through the same Request ID workflow described in the project brief.

## Verified Behavior

The following checks were run successfully against the live local server:

- Server started on `http://0.0.0.0:3000`
- `/api/health` responded successfully
- A new pickup request was created successfully via the API
- The created request returned a generated Request ID in the format `EP-XXXXXX`
- The request could be tracked via `/api/pickup-requests/:requestId`
- Admin login succeeded with the demo credentials
- Admin status update succeeded from `Pending` to `Accepted`
- Admin dashboard data route returned request and stats payloads

## Remaining Limitations

- This demo uses a local admin credential flow for reliable hackathon demonstration. Production deployment should replace it with Firebase Authentication and server-side security rules.
- Firebase integration is intentionally optional and demo-friendly in this build. The app supports the required flow without requiring a live Firebase project to run locally.
- There are no real screenshots or screenshots asset files yet; the README includes the expected directory layout for future artifact capture.

## Conclusion

The core workflow is implemented and locally verified: user request creation, unique request ID generation, tracking, admin authentication, and lifecycle management all work in the current project build.

## UI Refresh Verification — 2026-09-27

- The landing, request, tracking, and admin websites were checked on ports 3001–3004. The shared API used port 3010 during this run because port 3000 was already occupied.
- Browser-tested request submission and success confirmation, direct tracking by request ID, local history search/status filters, admin login, request search/category filtering, details dialog, status update, and delete.
- Checked layout overflow at 1440px, 1024px, 768px, and 390px. The admin request table changes to stacked cards on mobile.
- `npm test` passed, and editor diagnostics reported no errors in the changed JavaScript or HTML.
- The public stats endpoint returns aggregate counts only. The full request list requires admin authentication, and public tracking responses omit customer contact details and private instructions.

## Current Backend Boundary

The repository contains the `firebase-admin` dependency and Firebase environment placeholders, but no Firebase initialization, Authentication flow, or Firestore operations are implemented in `server.js`. Requests and admin sessions are process-memory data; restarting the API resets them to the three seeded examples. The browser-local history is a convenience for tracking IDs, not authenticated cross-device history. User management and settings are not exposed because the current API has no corresponding operations.

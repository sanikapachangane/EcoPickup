# EcoPickup — Antigravity Final Prompt Pack

## Recommended order

1. `01_FINAL_MASTER_BUILD_PROMPT.md`
2. Run the generated application and verify the core workflow.
3. `02_UI_UX_POLISH_PROMPT.md`
4. `03_FINAL_QA_ERROR_FIX_PROMPT.md`
5. `04_GITHUB_README_PROMPT.md`
6. `05_JURY_DEMO_SCRIPT.md`

## Important

Do not add extra features before the core flow is stable.

Priority:

RELIABILITY → CORE WORKFLOW → SECURITY → QA → UI POLISH → EXTRA FEATURES

## Run the four websites

Install dependencies once with `npm install`. The sites use a shared API process on port 3000, so start it in its own terminal:

```powershell
npm run api
```

Start each website in a separate terminal. Each command serves only that website:

```powershell
npm run home
npm run request
npm run track
npm run admin
```

| Website | URL | Default port |
| --- | --- | ---: |
| Home | http://localhost:3001 | 3001 |
| Request Pickup | http://localhost:3002 | 3002 |
| Track Request | http://localhost:3003 | 3003 |
| Admin | http://localhost:3004 | 3004 |
| Shared API health check | http://localhost:3000/api/health | 3000 |

The API is intentionally shared so pickup requests, tracking results, and admin updates use the same data and session store. Set `PORT` to override the port for an individual process. Set `API_URL` on a website process if the API is running somewhere other than `http://localhost:3000`. Set `CORS_ORIGINS` on the API to a comma-separated list of allowed website origins when using different hosts or ports.

Run the JavaScript syntax checks with `npm test`.

## Demo data and authentication

The current API stores requests and admin sessions in memory and seeds three example requests. Restarting the API clears requests created during the session and restores those examples. Admin access uses the demo credentials configured in `.env`; this is not Firebase Authentication.

Although `firebase-admin` and Firebase placeholders remain in the project configuration, the current server does not initialize Firebase or call Firestore. Request history stores only generated request IDs in the browser and resolves them through the shared API; it is device-local and is not tied to an authenticated user account.

The admin dashboard supports the request data and operations exposed by the API. User management and settings are not implemented in the current backend, so they are not presented as working dashboard actions.

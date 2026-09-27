# ♻️ EcoPickup — FINAL MASTER ANTIGRAVITY BUILD PROMPT

## Mission

Act as a senior full-stack engineer, UI/UX designer, Firebase architect, QA engineer, and Google Cloud deployment engineer.

Build a **complete, functional, polished, jury-ready hackathon MVP** called:

# EcoPickup
### Smart Waste Collection Request Platform

This is a solo project for FIT FEST HACKATHON 2026.

The project must be reliable enough for a live 2–3 minute jury demonstration.

**Do not build a static mockup.**

Every core form, button, search, filter, database operation, authentication flow, status update, and tracking operation must actually work.

---

# 1. Problem

People often face difficulty understanding how to dispose of different types of waste or where to request appropriate waste collection services.

Collection services may also struggle to organize pickup requests and track their status.

# 2. Solution

EcoPickup provides one digital platform where users can:

- Select a waste category
- Enter pickup information
- Schedule a pickup
- Submit a request
- Receive a unique Request ID
- Track the request

Administrators can:

- Login securely
- View requests
- Search requests
- Filter requests
- View details
- Update status
- Delete requests
- View collection statistics

---

# 3. Core Workflow

```text
USER
 ↓
LANDING PAGE
 ↓
REQUEST PICKUP
 ↓
SELECT WASTE CATEGORY
 ↓
ENTER PICKUP DETAILS
 ↓
SELECT DATE + TIME
 ↓
SUBMIT REQUEST
 ↓
GENERATE REQUEST ID
 ↓
FIRESTORE
 ↓
TRACK REQUEST
 ↓
ADMIN LOGIN
 ↓
ADMIN DASHBOARD
 ↓
VIEW / SEARCH / FILTER
 ↓
UPDATE STATUS
 ↓
FIRESTORE
 ↓
USER TRACKING
 ↓
UPDATED STATUS
```

Status lifecycle:

```text
Pending → Accepted → Scheduled → Picked Up → Completed
```

Also support:

```text
Cancelled
```

---

# 4. Technology

Use:

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js
- Express.js
- Firebase Authentication
- Firebase Firestore
- Chart.js
- Lucide Icons
- Docker
- Google Cloud Run
- GitHub

Avoid unnecessary frameworks and dependencies.

Prioritize simplicity and reliability.

---

# 5. DEVELOPMENT RULE

Do not immediately generate random code.

First internally determine:

1. Architecture
2. Page structure
3. Database schema
4. Authentication flow
5. Admin authorization
6. Firestore operations
7. Validation
8. Error handling
9. Deployment structure

Then implement.

After implementation:

- Run/build the project
- Check syntax
- Check imports
- Check undefined variables
- Check routes
- Check Firebase references
- Check browser console
- Check responsive layout
- Check Docker compatibility

If an error is discovered, **fix it before completion**.

Do not knowingly leave broken core functionality.

---

# 6. UI/UX

Design a premium eco-tech SaaS interface.

Visual direction:

- Deep green
- Fresh green
- Teal accent
- White/light neutral background
- Dark charcoal text
- Subtle gradients
- Rounded cards
- Soft shadows
- Excellent spacing
- Modern typography
- Consistent icons
- Subtle animations

Do not make it childish, overly colorful, or template-like.

The result should look like a real student startup product.

---

# 7. Landing Page

Brand:

**EcoPickup**

Tagline:

**Dispose Responsibly. Schedule Easily.**

Hero:

**Smart Waste Collection Made Simple**

Description:

**Schedule responsible waste collection, track your request, and contribute to a cleaner community.**

Buttons:

- Request a Pickup
- Track My Request

Sections:

1. Hero
2. How It Works
3. Waste Categories
4. Why EcoPickup
5. Impact Statistics
6. CTA
7. Footer

Navigation:

- Home
- How It Works
- Waste Categories
- Track Request
- Login
- Request Pickup

---

# 8. Waste Categories

Create cards for:

1. Dry Waste
2. Wet Waste
3. Plastic Waste
4. E-Waste
5. Hazardous Waste
6. Other Waste

Each card:

- Icon
- Category name
- Description
- Example items

Keep information safe and informational.

---

# 9. Pickup Request

Create a professional form.

## Personal

- Full Name
- Phone
- Email

## Waste

- Waste Category
- Waste Description
- Approximate Quantity

## Pickup

- Full Address
- City
- Pincode
- Pickup Date
- Time Slot

Time slots:

- Morning — 8 AM to 11 AM
- Afternoon — 11 AM to 2 PM
- Evening — 2 PM to 6 PM

## Additional

- Instructions

---

# 10. Validation

Validate:

- Full name: 2–80 characters
- Indian mobile number: valid 10 digits
- Email: valid format
- Pincode: exactly 6 digits
- Category: required
- Address: required
- City: required
- Pickup date: not in the past
- Time slot: required

Show inline errors.

Disable submit while submitting.

Never show raw technical errors.

---

# 11. Request ID

Generate a unique ID such as:

```text
EP-7K42P9
```

Do not rely on timestamp alone.

After successful Firestore write show:

**Pickup Request Submitted Successfully!**

Display:

- Request ID
- Waste Category
- Pickup Date
- Time Slot
- Address
- Status

Status:

**Pending**

Buttons:

- Copy Request ID
- Track Request
- New Request

---

# 12. Firestore

Collection:

```text
pickupRequests
```

Schema:

```javascript
{
  requestId,
  userId,
  fullName,
  phone,
  email,
  wasteCategory,
  wasteDescription,
  quantity,
  address,
  city,
  pincode,
  pickupDate,
  timeSlot,
  instructions,
  status,
  createdAt,
  updatedAt
}
```

Use server timestamps where appropriate.

---

# 13. Tracking

Page:

**Track Your Pickup**

Input:

Request ID

Button:

Track Request

Display:

- Request ID
- Waste Category
- Address
- Pickup Date
- Time Slot
- Current Status
- Last Updated

Timeline:

```text
Pending
 ↓
Accepted
 ↓
Scheduled
 ↓
Picked Up
 ↓
Completed
```

Highlight current status.

Cancelled requests must show a separate cancelled state.

Invalid ID:

**No request found. Please check your Request ID.**

---

# 14. Authentication

Use Firebase Authentication.

Support:

- Register
- Login
- Logout

Associate requests with authenticated user's UID.

Protect My Requests.

Never hardcode passwords.

Never expose private/server credentials.

---

# 15. My Requests

Show the authenticated user's requests.

Fields:

- Request ID
- Waste Type
- Pickup Date
- City
- Status
- Created Date
- View Details

Empty state:

**You haven't submitted any pickup requests yet.**

---

# 16. Admin Authentication

Create secure admin login.

Never use:

- admin/admin
- admin123
- frontend hardcoded passwords
- frontend-only admin flags

Use Firebase Authentication plus a real authorization mechanism such as:

- Firebase custom claims

or

- controlled admin allowlist documented in configuration

Admin pages must reject unauthorized users.

Do not rely on hiding the admin URL.

---

# 17. Admin Dashboard

Create a professional SaaS dashboard.

Sidebar:

- Dashboard
- All Requests
- Pending
- Scheduled
- Completed
- Cancelled
- Analytics
- Logout

Top bar:

- Search
- Admin identity
- Notifications

KPI cards:

- Total Requests
- Pending
- Scheduled
- Completed
- Cancelled

Use real Firestore values.

Do not use fake production statistics.

---

# 18. Admin Request Table

Columns:

- Request ID
- User
- Waste Type
- Pickup Date
- Time Slot
- City
- Status
- Actions

Actions:

- View
- Update
- Delete

Delete requires confirmation.

Show loading state during operations.

---

# 19. Search and Filters

Search by:

- Request ID
- User name
- Phone
- Waste category
- City
- Pincode

Filters:

- Status
- Waste category
- Pickup date

Statuses:

- All
- Pending
- Accepted
- Scheduled
- Picked Up
- Completed
- Cancelled

Add:

**Clear Filters**

Search and filters must work together.

---

# 20. Request Details

View should open a modal or drawer.

Show:

## User

- Name
- Phone
- Email

## Waste

- Category
- Description
- Quantity

## Pickup

- Address
- City
- Pincode
- Date
- Time
- Instructions

## Request

- Request ID
- Created At
- Updated At
- Current Status

---

# 21. Status Management

Admin can set:

- Pending
- Accepted
- Scheduled
- Picked Up
- Completed
- Cancelled

On update:

1. Verify authorization
2. Update Firestore
3. Update updatedAt
4. Refresh table
5. Refresh KPIs
6. Show success toast

Tracking page must show the new status.

---

# 22. Analytics

Use Chart.js.

Charts:

1. Requests by Waste Category
2. Requests by Status
3. Requests Over Time

Cards:

- Total Requests
- Active Requests
- Completed Requests
- Completion Rate

Formula:

```text
Completed / Total × 100
```

If total is zero:

```text
0%
```

Never show NaN.

---

# 23. Error Handling

Handle:

- Firebase unavailable
- Network errors
- Invalid Request ID
- Authentication errors
- Permission denied
- Failed write
- Failed update
- Failed delete
- Empty database

Every async operation should use proper error handling.

Never leave an infinite loading state.

---

# 24. Security

Never:

- Hardcode passwords
- Expose service account keys
- Commit `.env`
- Trust frontend admin flags
- Allow arbitrary users to update requests
- Expose private credentials

Create:

```text
.env.example
firestore.rules
.gitignore
```

Firestore rules must enforce authentication and authorization.

---

# 25. Responsive Design

Test:

- 1440px
- 1024px
- 768px
- 390px

Mobile:

- Collapsed navigation
- One-column forms
- Responsive cards
- Responsive tables
- Mobile admin menu
- Large touch-friendly buttons

---

# 26. Accessibility

Implement:

- Semantic HTML
- Input labels
- Keyboard navigation
- Focus states
- Accessible buttons
- Good contrast
- Alt text
- aria-label where required

Do not communicate status using color alone.

---

# 27. Project Structure

Use:

```text
EcoPickup/
├── public/
│   ├── index.html
│   ├── request.html
│   ├── track.html
│   ├── login.html
│   ├── register.html
│   ├── requests.html
│   ├── admin.html
│   ├── css/
│   │   ├── style.css
│   │   ├── auth.css
│   │   └── admin.css
│   ├── js/
│   │   ├── firebase.js
│   │   ├── auth.js
│   │   ├── main.js
│   │   ├── request.js
│   │   ├── track.js
│   │   ├── requests.js
│   │   └── admin.js
│   └── assets/
├── server/
│   └── server.js
├── firestore.rules
├── package.json
├── Dockerfile
├── .dockerignore
├── .gitignore
├── .env.example
└── README.md
```

You may improve the structure if necessary, but keep it simple.

---

# 28. Code Quality

Code must be:

- Modular
- Readable
- Maintainable
- Consistent
- Properly named

Avoid:

- duplicate code
- unused variables
- dead functions
- placeholder code
- broken TODOs
- unnecessary dependencies

---

# 29. Demo Data

Provide an optional seed mechanism with around 8–10 realistic requests.

Use different:

- Waste categories
- Statuses
- Dates

Do not automatically insert demo data into production.

Document the seed process.

---

# 30. Google Cloud Run

Create a production-ready Dockerfile.

Server must use:

```javascript
const PORT = process.env.PORT || 8080;
```

Bind to:

```text
0.0.0.0
```

Do not hardcode production port.

README must contain Cloud Run deployment instructions.

---

# 31. README

Include:

- Project overview
- Problem
- Solution
- Features
- Architecture
- Tech stack
- Folder structure
- Firebase setup
- Authentication
- Firestore
- Environment variables
- Local setup
- Testing
- Docker
- Cloud Run
- Demo flow
- Future scope
- Hackathon details

---

# 32. Jury Demo

The live flow must work:

```text
Landing
↓
Request Pickup
↓
Select E-Waste
↓
Enter details
↓
Schedule
↓
Submit
↓
Request ID
↓
Track
↓
Pending
↓
Admin Login
↓
Dashboard
↓
Find Request
↓
View
↓
Pending → Accepted
↓
Accepted → Scheduled
↓
Track Again
↓
Updated Status
↓
Analytics
```

Target demo duration:

**2–3 minutes**

---

# 33. Optional Smart Feature

Only after the core workflow is completely stable, optionally add a deterministic:

**Waste Guide**

When a category is selected, show predefined disposal guidance.

Do not add an external AI API if it risks stability.

Core workflow always has priority.

---

# 34. FINAL QA GATE

Before declaring complete, verify:

- [ ] All pages open
- [ ] Navigation works
- [ ] No missing files
- [ ] No syntax errors
- [ ] No import errors
- [ ] No undefined variables
- [ ] No browser console errors
- [ ] Registration works
- [ ] Login works
- [ ] Logout works
- [ ] Request form works
- [ ] Validation works
- [ ] Firestore write works
- [ ] Request ID works
- [ ] Tracking works
- [ ] Admin authentication works
- [ ] Dashboard works
- [ ] Search works
- [ ] Filters work
- [ ] Details modal works
- [ ] Status update works
- [ ] User sees updated status
- [ ] Delete confirmation works
- [ ] Analytics works
- [ ] Empty states work
- [ ] Error states work
- [ ] Mobile layout works
- [ ] `.env` is protected
- [ ] Firestore rules exist
- [ ] Dockerfile is valid
- [ ] PORT is configurable
- [ ] Server binds to 0.0.0.0
- [ ] README is complete

If something fails:

**FIX IT AND RETEST IT.**

Do not merely report the error.

Do not claim something passed unless it was actually checked.

---

# 35. FINAL OUTPUT

After completing the project, provide:

1. Final project structure
2. Technologies
3. Completed features
4. Firebase setup
5. Environment variables
6. Local run commands
7. Test/build result
8. Docker instructions
9. Cloud Run commands
10. Known limitations

Final priority:

```text
RELIABILITY
>
CORE FUNCTIONALITY
>
SECURITY
>
JURY DEMO
>
UI POLISH
>
EXTRA FEATURES
```

Build a stable, professional and functional MVP.

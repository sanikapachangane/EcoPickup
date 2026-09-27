# EcoPickup — JURY DEMO SCRIPT

## 30-Second Introduction

"EcoPickup is a smart waste collection request platform designed to make waste pickup more organized for both citizens and collection administrators.

A user can select a waste category, enter pickup details, schedule a preferred time, submit a request and track it using a unique Request ID.

The administrator has a separate dashboard to manage requests, update statuses and view collection statistics."

---

# LIVE DEMO

## 1. Landing

Show:

- Hero
- Waste categories
- How it works

Say:

"This platform has two main modules: User and Admin."

## 2. Request

Click Request Pickup.

Select:

E-Waste

Fill realistic data.

Choose a date and time.

Submit.

Say:

"The request is stored in Firebase and the system generates a unique Request ID."

## 3. Tracking

Open Track Request.

Enter ID.

Say:

"The request is currently Pending."

Show timeline.

## 4. Admin

Open Admin Login.

Show:

- Dashboard
- KPIs
- Requests

Find the request.

## 5. Status

Change:

Pending → Accepted

Then:

Accepted → Scheduled

Say:

"The administrator can update the lifecycle and the change is persisted in the database."

## 6. User Side

Return to tracking.

Refresh.

Say:

"The user can now see the updated status."

## 7. Analytics

Show:

- Category chart
- Status chart
- Request trend
- Completion rate

## Closing

"EcoPickup focuses on one complete workflow: requesting, managing and tracking waste collection. The MVP is intentionally focused and can later be extended with route optimization, notifications, GPS-based pickup and waste classification."

---

# COMMON JURY QUESTIONS

## Why this problem?

"Waste management also has a coordination problem between the person requesting collection and the service managing pickups. EcoPickup focuses on making that interaction organized and trackable."

## Why Firebase?

"Firebase provides authentication and a cloud database that is practical for building a functional MVP quickly."

## Why Cloud Run?

"Cloud Run provides managed deployment for our containerized application."

## What is the core innovation?

"The project digitizes the complete request lifecycle instead of only providing information about waste."

## Future scope?

- GPS
- Route optimization
- Notifications
- Waste image classification
- Municipal integration
- Multilingual support

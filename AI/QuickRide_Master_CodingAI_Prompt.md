# QuickRide Booking — Master Implementation & Simplification Prompt

---

## WHO YOU ARE WORKING WITH

You are working on **QuickRide Booking**, a car rental SaaS web application
built as a school capstone project. The system is already built and functional
in parts, but has two problems that need to be resolved together:

1. **Many admin settings exist in the UI and save to Firestore but have no
   effect on actual system behavior.** These need to be wired to real logic.

2. **Several features are overbuilt, confusing, or half-finished in a way that
   makes the system look incomplete.** These need to be simplified into
   smaller, working versions — not removed entirely, just made leaner and
   cleaner.

The primary selling point of this product is **customizability** — admins
configure how the system behaves without touching code. Every setting must
have a visible, testable effect.

---

## TECH STACK

- **Frontend:** Next.js 16, React 19, TypeScript
- **Database:** Firebase Firestore — the ONLY database. Do NOT introduce
  SQLite, PostgreSQL, or any second database.
- **Auth:** Firebase Authentication
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion

---

## CORE RUNTIME PATTERN

All features must read settings from Firestore at runtime via a shared
settings context. Never hardcode values that are controlled by admin settings.

```ts
// Use this pattern throughout all implementations:
const { settings } = useSettings();
if (!settings.booking.autoRejectOnConflict) return;
```

---

## PART A — SIMPLIFY FIRST (Do These Before Adding New Logic)

These are existing features that are overbuilt or confusing. Simplify them
first so the codebase is clean before adding new functionality.

---

### A1. Remove SQLite — Use Firebase Only

**Problem:** The codebase uses Firebase Firestore as the primary database but
also references SQLite for admin user data. This creates two sources of truth
and sync complexity.

**Action:**
- Migrate any admin user data stored in SQLite into Firestore under an
  `admin_users` collection.
- Remove all SQLite dependencies, connection files, and migration scripts.
- Ensure all admin authentication and profile data flows through Firebase
  Auth + Firestore only.
- After migration, verify admin login, admin profile updates, and
  role assignment still work.

---

### A2. Simplify the Loyalty Points System

**Problem:** A full points ledger (earn, redeem, transaction history) is
complex to build and adds little value for a car rental business where
customers book infrequently.

**Action — Replace with a Booking Rewards Summary:**
- Remove the points earn/redeem/transaction logic entirely.
- Replace with a simple **"Rewards" card** on the customer dashboard that
  shows:
  - Total completed trips
  - A static tier label based on trip count:
    - 0–2 trips → "New Member"
    - 3–9 trips → "Regular"
    - 10+ trips → "Valued Customer"
  - A friendly message: "Thank you for choosing QuickRide!"
- No point calculations, no redemption flow, no points balance.
- This gives the rewards section a purpose without the complexity.

---

### A3. Simplify Scheduled / Dynamic Pricing

**Problem:** Time-based pricing rules with overlap resolution priority
settings are enterprise-level complexity. The overlap resolution logic
(`priority_based` vs `latest_created_wins`) is a source of subtle bugs and
is not needed for a small fleet capstone system.

**Action — Replace with Price Override:**
- Remove the scheduled pricing configuration UI (time-based rules,
  priority settings, overlap resolution toggle).
- Replace with a single **"Price Override"** feature in the admin booking
  detail view:
  - An input field for a custom price with a mandatory reason field.
  - A "Apply Override" button that saves the custom price to the booking
    record in Firestore.
  - A visible log entry: `"Price overridden by [admin name]: [reason]
    — original ₱X → override ₱Y"`.
- Keep the base pricing engine (block-based, hierarchical, driver fee) as-is.
- The `allow_admin_pricing_override` and `allow_staff_pricing_override`
  settings should control whether the override UI is visible per role.

---

### A4. Simplify Price Locking Mode

**Problem:** A toggle between "locked at approval" vs "recalculated on change"
creates edge cases and confuses both operators and customers about what price
they will be charged.

**Action:**
- Remove the `pricing_mode` toggle from admin settings.
- Always lock the price at booking submission. The price a customer sees
  when they confirm is the price they pay.
- Display the locked price clearly on the booking confirmation screen and
  in all subsequent booking views.
- Update any code that references `pricing_mode` to always use the
  locked-price behavior.

---

### A5. Remove Offline / LocalStorage Booking Cache

**Problem:** Caching availability data locally creates stale data risks —
a customer sees a vehicle as available locally but it has already been
booked by another user. This can cause double bookings, which is a
critical operations failure.

**Action:**
- Remove all LocalStorage read/write logic from the booking flow.
- Remove any service worker or cache logic related to availability data.
- All vehicle availability queries must be live Firestore reads at the
  moment of booking.
- Draft booking form data (e.g., selected dates, vehicle choice before
  submission) may still be held in React state — that is acceptable and
  does not need to be removed.

---

### A6. Simplify Message Read Receipts

**Problem:** Tracking message read status in real-time adds Firestore read
overhead and the result never feels as polished as WhatsApp, creating
user disappointment.

**Action — Replace with a Simple Unread Count:**
- Remove per-message read receipt tracking (individual `read_by` fields
  on each message document).
- Replace with a simple **unread message badge** on the booking card and
  chat list:
  - When a new message arrives in a booking chat, increment an
    `unread_count` field on the booking document for the other party.
  - When a user opens the chat, reset their `unread_count` to 0.
  - Show a red badge with the count on the booking card in the dashboard.
- This achieves the same UX goal (you can see there are unread messages)
  with a fraction of the complexity.

---

### A7. Simplify Admin Settings Panel

**Problem:** The settings panel has 10 categories with 80+ individual
toggles. This causes decision fatigue and makes the system look unfinished
to evaluators.

**Action — Collapse to 5 Focused Sections:**

Reorganize the settings panel into exactly these 5 sections. Move advanced
or rarely-used toggles into a collapsible "Advanced" subsection within
each category. Hide them by default.

**Section 1 — General**
Keep: System name, support email, support phone, timezone, currency,
date format, time format, default language, system status.

**Section 2 — Booking**
Keep (visible): Booking mode (auto-confirm or requires approval),
max booking duration hours, min booking duration hours, require driver,
buffer time minutes, overlap policy.
Move to Advanced (collapsed by default): Allow reactivation of cancelled,
allow reapprove rejected, auto-reject on conflict, auto-cancel conflicting
pending, allow pending conflict hold, pending booking priority expiry.

**Section 3 — Payment**
Keep (visible): Downpayment required, downpayment type, downpayment value,
payment timing, payment verification mode, refund mode, refund default
percentage, auto-cancel unpaid booking.
Move to Advanced: Allow partial payment, allow payment retry, failed
payment behavior, pending payment expiry minutes, refund flat amount,
refund override allowed.

**Section 4 — Fleet**
Keep (visible): Assignment mode, maintenance mode enabled,
maintenance blocks booking.
Move to Advanced: Vehicle conflict policy, vehicle unavailable behavior,
car type enabled, car model enabled, car unit tracking enabled.

**Section 5 — System**
Keep (visible): Maintenance enabled, maintenance allow admin bypass,
audit logging enabled, late fee method, tax rate, session timeout minutes.
Move to Advanced: Maintenance blocks booking creation, maintenance blocks
payment processing, log level, audit retention days, chat retention days,
late fee flat amount, late fee percentage.

Remove entirely from settings (handle in code with sensible defaults):
- Chat retention policy config (hardcode 90 days)
- Overlap resolution priority (always block)
- Pending payment expiry (hardcode 24 hours as default, allow override
  only in the Advanced section)
- Pricing mode / lock toggle (always locked — see A4)

---

### A8. Simplify User Roles and Permissions

**Problem:** Granular per-module permissions per role (bookings, payments,
vehicles, chat, users, settings — all individually toggleable per role)
is excessive for a system with two roles. It creates configuration surface
area without real benefit.

**Action:**
- Implement two fixed roles with hardcoded permission sets:
  - **Admin:** Full access to everything — bookings, fleet, payments,
    users, staff, settings, audit logs, reports.
  - **Staff:** Access to bookings (approve/reject/manage), vehicle
    assignment, booking chat, customer view. No access to settings,
    no access to audit logs, no access to payment configuration.
- Remove the granular permission toggle grid from the admin settings UI.
- Replace with a simple role description card showing what each role can
  and cannot do — informational only, not configurable.
- Keep role assignment (assigning Admin or Staff to a user account)
  fully functional.

---

### A9. Simplify Support Chat

**Problem:** Ticket-based and group-based support modes with auto/manual
assignment is a help-desk product, not a rental feature. Building both
modes creates scope risk.

**Action — Implement One Simple Support Inbox:**
- Remove the `support_mode` toggle (ticket_based vs group_based).
- Remove the `support_assignment_mode` toggle.
- Implement a single **Support Inbox** that works as follows:
  - Customer sends a support message from their dashboard (a simple form:
    subject + message).
  - The message creates a support thread document in Firestore with
    status: `open`.
  - All open support threads appear in a unified Staff inbox labeled
    "Support Messages."
  - Any staff member can open and reply. First reply auto-assigns the
    thread to that staff member.
  - Thread can be marked `resolved` by staff. Customer sees the resolved
    status and can re-open by sending another message.
- Keep `support_chat_enabled` as the on/off toggle for this entire feature.
- If disabled, hide the support inbox from both the customer dashboard
  and the staff portal.

---

## PART B — IMPLEMENT (Wire Settings to Real Logic)

Now that the codebase is cleaned up, implement the following. All of these
are settings that currently save to Firestore but have no effect on the
system.

---

### B1. Payment Settings

**B1.1 Downpayment System**
- Read `downpayment_required` during booking submission.
- If `true`, calculate the required amount using `downpayment_type`
  (`percentage` or `fixed`) and `downpayment_value`.
- Display the downpayment amount on the booking summary screen before
  the customer confirms.
- Block booking submission if downpayment is required but no payment
  proof has been uploaded.

**B1.2 Payment Timing**
- `before_approval`: Show the payment upload step before booking submission.
- `after_approval`: Hide the payment step during booking. After admin
  approves, trigger a notification to the customer to submit payment proof.
- `flexible`: Show both options to the customer with a labeled choice.

**B1.3 Partial Payment**
- If `allow_partial_payment` is `true`, allow the customer to enter a
  partial amount and submit. Mark booking as `partially_paid`.
- Show remaining balance on the booking detail page for both customer
  and admin.

**B1.4 Payment Retry**
- If `allow_payment_retry` is `true`, show a "Retry Payment" button on
  bookings with `payment_failed` status.
- If `false`, show a static message: "Contact us to resolve your payment."

**B1.5 Failed Payment Behavior**
- `keep_record`: Mark the existing payment record as failed, allow retry
  on the same record.
- `create_new_record`: Archive the failed record, create a fresh payment
  attempt entry in Firestore.

**B1.6 Pending Payment Expiry**
- Default expiry: 24 hours. Use `pending_payment_expiry_minutes` from
  Advanced settings if set.
- On entering `pending_payment` state, write `payment_expires_at` to the
  booking document.
- On page load, check if `payment_expires_at` has passed. If yes and
  `auto_cancel_unpaid_booking` is `true`, trigger cancellation.
- Log: `"Auto-cancelled: payment not received within the allowed window."`
- Notify the customer via in-app notification.

**B1.7 Refund Processing**
- Implement `processRefund(bookingId)`:
  1. Read `refund_mode`: `percentage`, `flat`, or `hybrid`.
  2. Calculate refund amount from the booking total.
  3. Create a `refund` record under the booking in Firestore.
  4. Update booking status to `refund_processed`.
  5. Notify the customer.
- If `refund_override_allowed` is `true`, show a custom amount input
  in the admin refund panel.

**B1.8 Payment Verification Mode**
- `manual`: Staff sees uploaded proof image and clicks Verify or Reject.
- `api`: Show "Awaiting gateway confirmation" — block manual buttons.
- `hybrid`: Show manual verification as a fallback even in API mode.

---

### B2. Booking Settings

**B2.1 Auto-Reject on Conflict**
- On booking submission, query Firestore for approved/active bookings on
  the same vehicle with overlapping dates.
- If conflict exists and `auto_reject_on_conflict` is `true`, set booking
  to `rejected` with reason: `"Vehicle unavailable for selected dates."` 
  Notify customer.

**B2.2 Auto-Cancel Conflicting Pending Bookings**
- When a booking is approved, check for other `pending` bookings on the
  same vehicle with overlapping dates.
- If `auto_cancel_conflicting_pending` is `true`, cancel them and notify
  those customers.

**B2.3 Allow Reactivation of Cancelled Bookings**
- If `true`, show a "Reactivate" button in admin/staff booking detail for
  `cancelled` bookings. Resets status to `pending`, notifies customer.
- If `false`, hide the button entirely.

**B2.4 Allow Reapprove Rejected Bookings**
- If `true`, show a "Re-evaluate" button for `rejected` bookings. Resets
  to `pending` for re-review.
- If `false`, rejected bookings are final — hide the button.

**B2.5 Require Driver**
- If `true`, lock the driver toggle in the booking form to ON.
- Display: "A professional driver is required for all bookings."
- Auto-add the driver fee to the booking total.

---

### B3. Availability Settings

**B3.1 Buffer Time**
- Read `buffer_time_minutes`.
- When checking availability, extend every approved/active booking's end
  time by the buffer before comparing against a new booking's date range.
- Example: booking ends 2:00 PM + 60 min buffer = unavailable until 3:00 PM.

**B3.2 Overlap Policy**
- `block`: Prevent submission. Show error: "This vehicle is already booked
  for the selected period."
- `warn`: Allow submission but show a warning banner in the booking form
  and in the admin booking view.
- `allow_override`: Staff/admin sees a conflict warning with a confirmation
  checkbox to proceed.

**B3.3 Pending Conflict Hold**
- If `allow_pending_conflict_hold` is `true`, a pending booking holds the
  vehicle slot. Other customers see: "Vehicle tentatively reserved —
  check back shortly."
- Hold releases after `pending_booking_priority_expiry_minutes` (default
  24 hours) if booking is still pending.

---

### B4. Vehicle Settings

**B4.1 Assignment Mode**
- `manual_required`: Block "Approve" if no vehicle is assigned. Show error:
  "Assign a vehicle before approving this booking."
- `auto_first_available`: On approval, query Firestore for the first
  available vehicle of the requested type with no conflicting bookings.
  Auto-assign and log the action.
- `auto_best_match`: Same as above but prioritize vehicles with the most
  recent maintenance record.

**B4.2 Vehicle Conflict Policy**
- `block`: Prevent assigning a vehicle already booked in the same period.
- `warn`: Allow but show a warning to admin/staff.
- `override_allowed`: Allow admin to assign with a confirmation step.

**B4.3 Vehicle Unavailable Behavior**
- `auto_reassign`: If an assigned vehicle becomes unavailable, run
  auto-assignment to find a replacement. Notify the customer.
- `manual_intervention`: Flag the booking as `needs_attention` and notify
  admin/staff to resolve manually.

**B4.4 Maintenance Mode**
- If `vehicle_maintenance_mode_enabled` is `true`: Show a maintenance
  status toggle on each vehicle's management page.
- If `maintenance_blocks_booking` is `true`: Remove maintenance-flagged
  vehicles from the customer-facing fleet browser, and block staff from
  assigning them to bookings.

---

### B5. System Behavior Settings

**B5.1 System Maintenance Mode**
- If `maintenance_enabled` is `true`:
  - Show a full-screen maintenance page to all public visitors.
  - If `maintenance_allow_admin_bypass` is `true`, logged-in admins can
    still access the admin portal.
  - If `maintenance_blocks_booking_creation` is `true`, block new booking
    submissions even if a user bypasses the page.
  - If `maintenance_blocks_payment_processing` is `true`, disable all
    payment upload and verification with message: "Payments are temporarily
    paused for maintenance."

**B5.2 Tax Rate**
- Read `tax_rate` (percentage).
- Apply to the booking total in the pricing engine.
- Show a tax line item in the booking summary: "VAT 12%: ₱XXX."
- Store the tax amount in the booking Firestore document.

**B5.3 Late Fee Calculation**
- Implement `calculateLateFee(booking)`:
  - `hourly_rate`: Vehicle hourly rate × hours overdue.
  - `flat_amount`: Apply `late_fee_flat` as a fixed charge.
  - `percentage`: Apply `late_fee_percent` of the original booking total.
- Show the late fee on the admin booking detail view when a booking is
  past its end time and still `active`.
- Allow admin to apply or waive the fee with a logged reason.

**B5.4 Chat Retention**
- Hardcode retention to 90 days unless `chat_retention_days` is set in
  Advanced settings.
- Filter out messages older than the retention window when loading chat.
- Show at the top of the chat: "Messages older than 90 days are not shown."
- Do not delete Firestore documents from the frontend — only hide them.

---

### B6. Notification Settings

**B6.1 Wire Trigger Flags**
The system sends notifications but does not check the trigger flags.
Fix by reading settings before every notification dispatch:

```ts
const { notifications } = useSettings();

// Apply this gate before every notification call:
if (!notifications.trigger_booking_created) return;
if (!notifications.trigger_booking_approved) return;
if (!notifications.trigger_booking_rejected) return;
if (!notifications.trigger_payment_received) return;
if (!notifications.trigger_payment_failed) return;
if (!notifications.trigger_refund_processed) return;
```

**B6.2 Urgency Only Flag**
- If `urgency_only` is `true`, suppress all non-critical notifications.
- Only send for: booking cancellation, payment failure, maintenance
  conflict, late fees.
- Mark urgent notifications with a red indicator in the notification UI.

**B6.3 Email Notifications (Scaffold)**
- Create an API route at `/api/notifications/email`.
- The route checks `email_notifications_enabled` from settings.
- If enabled, send via Resend or Nodemailer using plain HTML templates.
- Implement templates for: booking confirmation, booking approval,
  booking rejection.
- Send asynchronously — do not block the booking flow on email success.
- If the email service is not yet configured, log a warning and fail
  silently.

---

## PART C — IMPLEMENTATION ORDER

Work in this order to make the system feel functional as quickly as possible
for a capstone demo:

**Do Part A simplifications first**, then implement Part B in this sequence:

1. Tax rate — single function, visible in booking summary immediately
2. System maintenance mode — high visual impact, easy to demonstrate
3. Vehicle maintenance mode + blocks booking
4. Overlap policy + buffer time — prevents double bookings
5. Notification trigger flags — low effort, fixes a visibly broken feature
6. Downpayment system — core payment feature
7. Payment timing flow
8. Auto-cancel unpaid bookings
9. Refund processing
10. Auto-reject / conflict detection
11. Assignment mode (auto_first_available)
12. Late fee calculation
13. Support inbox (simplified — from A9)
14. Chat read/unread badge (simplified — from A6)
15. Email notifications scaffold

---

## CONSTRAINTS

- Firebase Firestore is the only database. No SQLite.
- Do not redesign or remove existing UI that already works — simplify and
  add to it.
- All settings must be read from Firestore at runtime — never hardcode
  values that belong to admin settings.
- Use Firestore transactions for conflict-sensitive booking operations
  (approval, assignment, conflict checks).
- Every automated action (auto-cancel, auto-reject, auto-assign) must write
  a log entry to the booking's activity log with a timestamp and reason.
- Keep TypeScript types strict — update type definitions for any new fields.
- All UI changes must remain mobile-responsive using existing Tailwind CSS
  breakpoints.

---

## DEFINITION OF DONE

The system is complete when:

- Every setting in the admin panel has a visible, testable effect on the
  system.
- A booking can go through the full lifecycle (created → paid → approved →
  active → completed) entirely through the UI.
- Maintenance mode makes the public site inaccessible to non-admins.
- Tax and late fees appear automatically in booking summaries.
- Conflict detection prevents or warns about overlapping bookings.
- Notifications only fire for the triggers the admin has enabled.
- The admin settings panel has 5 clean sections, not 10 overwhelming ones.
- The loyalty section shows a meaningful summary without a points system.
- Support chat works as a simple inbox without ticket complexity.

---

If you need to see existing code before implementing any section, ask for the
specific file (e.g., `settings-service.ts`, `booking-service.ts`,
`pricing-engine.ts`, `notifications.ts`) and it will be provided.

# QuickRide Booking System — Implementation Blueprint

# ABBREVIATIONS
DP=downpayment, BM=booking_mode, VM=verification_mode, BT=buffer_time_minutes, AP=approval, TSM=state machine

---

# 1. SYSTEM OVERVIEW
- Purpose: Car rental SaaS — vehicle bookings, payments, chat, operations across admin/staff/client roles
- Architecture: Next.js, Firebase (Auth, Firestore, Storage, Cloud Functions), RBAC, modular service layer
- Capabilities: booking lifecycle, pricing engine, manual/API payment verification, dual chat, white-label branding, audit logging, 11-tab settings hub

---

# 2. CORE MODULES
- Booking: multi-step creation, AP queue, TSM enforcement, conflict detection, timeline per booking
- Vehicles (types > models > units): types=top-level, models link to types, units=individual rentable instances; status: available/assigned/maintenance + assignment history
- Pricing: hourly/12h/24h decomposition, locked vs recalculated mode, price frozen at first payment or AP, staff/admin override allowed, scheduled pricing with priority resolution
- Payment: GCash default gateway (extensible), DP (fixed/%), timing (before/after/flexible AP), partial accumulation, failed retains record, refunded=terminal
- Chat: two isolated systems — booking chat auto-generated per booking (multi-role); support chat ticket/group mode per global setting, auto/manual assignment
- Notifications: in-app (required), email (optional), event-driven, urgency flag=visual only/no sort impact, real-time required
- System Settings: 11-tab admin-only hub; each setting stored as category+key+value+metadata
- Branding: CSS variable injection, light/dark mode, colors (primary/secondary/accent/bg/text), logo/favicon/login-bg, scoped per dashboard
- RBAC: dynamic roles (admin creates/deletes), permission domains (bookings/payments/vehicles/chat/users/settings), admin always wins, same-role=last action wins, inheritance supported
- Audit Logs: immutable append-only; captures actor_id/role/action_type/entity_type/entity_id/before_snapshot/after_snapshot/timestamp/reason; reason mandatory for overrides/refunds/cancellations/assignment changes
- Maintenance Mode: system-wide toggle, blocks booking creation + payment processing, admin bypass allowed

---

# 3. CRITICAL RULES

Booking TSM — valid transitions only:
- pending > approved/rejected/cancelled/ongoing
- approved > ongoing; ongoing > completed
- rejected > approved (if allow_reapprove_rejected enabled)
- cancelled > reactivated (if allow_reactivation_of_cancelled enabled)
- Invalid transitions blocked server-side. Only approved=real reservation; pending does not hold confirmed slots.

Availability + Conflict:
- Overlap detection uses datetime range + BT applied before and after each booking
- Priority: (1) manual override > (2) approved > (3) pending
- overlap_policy: block/warn/allow_override
- auto_cancel_conflicting_pending cancels lower-priority pending on AP of conflicting booking
- auto_reject_on_conflict auto-rejects new pending when conflict detected

Pricing + Lock (merged):
- Algorithm: 24h > 12h > hourly remainder; rounding: ceil/floor/nearest
- locked mode: price frozen at first payment or AP (whichever first); snapshot stored in booking record; booking-price-service.ts must write snapshot at AP — no drift allowed
- recalculated mode: always recalculated dynamically
- Staff/admin override allowed per setting; scheduled pricing uses priority_based or latest_created_wins

Payment Lifecycle:
- States: pending > partial > paid > failed > refunded (terminal)
- Failed: record kept, not replaced (create_new_record optional per setting)
- Partial payments accumulate on same record
- pending_payment_expiry_minutes triggers auto_cancel_unpaid_booking if enabled

Refund Rules:
- refund_mode: percentage/flat/hybrid; reason mandatory; stored in audit log
- refund_override_allowed: staff can deviate from default value
- refund_approval_required_roles: who must approve before processing

Vehicle Assignment:
- Triggered at AP only, not at booking creation
- assignment_mode: auto_first_available/auto_best_match/manual_required
- conflict_policy: block/warn/override_allowed
- vehicle_unavailable_behavior: auto_reassign or manual_intervention + admin notification
- maintenance_blocks_booking: if true, maintenance units cannot be assigned

Override + Maintenance:
- Admin override always wins; same-role=last action wins; all overrides require mandatory reason in audit log
- Maintenance toggle blocks booking creation + payment processing; maintenance_allow_admin_bypass allows admin to operate; triggered via system_status in General Settings

---

# 4. SYSTEM SETTINGS

General (1.1): system_name, timezone (IANA), currency (default PHP), date_format, time_format (12h/24h), default_language, system_status (active/maintenance) — timezone affects all datetime rendering; currency affects all pricing display; system_status triggers maintenance mode globally

Booking (1.2): BM (auto_confirm/requires_approval), BT, overlap_policy (block/warn/allow_override), allow_pending_booking_creation, allow_pending_conflict_hold, pending_booking_priority_expiry_minutes, approval_roles_allowed, auto_reject_on_conflict, auto_cancel_conflicting_pending, allow_reactivation_of_cancelled, allow_reapprove_rejected, require_driver, max_booking_duration_hours, min_booking_duration_hours

Payment (1.3): downpayment_required, downpayment_type (percentage/fixed), downpayment_value, payment_timing (before_approval/after_approval/flexible), allow_partial_payment, allow_payment_retry, failed_payment_behavior (keep_record/create_new_record), pending_payment_expiry_minutes, auto_cancel_unpaid_booking, refund_mode (percentage/flat/hybrid), refund_default_percentage, refund_default_flat, refund_override_allowed, refund_approval_required_roles, VM (manual/api/hybrid); gateway fields: name/type(manual/api)/api_key/qr_image/account_details/priority/active_status

Pricing (1.4): pricing_mode (locked/recalculated), hourly_rate, 12_hour_rate, 24_hour_rate, rounding_rule (ceil/floor/nearest), allow_staff_pricing_override, allow_admin_pricing_override, scheduled_pricing_enabled, overlap_resolution (priority_based/latest_created_wins)

Vehicle (1.5): car_type_enabled, car_model_enabled, car_unit_tracking_enabled (CRITICAL), assignment_mode (auto_first_available/auto_best_match/manual_required), assignment_trigger=booking_AP only, conflict_policy (block/warn/override_allowed), vehicle_unavailable_behavior (auto_reassign/manual_intervention), vehicle_maintenance_mode_enabled, maintenance_blocks_booking

Chat (1.6): booking_chat_enabled, support_chat_enabled, support_mode (ticket_based/group_based), support_assignment_mode (auto/manual), allow_client_chat_edit, allow_client_chat_delete, allow_staff_chat_moderation, chat_close_behavior (archived_readonly/deleted — deleted NOT recommended)

Notifications (1.7): in_app_notifications (required), email_notifications (optional), urgency_only_flag (visual only/no sort impact), real_time_delivery required; triggers: booking_created/approved/rejected, payment_received/failed, refund_processed

Branding (1.8): light_theme_colors, dark_theme_colors, primary/secondary/accent/background/text colors, scope toggles (admin/staff/client/public_pages_theme_apply), logo/favicon/login_background; CSS variables dynamically injected; instant or on-reload depending on setting type

Roles and Permissions (1.9): dynamic roles (admin creates/deletes); domains: bookings/payments/vehicles/chat/users/settings; admin always wins; same-role=last action wins; hierarchy optional (future); inheritance supported

System Behavior (1.10): audit_logging_enabled, log_level (minimal/full — full recommended), audit_retention_days, chat_retention_policy, maintenance_enabled, maintenance_allow_admin_bypass, maintenance_blocks: booking_creation + payment_processing

Availability: implied under Booking (BT, overlap_policy, conflict hold rules)

---

# 5. DATA MODELS

Booking: booking_id, client_id, vehicle_unit_id, start_datetime, end_datetime, status, payment_status, assignment_status, created_at — links to one vehicle unit + one client + one payment record; generates one booking chat

Vehicle Unit: individual rentable instance; status: available/assigned/maintenance; linked to model > type; has assignment_history

Payment: payment_id, booking_id, method, amount, status (pending/partial/paid/failed/refunded), verification_status — one record per booking; partials accumulate on same record

User: roles=client/staff/admin (dynamic beyond these); role assignment on profile; session timeout=2h

Chat: booking chat (tied to booking_id, participants auto-generated) / support chat (ticket or group per global setting); lifecycle: active > resolved > archived (read-only)

Audit Log: actor_id, role, action_type, entity_type, entity_id, before_snapshot, after_snapshot, timestamp, reason — immutable append-only; reason required for overrides/refunds/cancellations/assignment changes

---

# 6. DASHBOARD UI STRUCTURE

Admin: KPI stat cards, revenue chart, AP queue widget; full access (settings/vehicles/bookings/payments/users/audit logs/branding); collapsible grouped dropdown sidebar, admin-scoped

Staff: AP queue, payment verification, vehicle management; no access to system settings/RBAC/audit admin tools; sidebar scoped to operational tasks only

Client: booking creation, animated status stepper, payment submission, chat, live real-time notifications, 4 stat cards (active bookings/pending payments/completed trips/unread messages); no admin/staff access

Sidebar (all roles): collapsible, grouped dropdown, role-based rendering, no duplicated logic, all actions reflect backend state

---

# 7. EDGE CASES

Booking conflicts: on pending creation apply overlap_policy; on AP apply auto_reject_on_conflict or auto_cancel_conflicting_pending; manual override requires mandatory reason + audit entry

Reassignment: vehicle unavailable > auto_reassign or manual_intervention; admin notified on failure; reason mandatory for audit log

Payment failures: record retained; retry via allow_payment_retry; expiry triggers auto-cancellation if auto_cancel_unpaid_booking enabled

Overrides: mandatory reason always; admin wins; same-role=last wins; logged with before/after snapshots

Cancellations: reactivation if allow_reactivation_of_cancelled; re-approve if allow_reapprove_rejected; mandatory reason for audit log

---

# 8. IMPLEMENTATION ORDER
1. Booking engine (TSM, creation, AP flow)
2. Vehicle system (types, models, units, status)
3. Availability engine (conflict detection, BT, overlap policy)
4. Payment system (gateway framework, lifecycle, verification)
5. Pricing engine (decomposition, lock logic, scheduled pricing)
6. Chat system (booking + support)
7. Notifications (real-time, event triggers)
8. Audit log system (immutable storage, viewer UI)
9. RBAC (dynamic roles, permissions, middleware)
10. System settings engine (11-tab hub)
11. Branding (CSS variables, theme engine)
12. Dashboards UI (admin/staff/client, shared component library)
Security hardening last — showcase-only until real-world deployment.

---

# 9. WEBSITE CHANGES / EVOLUTION

Security (deprioritized — showcase mode): service-account.json exposed in repo root; admin/staff sessions as plain JSON in localStorage via portal-auth.ts (spoofable via DevTools); no middleware.ts guard on /admin/* and /staff/*; deferred by user until real-world deployment

Admin Dashboard: was single 8KB file (no KPIs/chart/queue); rebuilt with KPI stat cards, revenue chart, AP queue widget per DASHBOARD_SPEC.md

Client Dashboard: hardcoded mock notifications (static array lines 256-260 of dashboard/page.tsx) replaced with live real-time service; added missing 2 of 4 stat cards; added animated booking status stepper

Pricing Fix: booking-price-service.ts calculated correctly but never wrote locked price into booking record at AP; fixed by writing snapshot at AP time

Settings Hub: original covered only General (partial) + Late Fee + Pricing Mode; 9 of 11 modules missing; all 11 tabs built from scratch into tabbed hub; tsc --noEmit passed zero errors

Settings Priority Elevation: user added lines 1487-1520 to instruction.md mid-conversation; settings elevated to top priority by user directive

Audit Log Viewer: existing logs page insufficient; rebuilt with filtering by entity type/action type/user

Branding Engine: branding-service.ts exists as separate page; needs linking into settings hub; CSS variable injection end-to-end not yet confirmed

Build order resequenced by user: original=Security(1)/Admin(2)/Client(3)/Pricing(4)/Branding(5)/Audit(6); final=SystemSettings(0)/Admin(1)/Client(2)/PricingLock(3)/Branding(4)/AuditLog(5)/Security(6)

---

# 10. TASK STATUS

DONE:
- System Settings Hub — all 11 tabs: GeneralTab/BookingTab/PaymentTab/PricingTab/AvailabilityTab/VehicleTab/ChatTab/NotificationsTab/BrandingTab/RolesTab/SystemBehaviorTab; settings-service.ts expanded; shell layout + shared helpers created; tsc clean; dev server confirmed
- Admin Dashboard — admin/dashboard/page.tsx rewritten with KPI cards/revenue chart/AP queue widget
- Client Dashboard — live notifications wired, 4 stat cards added, animated stepper added
- Pricing Lock (Rank 3) — price snapshot written at booking approval; implemented in staff-store.ts and admin-store.ts
- Audit Log Viewer (Rank 5) — comprehensive audit log system with before/after snapshots and filtering UI at /admin/audit-logs
- Branding Engine Completion (Rank 4) — full CSS variable injection for light/dark themes with scope toggles

NOT STARTED:
- Security Hardening (Rank 6) — service-account.json exposed, localStorage sessions, no middleware.ts; explicitly deferred by user

| Rank | Task | Status |
|------|------|--------|
| 0 | System Settings — all 11 tabs | DONE |
| 1 | Admin Dashboard Rework | DONE |
| 2 | Client Dashboard Upgrade | DONE |
| 3 | Pricing Lock on Approval | DONE |
| 4 | Branding Engine Completion | DONE |
| 5 | Audit Log Viewer UI | DONE |
| 6 | Security Hardening | NOT STARTED (deferred) |

---

# 11. AI RULES
- Do not assume missing logic — if behavior not explicitly defined, stop and ask
- Code vs spec conflict: stop, report both behaviors, ask clarification, do not guess
- All TSM transitions, pricing lock, booking validity enforced server-side — not client-side only
- RBAC enforced server-side at every action; client-side checks are supplemental only
- Every critical mutation logged with before/after snapshots when audit logging enabled
- Reason fields mandatory for overrides/refunds/cancellations/assignment changes — never skip
- Approved booking is the ONLY valid real reservation — never treat pending as confirmed
- Price snapshot written into booking record at lock time — no recalculation after lock
- Chat lifecycle: active > resolved > archived (read-only); delete only if explicitly configured
- refunded is terminal — no further payment transitions allowed
- You may use any antigravity skills from C:\Users\Owner\Documents\GitHub\QuickRide-Booking\ForAIUse like huashu-design for frontend design
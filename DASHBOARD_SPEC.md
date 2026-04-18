# Client Portal UI/UX Specification
## Forrest Car Rental Dashboard

---

## ✅ 1. Dashboard Overview

### Layout:
**Grid layout with 4 main sections**:
- Top: Page header + quick actions bar
- Row 1: 4 stat cards (2 column mobile / 4 column desktop)
- Row 2: Active rental status card (full width)
- Row 3: Recent activity timeline + quick search

### Data Fields:
| Stat Card | Value |
|---|---|
| 🚗 Active Rentals | Count / current vehicle name |
| 📅 Upcoming Bookings | Count / next booking date |
| ✅ Total Trips | Lifetime completed rentals |
| 💳 Total Spent | Lifetime transaction total |

### Empty State:
> 🎉 **Welcome to your dashboard!**
>
> You don't have any rentals yet. Browse our fleet to book your first vehicle.
>
> [ Browse Vehicles ]

---

## ✅ 2. My Bookings

### Layout:
**Tabbed interface with card view**:
- Filter tabs: All / Active / Upcoming / Completed / Cancelled
- Each booking: horizontal card with status indicator
- Action buttons: Extend, Cancel, View Details, Download Invoice

### Data Fields:
- Vehicle name and thumbnail
- Pickup date ↔ Return date
- Total price
- Status badge
- Booking ID
- Actions column

### Empty State:
> 🚗 **No bookings yet**
>
> Browse our fleet of premium vehicles and make your first reservation today.

---

## ✅ 3. Favorites

### Layout:
**Responsive grid (2/3/4 columns)**:
- Vehicle cards exactly matching main fleet styling
- Hover actions: Remove favorite / Book now
- Top actions: Clear all / Compare selected

### Data Fields:
- Vehicle image
- Vehicle name / specs
- Daily rate
- Quick book button
- Remove favorite button

### Empty State:
> ❤️ **No favorites saved**
>
> Save vehicles you're interested in so you can book them quickly later.
> Click the heart icon on any vehicle card to add it here.

---

## ✅ 4. Payments

### Layout:
**Two column split view**:
- Left: Saved payment methods (card tiles)
- Right: Transaction history table

### Data Fields:
#### Payment Methods:
- Card brand logo
- Last 4 digits
- Expiry date
- Default indicator
- Remove button

#### Transaction History:
- Date
- Booking reference
- Amount
- Status
- Download receipt button

### Empty State:
> 💳 **No payment methods saved**
>
> Save your card details for faster checkout on your next booking.

---

## ✅ 5. Notifications

### Layout:
**Inbox style list**:
- Unread indicator badge
- Dismiss / mark read controls
- Filter by type: All / Info / Success / Warning
- Bulk actions: Mark all as read / Clear all

### Data Fields:
- Timestamp
- Title
- Message body
- Read status
- Type icon

### Empty State:
> 🔔 **All caught up!**
>
> You have no unread notifications. We'll let you know when there are updates about your rentals.

---

## ✅ 6. Reviews

### Layout:
**List view with review cards**:
- Pending reviews for completed rentals first
- Past submitted reviews
- Edit / delete actions

### Data Fields:
- Vehicle
- Rental period
- Star rating
- Your comment
- Submitted date

### Empty State:
> ⭐ **No reviews yet**
>
> After you complete a rental you'll be able to leave a review to help other customers make better choices.

---

## ✅ 7. Profile Settings

### Layout:
**Vertical form sections**:
- Personal information
- Change password
- Notification preferences
- Danger zone (delete account)

### Data Fields:
- Full name
- Email address
- Phone number
- Driver license number
- Current password / New password / Confirm password
- Email notifications toggle
- SMS notifications toggle

---

## ✅ 8. Support Tickets

### Layout:
**Ticket list + thread view**:
- Open / Closed ticket filter tabs
- New ticket button
- Ticket list with status badges
- Conversation thread view when selected

### Data Fields:
- Ticket number
- Subject
- Status (Open / Pending / Closed)
- Created date
- Last message preview

### Empty State:
> 🎫 **No support tickets**
>
> If you need help with your booking or have questions about our service, create a new support ticket and our team will get back to you.

---

## 🎨 Design System
All pages follow these consistent rules:
- **Page header**: Large bold title + subtitle
- **Section spacing**: 24px vertical gap between components
- **Cards**: Rounded-xl (12px) with soft shadow
- **Buttons**: Green primary, white secondary, red danger
- **Status badges**: Pill shaped with solid background
- **Empty states**: Centered, large emoji icon

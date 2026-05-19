# QuickRide Booking - Website Documentation

## Overview
QuickRide Booking is a premium car rental service website serving Region 11 and SOCCSKSARGEN (Philippines). It provides transparent pricing, professional drivers, and a seamless multi-stage booking process.

## Tech Stack

### Frontend Framework
- **Next.js 16.1.3** - React framework with App Router
- **React 19.2.3** - UI library
- **TypeScript 5.9.3** - Type safety

### Styling & UI
- **Tailwind CSS 4.1.17** - Utility-first CSS
- **Framer Motion 11.18.2** - Animations
- **Lucide React 1.8.0** - Icon library
- **Leaflet 1.9.4** - Maps

### Backend & Database
- **Firebase 12.12.0** - Authentication, Firestore, Storage
- **Firebase Admin 13.8.0** - Server-side Firebase operations
- **Supabase 2.103.0** - Additional backend services

### Authentication & Security
- **JSON Web Token 9.0.3** - Token-based auth
- **bcryptjs 3.0.3** - Password hashing
- **cookie 1.1.1** - Cookie management

### Utilities
- **date-fns 4.1.0** - Date manipulation
- **clsx 2.1.1** - Conditional classes
- **tailwind-merge 3.5.0** - Tailwind class merging

### Testing
- **Playwright 1.52.0** - E2E testing

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Customer dashboard
│   ├── admin/             # Admin panel
│   ├── staff/             # Staff portal
│   ├── booking/           # Booking flow
│   ├── api/               # API routes
│   └── [other pages]      # About, Services, Fleet, etc.
├── components/            # React components
│   ├── fleet/            # Vehicle-related components
│   ├── forms/            # Form components
│   ├── layout/           # Layout components
│   ├── modals/           # Modal components
│   ├── providers/        # Context providers
│   └── ui/               # UI components
├── lib/                   # Services and utilities
│   ├── firebase.ts       # Firebase config
│   ├── types.ts          # TypeScript types
│   ├── booking-*.ts      # Booking services
│   ├── payment-service.ts
│   ├── notification-service.ts
│   ├── chat-service.ts
│   └── [other services]
├── styles/               # Global styles
└── assets/               # Static assets
```

## Main Pages & Routes

### Public Pages
- **/** - Landing page with hero section, fleet display, rental policies
- **/about-us** - About the company
- **/services** - Services offered
- **/fleet** - Vehicle fleet
- **/price-rates** - Pricing information
- **/search** - Search functionality
- **/support** - Customer support

### Authentication
- **/auth/login** - User login
- **/auth/signup** - User registration
- **/auth/forgot-password** - Password recovery
- **/auth/reset-password** - Password reset
- **/auth/logged-out** - Logout confirmation
- **/admin-login** - Admin login
- **/staff-login** - Staff login

### Customer Dashboard
- **/dashboard** - Main dashboard with stats and recent bookings
- **/dashboard/bookings** - Booking management
- **/dashboard/favorites** - Favorite vehicles
- **/dashboard/notifications** - Notification center
- **/dashboard/payments** - Payment history
- **/dashboard/reviews** - Review management
- **/dashboard/settings** - Account settings
- **/dashboard/support** - Support tickets
- **/dashboard/messages** - Chat/messages

### Admin Panel
- **/admin** - Admin dashboard
- **/admin/dashboard** - Admin overview
- **/admin/bookings** - Booking management
- **/admin/vehicles** - Fleet management
- **/admin/users** - User management
- **/admin/pricing** - Pricing configuration
- **/admin/locations** - Location management
- **/admin/levels** - Location levels
- **/admin/settings** - System settings
- **/admin/media** - Media management
- **/admin/notifications** - Notification management
- **/admin/messages** - Message management
- **/admin/audit-logs** - Audit trail
- **/admin/logs** - System logs
- **/admin/reports** - Reports
- **/admin/security** - Security settings

### Staff Portal
- **/staff** - Staff dashboard
- **/staff/bookings** - Booking assignments
- **/staff/messages** - Communication

### Other Pages
- **/booking** - Booking flow
- **/maintenance** - Maintenance page

## Key Features

### Booking System
- **Multi-stage booking process** with modern UI
- **Vehicle selection** from available fleet
- **Multi-destination support** - Plan complex trips across multiple cities
- **Dynamic pricing** based on:
  - Pickup location (Region 11, South Cotabato, Davao del Sur, outside Region 11)
  - Duration (12-hour or 24-hour blocks)
  - Car type
- **Driver options**:
  - Self-drive (requires valid driver's license)
  - Professional driver (+₱1,000 to base rate)
- **Price breakdown** with transparent calculations
- **Booking status workflow**: pending → approved → active → completed/cancelled
- **Booking editing** with approval workflow
- **Participant invites** for group bookings

### User Management
- **Role-based access control**:
  - Customer
  - Staff
  - Admin
- **Authentication** via Firebase Auth
- **Profile management** with:
  - Full name
  - Phone number
  - Driving license
  - Notification preferences
- **Loyalty program** with tier system based on completed trips

### Fleet Management
- **Vehicle catalog** with:
  - Name
  - Car type
  - Seats
  - Transmission
  - Year
  - Image
  - Availability status
- **Car types** configuration (driver-only vs self-drive allowed)
- **Vehicle availability** tracking

### Pricing System
- **Dynamic pricing engine** with:
  - Location-based rates
  - 12-hour and 24-hour block pricing
  - Hourly rate calculations
  - Scheduled pricing (promotional rates)
- **Price override** capability for admins
- **Transparent price breakdown** for customers

### Notifications
- **Real-time notifications** for:
  - Booking status updates
  - Reminders
  - Chat messages
  - System alerts
  - Promotions
- **Notification preferences** per user
- **Multi-channel**: in-app, email, SMS

### Chat/Messaging
- **Booking-based chat** between customers and staff
- **Support chat** for customer service
- **Real-time messaging**
- **Read receipts**

### Payment Processing
- **Payment service** integration
- **Payment history tracking**
- **Price locking** vs recalculation options

### Audit & Logging
- **Comprehensive audit logs** tracking:
  - User actions
  - Booking changes
  - System events
- **System error logging**
- **Activity tracking**

### Branding & Theming
- **Customizable branding**:
  - System name
  - Logo
  - Favicon
  - Login background
- **Light and dark themes** with extensive token system
- **Scope-based branding** (admin, staff, client, public pages)

### Settings Management
- **System settings** configuration
- **Booking form configuration** (custom fields, enabled features)
- **Location hierarchy management**
- **Pricing sheet management**

### Support System
- **Support ticket system**
- **Chat-based support**
- **Message management**

## Database Collections (Firestore)

### Core Collections
- **profiles** - User profiles and account data
- **vehicles** - Vehicle fleet information
- **car_types** - Vehicle type definitions
- **locations** - Pickup/dropoff locations
- **granular_locations** - Detailed location data with cities
- **bookings** - Booking records
- **pricing_rates** - Pricing configuration
- **notifications** - Notification records
- **chats** - Chat conversations
- **messages** - Chat messages
- **audit_logs** - Audit trail
- **system_logs** - System error logs
- **booking_invites** - Booking participant invites
- **settings** - System settings
- **branding** - Branding configuration
- **booking_form_config** - Booking form customization

## Key Services (src/lib/)

### Booking Services
- **booking-engine.ts** - Core booking logic and price calculation
- **booking-service.ts** - Booking CRUD operations
- **booking-price-service.ts** - Price calculation service
- **booking-access-service.ts** - Booking access control
- **booking-form-config.ts** - Form configuration

### User Services
- **auth-client.ts** - Client-side authentication
- **auth.ts** - Authentication utilities
- **staff-auth.ts** - Staff authentication
- **portal-auth.ts** - Portal authentication
- **session-service.ts** - Session management

### Fleet Services
- **vehicle-service.ts** - Vehicle management

### Pricing Services
- **pricing-engine.ts** - Pricing calculation logic
- **pricing.ts** - Pricing utilities

### Communication Services
- **notification-service.ts** - Notification management
- **chat-service.ts** - Chat functionality
- **support-service.ts** - Support ticket management

### System Services
- **payment-service.ts** - Payment processing
- **audit-log-service.ts** - Audit logging
- **error-service.ts** - Error handling
- **media-service.ts** - Media management
- **settings-service.ts** - Settings management
- **branding-service.ts** - Branding configuration
- **loyalty-service.ts** - Loyalty program
- **token-registry.ts** - Token management

### Admin Services
- **admin-store.ts** - Admin state management
- **staff-service.ts** - Staff management
- **staff-store.ts** - Staff state management
- **roles.ts** - Role definitions

### Utilities
- **firebase.ts** - Firebase initialization
- **db.ts** - Database connection
- **storage.ts** - Storage operations
- **utils.ts** - General utilities
- **api-utils.ts** - API utilities
- **dashboard-utils.ts** - Dashboard helpers
- **schedules.ts** - Scheduling utilities
- **types.ts** - TypeScript type definitions
- **constants/** - Constant values
- **mock-data.ts** - Mock data for testing

## UI Components

### Layout Components
- **Navbar** - Navigation bar
- **Footer** - Page footer
- **DashboardShell** - Dashboard layout wrapper

### Fleet Components
- **VehicleCard** - Vehicle display card

### Form Components
- **ModernBookingFlow** - Multi-step booking form

### Modal Components
- **BookingModal** - Booking modal wrapper

### UI Components
- **Card** - Card component with variants
- **Button** - Button component
- **MagneticButton** - Animated button
- And other UI components in components/ui/

## Key Features by User Role

### Customer
- Browse vehicle fleet
- Create bookings with multi-destination support
- Choose self-drive or professional driver
- View transparent pricing
- Track booking status
- Manage bookings
- Receive notifications
- Chat with support
- Leave reviews
- Earn loyalty points

### Staff
- View assigned bookings
- Communicate with customers via chat
- Update booking status
- Access staff dashboard

### Admin
- Full system management
- User management
- Fleet management
- Pricing configuration
- Location management
- Booking oversight
- Audit log access
- System settings
- Branding customization
- Reports and analytics

## Geographic Coverage
- **Primary**: Region 11 (Davao Region)
- **Extended**: SOCCSKSARGEN
- **Cities covered**: Multiple cities across regions
- **Pricing zones**: 
  - Gensan (General Santos)
  - South Cotabato
  - Davao del Sur
  - Outside Region 11

## Business Logic Highlights

### Pricing Model
- Block-based pricing (12hr/24hr blocks)
- Location-specific rates
- Driver fee: +₱1,000 for professional driver
- Hourly rate for partial blocks
- Scheduled/promotional pricing support

### Booking Workflow
1. User selects vehicle and locations
2. System calculates price based on location, duration, car type
3. User confirms booking
4. Booking status: pending
5. Admin reviews and approves
6. User pays (if applicable)
7. Booking status: approved
8. Vehicle pickup
9. Booking status: active
10. Trip completion
11. Booking status: completed

### Security Features
- Firebase Authentication
- Role-based access control
- Audit logging
- Secure session management
- Password hashing with bcrypt

## Development Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking
- `npm run test` - Run Playwright tests
- `npm run test:ui` - Run Playwright with UI

## Deployment
- **Vercel** configuration present (vercel.json)
- **Firebase** project: forrestcarrentsystem
- **Environment**: Production-ready with Next.js

## Testing
- **Playwright** for E2E testing
- Test configuration in playwright.config.ts
- Test results in test-results/

## Additional Notes
- Service account configured for Firebase Admin
- Global type definitions in global.d.ts
- ESLint configuration for code quality
- TypeScript configuration with strict mode
- PostCSS configuration for Tailwind
- Next.js configuration for optimization

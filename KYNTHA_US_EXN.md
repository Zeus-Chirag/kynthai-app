# KYNTHA US: COMPREHENSIVE EX-N FILE

## Executive Summary

Kynthai US is a HIPAA-conscious, India→US-adapted multi-role healthcare management platform built on Next.js 15 + Prisma/PostgreSQL. It serves five user roles (patient, doctor, lab, caretaker, admin) through five distinct portal UIs, with feature completeness estimated at 65-70%. The codebase exhibits thoughtful architecture, extensive demo-mode scaffolding, and layered security — but also carries significant technical debt, missing integrations, and UK-origin artifacts that need cleaning before US launch.

---

## Part 1: ARCHITECTURE MAP

### 1.1 Tech Stack

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| Framework | Next.js | 15.x, App Router |
| Language | TypeScript | Strict mode, no `any` types |
| Database | PostgreSQL | Neon serverless (`@neondatabase/serverless`) |
| ORM | Prisma | Custom schema with multi-role profiles |
| Styling | Tailwind CSS | v3, dark mode via `next-themes` |
| Components | shadcn/ui | Radix-based primitives |
| State | Zustand | `src/lib/store.ts` — auth, settings, offline queue |
| Animations | Framer Motion | Page transitions, sheet animations |
| Icons | Lucide React | 600+ icon imports across components |
| Video | LiveKit | WebRTC for doctor-patient video calls |
| Maps | Leaflet | Async import for pharmacy locator |
| Auth | Custom (JWT + bcrypt) | Session-based, CSRF tokens, rate limiting |
| AI | Claude API | Chat, clinical notes, symptom analysis, drug interactions |
| AI (free tier) | Alibaba DashScope | Llama fallback for free-tier users |
| Integrations | Google Generative AI | Medicine identification, drug DB |
| NHS/UK | Discourse + NHS App | Forum landing, UK doctor onboarding (Agreement J) |
| Messaging | Nostr | Nostr.build for client relay delivery |
| Alarms | Web Audio API | Two ringtone modes (professional chime / alert beep) |
| Offline | IndexedDB + Service Worker | Offline queue, pending sync |

### 1.2 Directory Structure

```
src/
├── app/
│   ├── api/                    # 50+ API route handlers
│   │   ├── auth/               # register, login, logout, csrf
│   │   ├── doctors/            # dashboard, patients, availability, prescriptions, notes, ai-notes, presence
│   │   ├── patients/           # dashboard, health logs, pulse
│   │   ├── medications/        # CRUD for medications
│   │   ├── reminders/          # CRUD + stats for reminders
│   │   ├── reminders/stats     # adherence statistics
│   │   ├── chat/               # AI chat (paginated, create, delete)
│   │   ├── notifications/      # list + mark-all-read
│   │   ├── labs/               # lab profiles + verification
│   │   ├── lab-bookings/       # CRUD for lab test bookings
│   │   ├── lab-results/        # lab result management
│   │   ├── family/             # family members, invite, pulse
│   │   ├── emergency/          # emergency alerts
│   │   ├── emergency-sos/      # SOS trigger logging
│   │   ├── admin/              # stats, users, doctors, labs, complaints, fraud, revenue
│   │   ├── marketplace/        # pharmacy/products
│   │   ├── orders/             # order management
│   │   ├── referrals/          # referral code system
│   │   ├── complaints/         # complaint/grievance filing
│   │   ├── refunds/            # refund requests
│   │   ├── challenges/         # weekly challenges
│   │   ├── attendance/         # doctor attendance tracking
│   │   ├── upload/             # file uploads
│   │   ├── config/             # public config endpoint
│   │   └── user/               # data-export, consent, account deletion, notification-prefs
│   ├── portal/                 # role-based portal pages
│   │   ├── patient/            # PatientApp, PatientCare, HealthTracker
│   │   ├── doctor/             # DoctorApp, DoctorDashboard, DoctorVerification
│   │   ├── caretaker/          # CaretakerApp, FamilyTab, SosTab
│   │   ├── lab/                # LabApp, LabVerification, LabDashboard
│   │   └── admin/              # AdminDashboard, AdminLogin
│   ├── login/                  # LoginClient with demo buttons
│   ├── register/               # Registration with role selection + consent
│   ├── pricing/                # Subscription plans (Plus, Family Pro)
│   └── layout.tsx, page.tsx    # Root layout and landing page
├── components/
│   ├── kynthai/                 # 48 shared component files
│   │   ├── logo.tsx            # Kynthai brand mark
│   ├── medication/             # Medication-specific components
│   │   ├── ai-chat.tsx         # Chat UI with pagination + free-tier gating
│   │   ├── medications-list.tsx # CRUD medication management
│   │   ├── today-view.tsx      # Daily reminders with in-app alarm
│   │   ├── health-insights.tsx # AI health insights
│   │   ├── drug-interactions.tsx # Drug-drug interaction checker
│   │   ├── symptom-analyzer.tsx # AI symptom analysis
│   │   ├── identify-medicine.tsx # Pill photo identification
│   │   ├── search-medicine.tsx # Web search for medicine info
│   │   ├── add-medication.tsx  # Medication creation form
│   │   ├── prescription-scanner.tsx # AI extraction from prescription photos
│   │   ├── health-tracker.tsx  # Chronic condition tracking
│   │   └── patient-care.tsx    # Doctor-side patient management + prescribing
│   ├── ui/                     # shadcn/ui components (40+ primitives)
│   ├── video/                  # LiveKit video call UI
│   └── legal/                  # Privacy policy, medical disclaimer
├── lib/
│   ├── db.ts                   # Direct Prisma DB connection
│   ├── store.ts                # Zustand store (auth + UI state)
│   ├── supabase/               # Supabase types (partial migration)
│   ├── commission.ts           # Platform fee/loyalty tier calculations
│   ├── currency.ts             # INR/USD pricing with exchange rates
│   ├── greeting.ts             # Time-based greeting generator
│   ├── i18n.ts                 # EN/HI internationalization
│   ├── medicine-db-cache.ts    # Built-in medicine database (20+ drugs)
│   ├── alarm.ts                # Web Audio API alarm system
│   ├── offline-queue.ts        # Offline-first sync queue
│   ├── videocall.ts            # LiveKit helper
│   └── utils.ts                # cn() helper
├── prisma/
│   └── schema.prisma           # Full database schema (25+ models)
└── supabase/
    └── types.ts                # Generated Supabase types (partial migration)
```

### 1.3 Database Schema (25+ Models)

**Core Identity:**
- `User` — email, name, role (patient/doctor/lab/admin/caretaker), phone, DOB, emergency contacts, consent flags (data_processing, terms_of_service, hipaa, ai_training), verified, is_demo, language, alarm settings

**Role Profiles:**
- `DoctorProfile` — specialization, license, experience, consultationFee, city, bio, videoCallEnabled, verified
- `PatientProfile` — emergency contact, blood group, height, weight, allergies
- `LabProfile` — lab name, license, city, address, homeCollection, verified
- `CaretakerProfile` — relationship to patient
- `AdminProfile` — admin-specific fields

**Medication & Reminders:**
- `Medication` — name, dosage, times[], frequency, instructions, notes, active, color, familyMemberId
- `Reminder` — medicationId, date, time, status (pending/taken/skipped), familyMemberId
- `ReminderLog` — daily medication status log

**Clinical:**
- `Appointment` — patient/doctor IDs, time, date, type (video/in-person), status, fee
- `Prescription` — doctorId, patientId, medications[], followUpDate, status
- `PrescriptionMedication` — name, dosage, frequency
- `LabBooking` — labId, patientId, tests[], status, travelFee, scheduledAt
- `LabResult` — bookingId, results{}, status
- `HealthLog` — user daily health entries with BP, sugar, weight, mood, symptoms

**Family:**
- `Family` — family group with member limit check
- `FamilyMember` — name, relation, age, email, phone, addedBy

**Communication:**
- `Chat` — user chat sessions
- `ChatMessage` — role (user/assistant), content, timestamp
- `Notification` — channel, type, title, body, status, read
- `ConsultationNote` — doctor notes for patients (observation/diagnosis/follow-up)

**Commerce & Admin:**
- `Product` — marketplace products
- `Order` — patient orders
- `Referral` — referral codes with usage tracking + 30-day cooldown
- `Complaint` — user complaints/grievances
- `RefundRequest` — refund tracking
- `Challenge` — weekly challenges
- `AttendancePeriod` — doctor attendance tracking
- `RawSync` / `PendingSync` — offline sync queue
- `EmergencyContact` — emergency contacts (E2EE encrypted)

---

## Part 2: PORTAL INVENTORY

### 2.1 Patient Portal (Most Complete)

**Main App**: `PatientApp` (home view)
- Bottom tab navigation: Home, Meds, Market, Ask AI, Tools, Family Alert
- Daily Priorities card (AI-generated from health pulse)
- Weekly Challenge card (gamification)
- Notification center dropdown
- Health insights, drug interactions, symptom analyzer, medicine identification/search

**PatientCare** (`src/components/kynthai/patient/patient-care.tsx`):
- Video consultation listing + booking
- Prescription management (sent/accepted/expired)
- Doctor availability calendar
- Patient adherence tracking

**ProfileHub** (`profile-hub.tsx`):
- Identity card with tier badge (Free/Plus/Family Pro)
- Health score ring with pulse data
- Subscription management
- Dark mode toggle
- Notification preferences (5 categories)
- Consent manager (3 toggles with revert on failure)
- Language selector (EN only currently)
- Data export (JSON download)
- Account deletion (with 7-day cooldown)
- Portal switching
- Referral dashboard
- Complaint filing
- Privacy & security settings

**PrescriptionsCard**:
- Displays incoming prescriptions from doctors
- Accept flow → adds medications to Meds list
- Demo: shows Dr. Anjali Mehta with Metformin + Atorvastatin

### 2.2 Doctor Portal

**DoctorDashboard** (2040 lines — largest component):
- Overview: stats, paywall (Free/Pro), loyalty tier card, quick analytics
- Appointments tab: list with search, accept/decline/start call/mark complete
- Patients tab: adherence tracking, patient profiles, prescribe flow
- Prescriptions tab: history with PDF download + AI clinical notes generation
- Multi-language (EN/HI)
- Availability editor (weekly schedule with time slots)
- Pricing/earnings breakdown with loyalty commission
- Video call toggle + LiveKit integration

**Commission System** (`src/lib/commission.ts`):
- Base fee: 20% (doctors), 15% (labs)
- Loyalty tiers: Bronze (0%), Silver (1%), Gold (2%), Platinum (3%) discounts
- `effectiveFeePct(baseFee, tier)` computes fee with loyalty discount
- `platformFee(gross, feePct)` computes platform commission
- `partnerKeeps(gross, feePct)` computes what partner receives
- `resolveTier(lifetimeOrders)` maps orders to tier
- Payout policy: monthly, minimum $50, via bank transfer/PayPal

**AI Clinical Notes**: Transforms visit transcripts into structured observation/diagnosis/follow-up notes

### 2.3 Caretaker Portal

**CaretakerApp** (1507 lines):
- 6 tabs: Family, Meds, Find Care, Ask AI, Tools, Family Alert
- Family management: add members, view adherence
- Member medications: per-family-member medication viewing + status updates
- Lab booking management (confirm/cancel/refund)
- Emergency SOS: Critical (911+doctors+contacts) and Family Alert tiers
- Health circle: family member health pulse visualization
- Offline queue for medication updates

### 2.4 Lab Portal

**LabApp**:
- Loading → verification form → verified dashboard flow
- Demo: Kynthai Diagnostic Center with 6 test offerings
- LabVerification: license upload, city, address, home collection toggle
- LabDashboard: bookings, results management

### 2.5 Admin Portal

**AdminDashboard** (1049 lines):
- 5 tabs: Revenue, Doctors, Labs, Retention, Fraud
- Revenue: platform commission, avg take rate, sub MRR, partner leaderboard with loyalty tiers
- Doctor applications: review + approve/reject with documents
- Lab applications: same review flow
- Churn risks: high/medium/low engagement alerts
- Fraud flags: automated flagging for manual review
- Review dialog with document preview + rejection reason

---

## Part 3: SECURITY ARCHITECTURE

### 3.1 Authentication & Authorization
- Custom session-based auth (no OAuth)
- bcrypt password hashing
- CSRF tokens on all state-changing operations
- Rate limiting with per-IP tracking + blocking after threshold
- `isIpBlocked` fails closed (returns 403 on DB error)
- Session configuration via env vars

### 3.2 HIPAA Compliance
- 4 consent flags on registration: terms_of_service, data_processing, hipaa, ai_training
- 3 additional consent toggles in ProfileHub (Terms, Data Processing, AI Training)
- AI features disabled client-side when ai_training_consent = false
- Medical disclaimer on all AI chat + AI features
- Audit trail for consent changes
- E2EE on emergency contacts (age-based encryption)
- Data export: full JSON download of user's health data
- Account deletion: permanent with 7-day cooldown

### 3.3 Input Validation & Protection
- Timing-safe comparison for invite tokens (replaces `===`)
- Rate limit bucket state encapsulated (no module-level mutation)
- No demo passwords hardcoded (configurable via env var)
- Register returns 200 (not 409) to prevent account existence enumeration
- Toxiproxy mentioned for chaos testing in CI

### 3.4 Data Protection
- Encrypted emergency contacts (age encryption)
- CSRF on all mutation endpoints
- `credentials: 'include'` for session cookies
- X-CSRF-Token header on write operations
- Offline queue with pending sync (RawSync/PendingSync tables)

### 3.5 Missing Security Items
- No OAuth/OIDC (solely email/password)
- No 2FA/MFA
- No WebAuthn
- No audit logging for admin actions
- Google Drive used for PDF generation (external dependency for PHI)

---

## Part 4: FEATURE COMPLETENESS ASSESSMENT

### 4.1 Fully Implemented (with demo data)
| Feature | Status | Notes |
|---------|--------|-------|
| Multi-role registration + login | ✅ | 5 roles, consent flow, CSRF |
| Patient medication management | ✅ | CRUD, reminders, adherence |
| Doctor dashboard + appointments | ✅ | Accept/decline/complete, video calls |
| Lab bookings + verification | ✅ | Booking flow, lab dashboard |
| Admin dashboard (revenue, reviews) | ✅ | Commission, loyalty, fraud flags |
| Caretaker family management | ✅ | Add members, alerts, SOS |
| AI Chat (Claude) | ✅ | Paginated, free-tier gating, demo mode |
| AI Clinical Notes | ✅ | Doctor-side AI note generation |
| Drug Interactions | ✅ | Client-side checking |
| Symptom Analysis | ✅ | AI-powered with red flags |
| Medicine Identification | ✅ | Photo upload + AI |
| Video Consultations | ✅ | LiveKit WebRTC |
| Emergency SOS | ✅ | Critical + Family alert tiers |
| Notification System | ✅ | 5 types, mark-all-read |
| Offline Queue | ✅ | IndexedDB + service worker |
| Subscription Tiers | ✅ | Free/Plus/Family Pro |
| Loyalty Tiers (doctors) | ✅ | Bronze→Platinum with fee discounts |
| Commission System | ✅ | Base fees + loyalty discounts + payout policy |
| Referral System | ✅ | 30-day cooldown, dashboard |
| Complaint System | ✅ | Filing + admin review |
| Refund Requests | ✅ | Lab + appointment refunds |
| Weekly Challenges | ✅ | Gamification with progress |
| Daily Priorities | ✅ | AI-generated from health pulse |
| Health Score | ✅ | Pulse ring visualization |
| Data Export | ✅ | Full JSON download |
| Account Deletion | ✅ | With 7-day cooldown |
| Consent Management | ✅ | 3 toggles with revert on failure |
| Prescription PDF | ✅ | HTML generation |
| AI Prescription Scanner | ✅ | Photo → extracted medications |
| NHS Forum Landing Page | ✅ | Discourse integration (UK) |
| NHS App Booking | ✅ | UK NHS app system (UK) |
| Dark Mode | ✅ | next-themes |
| Multi-language (EN/HI) | ✅ | Partial i18n |

### 4.2 Partial / Needs Work
| Feature | Status | Notes |
|---------|--------|-------|
| Medicine Database | 🟡 | 20+ drugs hardcoded; needs expansion |
| Lab Results | 🟡 | API exists but UI is minimal |
| Pharmacy Marketplace | 🟡 | Product listing, no cart/checkout |
| Health Tracker (chronic) | 🟡 | Static demo data, no real persistence |
| Care Journey Timeline | 🟡 | Demo data only |
| Family Pulse API | 🟡 | API works, demo fallback available |
| Nostr Integration | 🟡 | Integration exists but unclear if functional |
| Google Drive PDF | 🟡 | External dependency, potential PHI issue |

### 4.3 Missing / Not Implemented
| Feature | Status | Notes |
|---------|--------|-------|
| Stripe Payment Processing | ❌ | Referenced in code but not integrated |
| Real-time Notifications (WebSocket) | ❌ | Polling-based only |
| Push Notifications | ❌ | No service worker push |
| Email/SMS Notifications | ❌ | API accepts but no delivery |
| Doctor Availability Calendar (patient view) | ❌ | Doctor can edit, patients can't book via calendar |
| Progress Note Templates | ❌ | Free-text only |
| ICD-10/CPT Coding | ❌ | No medical coding |
| Insurance Verification | ❌ | Not US-market ready |
| EHR Integration | ❌ | No HL7/FHIR |
| Telemedicine State Compliance | ❌ | No state-by-state licensing check |
| Billing/Invoicing | ❌ | No real payment flow |
| Insurance Claims | ❌ | Not implemented |
| Lab Equipment Integration | ❌ | No HL7 interface |
| OCR for Lab Reports | ❌ | Manual entry only |
| Patient Portal Invites (email) | ❌ | Simulated only |
| Audit Logging | ❌ | No comprehensive audit trail |
| Admin Action Audit | ❌ | Admin actions not logged |
| HIPAA BAA | ❌ | Not in code |

---

## Part 5: UK → US TRANSITION ISSUES

### 5.1 UK Artifacts to Remove/Replace
1. **NHS Forum Landing** (`src/app/forum/page.tsx`) — UK-specific Discourse embed, replace with US health community or remove
2. **NHS App Booking** — UK-only NHS app integration, completely irrelevant for US
3. **Currency defaults** — `src/lib/currency.ts` has both INR and USD; verify USD is the primary
4. **"Dr. Kynthai" naming** — AI assistant references UK-style naming; fine for US but verify branding
5. **Agreement J signing** — UK-specific doctor onboarding (Agreement J signing), replace with US medical license verification (NPI number, state medical board check)

### 5.2 US Market Requirements
1. **State Medical Board Verification** — Replace UK license verification with US state-by-state medical board checks, NPI registry lookup
2. **State Telemedicine Licensure** — US requires doctors to be licensed in the patient's state for video consultations
3. **HIPAA BAA** — Need Business Associate Agreement flow for AI providers (Claude, Google AI)
4. **Insurance Integration** — US patients expect insurance verification before appointments
5. **Stripe Payments** — Must integrate real payment processing (currently simulated)
6. **State-by-State Lab Licensing** — Lab CLIA certificates vary by state
7. **US Address Validation** — ZIp code validation, state selection
8. **US Phone Format** — Currently shows US format but verify E.164 compliance

---

## Part 6: TECHNICAL DEBT

### 6.1 Code Quality Issues
1. **Largest files**: `doctor-dashboard.tsx` (2040 lines), `caretaker-app.tsx` (1507 lines) — need component extraction
2. **Demo data scattered**: Hardcoded demo objects in 10+ components; should be centralized
3. **Imports not sorted**: Inconsistent import ordering across files
4. **Magic numbers**: Fee percentages, patient caps, reminder intervals scattered
5. **Type safety**: Uses `Record<string, unknown>` casts in several API response parsers
6. **Unused code**: `ecc:ck` agent references suggest this was a coding exercise project
7. **Console.log statements**: Present in production code (e.g., `console.warn('Family fetch failed')`)
8. **Alert() calls**: ProfileHub uses `alert()` for account deletion and data export errors — should use toast

### 6.2 Missing Infrastructure
1. No test suite (no `__tests__/` directory found)
2. No CI/CD configuration visible
3. No Docker Compose file for deployment (mentioned in CLAUDE.md but not found)
4. No error monitoring (Sentry, etc.)
5. No analytics/tracking
6. No performance monitoring
7. No API versioning strategy

### 6.3 Performance Concerns
1. **Large component bundles**: CaretakerApp + DoctorDashboard are each ~50KB+ of JS
2. **No code splitting**: Most portal components load eagerly
3. **Framer Motion everywhere**: Heavy animation library on every page
4. **Multiple `useEffect` cascades**: Some components have 5+ effects firing on mount
5. **N+1 API calls**: CaretakerApp fires parallel per-member reminder fetches (mitigated with Promise.all)

---

## Part 7: DEPLOYMENT & OPERATIONS

### 7.1 Environment Variables Required
```
DATABASE_URL=...           # Neon PostgreSQL
NEXTAUTH_SECRET=...        # Session encryption
NEXTAUTH_URL=...           # Base URL
CLAUDE_API_KEY=...         # Anthropic (primary AI)
ALIBABA_API_KEY=...        # DashScope (free-tier fallback)
GOOGLE_API_KEY=...         # Medicine identification
LIVEKIT_API_KEY=...        # Video calls
NEXT_PUBLIC_LIVEKIT_URL=... # LiveKit server
EMAIL_SERVER=...           # Email delivery (not implemented client-side)
STRIPE_SECRET_KEY=...      # Payments (not implemented)
```

### 7.2 Database Migration Strategy
- Prisma migrations in `prisma/migrations/`
- Neon serverless requires connection pooling
- No seed script visible; demo data is client-side only

---

## Part 8: EXECUTION NOTES FOR CONTINUATION

### 8.1 Immediate Priorities (Before US Launch)
1. Remove UK artifacts (NHS forum, NHS app, Agreement J)
2. Replace medical license verification with NPI/state board lookup
3. Integrate Stripe for real payments
4. Add HIPAA BAA flow for AI providers
5. Implement state-by-state telemedicine compliance
6. Add proper audit logging

### 8.2 Code Quality Improvements
1. Extract `doctor-dashboard.tsx` into smaller components
2. Centralize demo data into a single `demo-data.ts` module
3. Sort imports with `eslint --fix`
4. Remove `console.log` statements
5. Replace `alert()` calls with toast notifications

### 8.3 Feature Gap Priorities
1. Real email/SMS notifications (not simulated)
2. Patient portal for booking via doctor calendar
3. Insurance verification flow
4. Progress note templates
5. ICD-10 coding for prescriptions
6. Service worker for push notifications

---

## Part 9: EX-N QUICK REFERENCE

### Authentication Flow
```
Registration → Role Selection → Consent (4 flags) → Password → Session cookie
Login → Email/Password → CSRF token → Session
Demo Login → is_demo=true → No session → Demo profiles in memory
```

### API Layer
- **Framework**: Next.js Route Handlers (`app/api/`)
- **Auth**: Custom session middleware, CSRF on mutations
- **Validation**: No Zod/Joi — basic inline checks
- **Error Handling**: Try/catch with `res.json().catch(() => ({}))` pattern
- **Rate Limiting**: Per-IP token bucket, blocking in memory

### UI Architecture
- **Portal routing**: Conditional rendering based on `user.role` from Zustand store
- **Shared components**: 48 files in `src/components/kynthai/`
- **Mobile-first**: Responsive with `sm:` breakpoints, bottom nav on mobile
- **Dark mode**: `next-themes` with CSS variables
- **Animations**: Framer Motion for page transitions + list animations

### State Management
```
Zustand Store:
- auth: user object, login/logout, login state
- screen: current portal screen
- online: doctor online/offline status
- language: 'en-US' | 'hi-IN'
- offlineQueue: pending sync operations
- alarmEnabled, alarmMode: notification settings
```

---

*Generated from full codebase audit. Last updated: 2026-07-17*

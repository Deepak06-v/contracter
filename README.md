# BuildLedger — Construction Site Ledger MVP

A mobile-first construction site transaction management web application built for contractors and site agents. BuildLedger centralizes the workflow of receiving WhatsApp photos of cement bills, sand deliveries, daily wages, and equipment rentals into a single, reliable digital ledger.

---

## 1. Executive Summary & Architecture

BuildLedger replaces unorganized WhatsApp bill exchanges and manual paper calculation with an auditable, role-based web ledger:

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios, React Router v7.
  - Fully mobile-first design with touch-friendly controls, responsive tables, quick action drawers, and camera/upload support.
- **Backend:** Node.js, Express, TypeScript.
  - Strict JWT session authentication, layered authorization middleware, Zod/Mongoose validations, and Multer file streaming.
- **Database:** MongoDB with Mongoose ODM.
  - Models for `User`, `Site`, and `Transaction` with compound indexing and aggregation pipelines for instant financial reporting.
- **Photo Storage Abstraction:**
  - Pluggable storage architecture (`StorageService`) supporting **Local Disk** (development & on-premise) and **Cloudinary** (production cloud storage).
  - Proof images are served **strictly through authenticated backend routes** (`/api/transactions/:id/photo`) with site access checks; no open public directories.
- **Financial Calculations:**
  - Safe 2-decimal rounded minor-unit currency calculations avoiding floating-point drift.
  - Automated product suggestion (`quantity * unitPrice`) and **intelligent discrepancy detection** when receipt totals differ (e.g. freight/unloading charges included).
  - Derived payment statuses (`Paid`, `Partially Paid`, `Unpaid`) and outstanding balances formatted in Indian Rupees (₹).

---

## 2. User Roles & Permission Matrix

| Capability | Contractor (Admin) | Site Agent | Enforcement Level |
|---|---|---|---|
| **Login / Authentication** | Full Admin credentials | Restricted credentials issued by contractor | JWT verified on every API request |
| **View Construction Sites** | All sites across the firm | **Only assigned sites** | Backend query scoped to `assignedAgents` |
| **Create / Edit / Delete Sites** | Full access | ❌ Forbidden (403) | `requireContractor` middleware |
| **Agent Account Management** | Create agents, assign sites, toggle status | ❌ Forbidden (403) | `requireContractor` middleware |
| **View Site Ledgers** | Full access across all sites | **Only assigned sites** | Backend site access verification |
| **Record New Transaction** | Any site | **Only assigned sites** | Backend checks `assignedAgents` before save |
| **Upload Photo Evidence** | Supported (JPEG, PNG, WebP) | **Mandatory** on new transactions | Multer validator + StorageService |
| **Edit / Delete Transactions** | Full access | **Only assigned sites** | Backend site check before mutation |
| **View Proof Photos** | Any transaction | **Only transactions of assigned sites** | `/api/transactions/:id/photo` verifies ownership |
| **Export CSV Reports** | All or filtered transactions | **Only assigned site records** | Server-side query filter + Excel BOM |

---

## 3. Database Schema

### `User` Model
- `name`: String (required, max 100)
- `email`: String (required, unique, lowercase)
- `password`: String (bcrypt hashed, min length 6, excluded from queries)
- `role`: Enum (`'contractor' | 'agent'`)
- `isActive`: Boolean (default `true`)
- Timestamps (`createdAt`, `updatedAt`)

### `Site` Model
- `name`: String (required, max 150)
- `code`: String (optional uppercase identifier, e.g. `SITE-BLR-01`)
- `location`: String (required)
- `description`: String (optional)
- `assignedAgents`: Array of ObjectIds (ref: `User`)
- `status`: Enum (`'active' | 'completed'`)
- Compound indexes: `{ assignedAgents: 1 }`, `{ status: 1 }`

### `Transaction` Model
- `site`: ObjectId (ref: `Site`, required, indexed)
- `date`: Date (required, indexed)
- `title`: String (required, e.g. "Ultratech Cement Delivery - 200 Bags")
- `category`: Enum (`'Materials' | 'Labour' | 'Transport' | 'Equipment' | 'Miscellaneous'`)
- `materialName`: String (optional)
- `quantity`: Number (optional)
- `unit`: String (optional, e.g. `bags`, `kg`, `tonnes`, `truckloads`, `days`, `hours`)
- `unitPrice`: Number (optional, in ₹)
- `totalAmount`: Number (required, > 0, in ₹)
- `amountPaid`: Number (default `0`, <= `totalAmount`)
- `paymentStatus`: Enum (`'Paid' | 'Partially Paid' | 'Unpaid'`)
- `supplier`: String (optional payee name)
- `notes`: String (optional remarks)
- `proofPhoto`: Subdocument:
  - `storage`: `'local' | 'cloudinary'`
  - `filename`: String
  - `originalName`: String
  - `path`: String
  - `mimetype`: String
  - `size`: Number
- `createdBy`: ObjectId (ref: `User`)
- `lastEditedBy`: ObjectId (ref: `User`)
- Compound indexes: `{ site: 1, date: -1 }`, `{ site: 1, category: 1 }`, `{ date: -1 }`

---

## 4. API Routes Summary

### Authentication (`/api/auth`)
- `POST /api/auth/login` — Authenticate email & password, returns JWT token and user profile
- `POST /api/auth/logout` — Logout session
- `GET /api/auth/me` — Return authenticated user profile

### Sites Management (`/api/sites`)
- `GET /api/sites` — List sites (Contractor gets all; Agent gets only assigned sites)
- `GET /api/sites/:id` — Get site details and live financial summary (Verifies site assignment)
- `POST /api/sites` — *(Contractor only)* Create new site
- `PUT /api/sites/:id` — *(Contractor only)* Update site details and agent allocations
- `DELETE /api/sites/:id` — *(Contractor only)* Delete site (Blocked if site contains transactions)

### Agent Management (`/api/agents`) — *Contractor Only*
- `GET /api/agents` — List all registered agents with their active site assignments
- `POST /api/agents` — Create an agent with name, email, initial password, and site assignments
- `PUT /api/agents/:id` — Update agent profile, email, and synchronize site assignments
- `PUT /api/agents/:id/status` — Toggle agent active/deactivated status

### Transaction Ledger (`/api/transactions`)
- `GET /api/transactions` — Query transactions with filters (`siteId`, `startDate`, `endDate`, `category`, `paymentStatus`, `search`, `sortBy`, `sortOrder`). Restricted to assigned sites for agents.
- `GET /api/transactions/:id` — View full transaction details (Verifies site authorization)
- `GET /api/transactions/:id/photo` — Stream photo proof with authentication and access checks
- `POST /api/transactions` — Record new transaction with multipart photo upload
- `PUT /api/transactions/:id` — Update transaction with optional photo replacement
- `DELETE /api/transactions/:id` — Delete transaction and safely delete proof image from disk/cloud

### Reports & Export (`/api/reports`)
- `GET /api/reports/transactions/export` — Stream Excel-compatible CSV with UTF-8 BOM, sanitized against formula injection

### Dashboard Overview (`/api/dashboard`)
- `GET /api/dashboard/stats?period=all` — Period-filtered KPIs (Active sites, Total Spent, Paid, Outstanding, Recent Transactions, Site summaries)

---

## 5. Environment Variables & Configuration

### Backend (`backend/.env` & `backend/.env.example`)
```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# MongoDB Connection
MONGODB_URI=mongodb://127.0.0.1:27017/construction_ledger_demo

# JWT Secret & Expiry
JWT_SECRET=super_secret_jwt_key_for_development_replace_in_production
JWT_EXPIRES_IN=7d

# Storage Provider ('local' or 'cloudinary')
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=8

# Cloudinary (Required only if STORAGE_PROVIDER=cloudinary)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Demo Seeding Credentials
DEMO_SEED_ENABLED=true
DEMO_CONTRACTOR_EMAIL=contractor@example.com
DEMO_CONTRACTOR_PASSWORD=Contractor@123
DEMO_AGENT_EMAIL=agent@example.com
DEMO_AGENT_PASSWORD=Agent@123
```

### Frontend (`frontend/.env` & `frontend/.env.example`)
```env
# Public backend API endpoint
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 6. Installation & Local Run Commands

### 1. Install all dependencies:
```bash
npm run install:all
```
*(Or run `npm install` inside `backend/` and `frontend/` directories respectively).*

### 2. Seed demo database:
```bash
npm run seed
```
This idempotently populates:
- 1 Contractor account
- 2 Agent accounts
- 3 Construction sites with distinct agent allocations
- 8 Sample realistic transactions across Materials, Labour, Transport, Equipment, and Miscellaneous with proof images

### 3. Start development servers:
In terminal 1 (Backend):
```bash
npm run dev:backend
```
In terminal 2 (Frontend):
```bash
npm run dev:frontend
```
Open **`http://localhost:5173`** in your browser or phone browser.

---

## 7. How to Demonstrate User Permissions & Workflows

### Demo Credentials
| Role | Email | Password | Assigned Sites |
|---|---|---|---|
| **Contractor** | `contractor@example.com` | `Contractor@123` | **All 3 Sites** (Sarjapur, Whitefield, Kanakapura) |
| **Agent 1 (Ramesh)** | `agent@example.com` | `Agent@123` | **Site 1 & Site 3** (Greenfield Heights & Prestige Villa) |
| **Agent 2 (Suresh)** | `agent2@example.com` | `Agent2@123` | **Site 2 & Site 3** (Apex Commercial & Prestige Villa) |

*(The login screen provides **1-Click Demo Buttons** for instant one-click testing of each account).*

### Verification Steps:
1. **Contractor View:**
   - Log in as Contractor.
   - Observe Dashboard totals, site financial breakdowns, and recent transactions.
   - Open **Sites Management**: view and manage all 3 sites.
   - Open **Agents Management**: inspect agent site assignments or toggle an agent's active status.
   - Open **All Transactions**: filter by category, payment status, or date; export CSV.
2. **Agent 1 (Ramesh) View:**
   - Log out and log in as Agent 1.
   - Notice that Dashboard & Agent Management links are hidden.
   - In **My Assigned Sites**, only **Site 1** and **Site 3** appear. **Site 2 is completely hidden.**
   - Open **Site 1 Ledger**: click "+ Record Expense", fill in receipt details, snap/upload a proof photo, and save.
   - Open the transaction to view the high-resolution proof image.
3. **Cross-Site Access Control Verification:**
   - Attempting to access Site 2 via URL `/sites/<site2_id>` or API `/api/sites/<site2_id>` as Agent 1 immediately returns **`403 Forbidden: Access denied. You are not assigned to this site.`**
4. **Calculations & Discrepancy Alert:**
   - When recording an expense, enter Quantity = `10` and Unit Price = `500`. The suggested total auto-calculates to `5,000`.
   - Change Total Amount to `5,400` (e.g. freight added). Notice the amber **Discrepancy Alert banner** cleanly warning of the difference without blocking the bill entry.
5. **CSV Export:**
   - Click "Export CSV" on the ledger. The generated file includes the Excel UTF-8 BOM, properly formatted amounts in INR, and respects all active date and category filters.

---

## 8. Automated Testing

The backend includes an end-to-end test suite (`backend/src/tests/api.test.ts`) covering:
- Authentication & session security (login, bad password rejection, JWT validation).
- Role-based authorization & agent restriction to assigned sites.
- Cross-site isolation (blocking unassigned agents with 403 status).
- Financial math: payment status derivation, outstanding balances, and price discrepancy detection.
- Transaction creation with photo proof upload and authenticated photo streaming.
- Rejection of transactions missing proof images.
- Safe CSV generation with Excel UTF-8 BOM.

Run the test suite:
```bash
npm run test:backend
```

Result:
```
✓ src/tests/api.test.ts (16 tests)
Test Files  1 passed (1)
Tests       16 passed (16)
```

---

## 9. Production Deployment Readiness

- **Frontend Hosting:** Vercel, Netlify, or AWS S3/CloudFront. Set environment variable `VITE_API_BASE_URL` to your production backend URL.
- **Backend Hosting:** Render, Railway, Google Cloud Run, or AWS ECS. Configure production environment variables in the host dashboard.
- **Permanent Cloud Storage:** Set `STORAGE_PROVIDER=cloudinary` and configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Local storage is retained for local development and demos.
- **Database:** MongoDB Atlas cluster with connection string set in `MONGODB_URI`.
- **CORS:** Configured dynamically via `CLIENT_URL` to restrict requests strictly to the production frontend domain.

---

## 10. Explicitly Out of Scope (Future Phases)

As specified in the MVP requirements:
- WhatsApp API automated webhook ingestion.
- AI / OCR automatic receipt text extraction.
- Online payment processing and gateway integration.
- GST accounting software and tax filing.
- Native mobile app store releases (PWA & responsive mobile web prioritized).
#   c o n t r a c t e r  
 
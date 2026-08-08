# 💼 Teqfocus Enterprise Portal (Next.js 14 + Salesforce JWT Integration)

[![Salesforce DX](https://img.shields.io/badge/Salesforce-DX-blue.svg)](https://developer.salesforce.com/tools/sfdxcli)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![OAuth 2.0 JWT](https://img.shields.io/badge/OAuth2-JWT_Bearer-green.svg)](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_jwt_flow.htm)

An enterprise-grade full-stack solution featuring a **Next.js 14 web portal** integrated with **Salesforce DX core metadata** (`time-sheet` org). The portal connects to Salesforce via server-side RS256 JWT Bearer OAuth 2.0 authentication, rendering live data across 6 core enterprise modules without exposing credentials to the client browser.

---

## 🏗 Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Client Browser (UI)                             │
│       /timesheets | /manager | /jobs | /referrals | /profile | /analytics   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP GET/POST (Internal Proxy)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Next.js Node.js Server Environment                     │
│  • Service Layer (src/services/*)                                           │
│  • API Route Handlers (src/app/api/salesforce/*)                            │
│  • Centralized Salesforce Client (src/lib/salesforce-client.ts)              │
│  • Server-Side RS256 JWT Signer (src/lib/sf-jwt-auth.ts)                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS REST / SOQL / Apex REST
                                       │ (Authorization: Bearer <Access_Token>)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Salesforce Org                                │
│                       (Target Org: time-sheet)                              │
│  • Objects: Timesheet__c, Timesheet_Entry__c, Project__c, Employee__c       │
│             Job_Posting__c, Employee_Referral__c, Candidate__c, Skill__c    │
│  • Apex REST: TimesheetRestResource, ManagerRestResource                    │
│  • Apex Controllers: AnalyticsController, ProfileController                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Modules & Salesforce Integration Summary

| Module Path | Next.js Service / Route Handler | Target Salesforce Objects / Apex Endpoint | Integration Type |
| :--- | :--- | :--- | :--- |
| **`/timesheets`** | `TimesheetService`<br>`/api/salesforce/timesheets` | `Timesheet__c`, `Timesheet_Entry__c`, `Project__c`<br>Apex: `TimesheetRestResource` | Custom Apex REST (`/timesheets/*`) |
| **`/manager`** | `ManagerService`<br>`/api/salesforce/manager` | `Employee__c`, `Timesheet_Entry__c`, `Project__c`<br>Apex: `ManagerRestResource` | Custom Apex REST (`/manager/*`) |
| **`/jobs`** | `JobService`<br>`/api/salesforce/jobs` | `Job_Posting__c`, `Department__c` | Salesforce SOQL REST API (`/query`) |
| **`/referrals`** | `ReferralService`<br>`/api/salesforce/referrals` | `Employee_Referral__c`, `Candidate__c`, `Job_Posting__c` | Salesforce SOQL REST API (`/query`) |
| **`/profile`** | `ProfileService`<br>`/api/salesforce/profile` | `User`, `Employee__c`, `Employee_Skill__c`, `Skill__c` | Salesforce SOQL REST API (`/query`) |
| **`/analytics`** | `AnalyticsService`<br>`/api/salesforce/analytics` | `Analytics_Snapshot__c`, `Timesheet__c`, `Timesheet_Entry__c` | Salesforce SOQL REST API (`/query`) + CSV Exporter |

---

## 📁 Repository Structure

```text
timesheet-nextjs/
├── force-app/                     # Salesforce DX Source Directory
│   └── main/default/
│       ├── classes/               # Apex Controllers (TimesheetController, ManagerRestResource, etc.)
│       ├── triggers/              # Apex Triggers
│       ├── objects/               # Custom Objects (Timesheet__c, Job_Posting__c, Employee__c, etc.)
│       ├── lwc/                   # Lightning Web Components
│       ├── flows/                 # Process Automation Flows
│       └── permissionsets/        # Salesforce Permission Sets
├── manifest/
│   └── package.xml                # Comprehensive Salesforce Metadata Manifest
├── src/                           # Next.js Application Source Code
│   ├── app/                       # Next.js 14 App Router Pages & API Routes
│   │   ├── (dashboard)/           # Portal Page Views (/timesheets, /manager, etc.)
│   │   └── api/salesforce/        # Secure Server-Side Route Handlers
│   ├── components/                # Modular UI Components (Analytics, Jobs, Profile, etc.)
│   ├── lib/                       # Centralized Salesforce Client & JWT Auth Helpers
│   ├── services/                  # Data Transformation & Business Logic Layer
│   └── types/                     # TypeScript Type Definitions & Service Schemas
├── sfdx-project.json              # Salesforce DX Project Configuration
├── .gitignore                     # Git Exclusions (Secrets, SF DX temp, Next.js build)
├── package.json                   # Dependencies & NPM Scripts
├── CHANGELOG.md                   # Version History & Release Notes
└── README.md                      # Project Documentation
```

---

## 🚀 Getting Started & Setup

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Salesforce CLI (`sf`)**: [Installation Guide](https://developer.salesforce.com/tools/salesforcecli)

### 2. Installation
```bash
git clone https://github.com/nandini-teqfocus/timesheet-nextjs.git
cd timesheet-nextjs
npm install
```

### 3. Environment Secrets Setup
Create `.env.local` in the project root (**never commit `.env.local` to Git**):

```env
# Server Application
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key_here

# Salesforce Connected App RSA JWT Credentials
SALESFORCE_CLIENT_ID=3MVG9...your_connected_app_consumer_key
SALESFORCE_CLIENT_SECRET=your_connected_app_consumer_secret
SALESFORCE_INTEGRATION_USER=nandini.singh.c2d90108260b@agentforce.com
SALESFORCE_INSTANCE_URL=https://time-sheet.my.salesforce.com
SALESFORCE_LOGIN_URL=https://login.salesforce.com

# Server-Side RSA Private Key for JWT Signer
SALESFORCE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----"

# Client Configuration
NEXT_PUBLIC_APP_NAME="Teqfocus Timesheet Portal"
NEXT_PUBLIC_API_BASE_URL="/api/salesforce"
```

---

## 🔒 Security & Credential Protection

1. **Server-Side JWT Signing**: The `SALESFORCE_PRIVATE_KEY` is read strictly in Node.js runtime environments (`src/lib/sf-jwt-auth.ts`). No secrets use `NEXT_PUBLIC_` prefixes.
2. **Access Token Isolation**: Salesforce Bearer access tokens remain strictly on the Next.js server and are never passed to the browser.
3. **Automatic 401 Retry**: `callSalesforceRestApi()` handles automatic 401 token invalidation and token refresh transparently.
4. **Strict `.gitignore`**: `.env.local`, `.secrets/`, `*.key`, `*.pem`, `*.crt` are strictly ignored.

---

## ⚡ Verification & Quality Assurance Commands

```bash
# 1. Type-check TypeScript codebase
npx tsc --noEmit

# 2. Run Next.js ESLint checks
npm run lint

# 3. Compile Production Build
npm run build

# 4. Start Production Server
npm run start
```

---

## 📄 License & Release Information
- **Current Release**: `v1.0.0`
- **Maintainer**: Teqfocus Engineering Team

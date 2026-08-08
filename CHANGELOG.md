# Changelog

All notable changes to the Teqfocus Next.js + Salesforce Portal project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-08

### Added
- **Salesforce JWT OAuth 2.0 Integration**: Implemented server-side RS256 JWT Bearer token authentication flow (`src/lib/sf-jwt-auth.ts`) targeting Salesforce org `time-sheet`.
- **Centralized Salesforce API Client**: Created reusable `callSalesforceRestApi()` wrapper with single-retry 401 token invalidation, dynamic instance URL resolution, and error handling.
- **Six Integrated Portal Modules**:
  - `/timesheets`: Weekly timesheet entry management, billable tracking, and status controls connected to `TimesheetRestResource` Apex REST API.
  - `/manager`: Executive team metrics, subordinate utilization rates, and project allocation overview connected to `ManagerRestResource` Apex REST API.
  - `/jobs`: Interactive job listings portal connected to live Salesforce `Job_Posting__c` records.
  - `/referrals`: Employee candidate referral tracking connected to live Salesforce `Employee_Referral__c` & `Candidate__c` records.
  - `/profile`: User metadata, employee tenure, utilization metrics, and interactive skills matrix connected to Salesforce `User`, `Employee__c`, and `Employee_Skill__c`.
  - `/analytics`: Executive KPI summary, weekly utilization trend charts, project distribution, and RFC-4180 CSV report export powered by `Analytics_Snapshot__c` and SOQL aggregates.

### Security
- Server-side token isolation: Salesforce OAuth tokens and RSA private key (`SALESFORCE_PRIVATE_KEY`) remain strictly on the Node.js server.
- Secret protection: Configured `.gitignore` to prevent tracking of `.env.local`, `.secrets/`, and RSA key pairs.

### Fixed & Hardened
- Type safety: Resolved all TypeScript errors (`npx tsc --noEmit` clean pass) using generic `SalesforceQueryResult<T>` interfaces.
- ESLint compliance: Resolved all unescaped React entities and linting issues (`npm run lint` clean pass).
- Production build: Verified Next.js 14 production build (`npm run build`) with 11/11 static/dynamic route optimization.

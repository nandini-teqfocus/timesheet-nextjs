# 💼 Timesheet Application & Salesforce DX Core Metadata

[![Salesforce DX](https://img.shields.io/badge/Salesforce-DX-blue.svg)](https://developer.salesforce.com/tools/sfdxcli)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)

A enterprise-grade full-stack solution featuring a **Next.js 14 web portal** integrated with **Salesforce DX core metadata** (`time-sheet` org). This repository contains the complete Salesforce metadata components (Apex Controllers, Triggers, Custom Objects, LWC, Flows, Permission Sets, Workflows, Sharing Rules) alongside the frontend Next.js project.

---

## 🏗 Architecture Overview

```text
┌─────────────────────────────────────────┐
│           Next.js 14 Web Portal         │
│  (React 18 + TailwindCSS + NextAuth.js) │
└────────────────────┬────────────────────┘
                     │ REST / JSForce Client
                     ▼
┌─────────────────────────────────────────┐
│             Salesforce Org              │
│       (Target Org Alias: time-sheet)    │
│  • Custom Objects (Timesheet, Project)  │
│  • Apex Services & Rest Resources       │
│  • Flows, Triggers & Permission Sets    │
└─────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```text
timesheet-nextjs/
├── force-app/                     # Salesforce DX Source Directory
│   └── main/default/
│       ├── classes/               # Apex Controllers, Services & Test Classes
│       ├── triggers/              # Apex Triggers & Meta XML
│       ├── objects/               # Custom Objects (Timesheet__c, Project__c, etc.)
│       ├── lwc/                   # Lightning Web Components
│       ├── flows/                 # Process Automation Flows
│       ├── permissionsets/        # Permission Sets & Access Control
│       ├── flexipages/            # Lightning App & Record Pages
│       ├── tabs/                  # Custom Navigation Tabs
│       ├── staticresources/       # Static Resources & Assets
│       └── workflows/             # Workflow Rules & SLA Actions
├── manifest/
│   └── package.xml                # Comprehensive Salesforce Metadata Manifest
├── src/                           # Next.js Application Source Code
│   ├── app/                       # Next.js 14 App Router Pages & API Routes
│   ├── components/                # UI & Modular Components
│   ├── lib/                       # Salesforce Client & Auth Utilities
│   ├── services/                  # Business Logic & Data Fetching Services
│   └── types/                     # TypeScript Type Definitions
├── sfdx-project.json              # Salesforce DX Project Configuration
├── .gitignore                     # Git Exclusions (Secrets, SF DX temp, Next.js build)
├── package.json                   # Node.js Dependencies & NPM Scripts
└── README.md                      # Project Documentation
```

---

## 🚀 Getting Started & Setup

### 1. Prerequisites
- **Node.js** (v18.x or higher)
- **npm** or **yarn**
- **Salesforce CLI (`sf`)**: [Install Guide](https://developer.salesforce.com/tools/salesforcecli)

### 2. Install Project Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory (do not commit this file to Git):
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key
SALESFORCE_CLIENT_ID=your_salesforce_connected_app_client_id
SALESFORCE_CLIENT_SECRET=your_salesforce_connected_app_client_secret
SALESFORCE_INSTANCE_URL=https://your-domain.my.salesforce.com
```

---

## ⚡ Salesforce Metadata Management

### Authenticate Org
To authorize the `time-sheet` Salesforce org:
```bash
sf org login web --alias time-sheet
```

### Verify Connection
```bash
sf org list
sf org display --target-org time-sheet
```

### Retrieve Metadata from Salesforce Org
To retrieve all metadata from the target org into `force-app`:
```bash
sf project retrieve start --target-org time-sheet --manifest manifest/package.xml
```

---

## 💻 Web Application Usage

### Development Server
Run the application locally:
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) to access the Timesheet portal.

### Production Build
Build and run the production application:
```bash
npm run build
npm run start
```

---

## 🔒 Security & Best Practices
- **No Secrets in Source Control**: `.env`, `.env*.local`, `.sf/`, and `.sfdx/` directories are strictly excluded via `.gitignore`.
- **Read-Only Metadata Retrieval**: Metadata retrieval was executed without deploying or modifying any existing configurations in the target Salesforce org.
- **Strict Typing**: TypeScript and strict typing are enforced across both frontend components and Salesforce API payloads.

---

## 🏷 Recommended Repository Topics & Metadata
- **Description**: `Salesforce DX project and Next.js Timesheet application portal with retrieved org metadata (Apex, LWC, Objects, Flows).`
- **Topics**: `salesforce`, `sfdx`, `nextjs`, `typescript`, `tailwindcss`, `apex`, `lightning-web-components`, `timesheet-app`

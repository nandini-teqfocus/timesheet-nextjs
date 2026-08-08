# Timesheet Application & Salesforce DX Metadata

This repository contains the **Next.js Timesheet Application** source code alongside the **Salesforce DX Metadata** retrieved from the target org (`time-sheet`).

---

## 📁 Repository Structure

```text
timesheet-nextjs/
├── force-app/             # Salesforce DX Source Directory (Apex, LWC, Objects, Flows, etc.)
│   └── main/
│       └── default/
├── manifest/
│   └── package.xml        # Comprehensive Salesforce Metadata Manifest
├── src/                   # Next.js Application Source Code
├── public/                # Next.js Static Assets
├── sfdx-project.json      # Salesforce DX Project Configuration
├── package.json           # Node.js Dependencies & Scripts
├── tsconfig.json          # TypeScript Configuration
└── README.md              # Project Documentation
```

---

## ⚡ Salesforce Org Metadata Retrieval

### Prerequisites
- [Salesforce CLI (`sf`)](https://developer.salesforce.com/tools/salesforcecli) installed.
- Authorized Salesforce org with alias `time-sheet`.

### Authenticate Org
```bash
sf org login web --alias time-sheet
```

### Verify Connected Org
```bash
sf org list
sf org display --target-org time-sheet
```

### Retrieve Metadata from Org
To retrieve all updated metadata from the Salesforce org into `force-app`:
```bash
sf project retrieve start --target-org time-sheet --manifest manifest/package.xml
```

---

## 🚀 Next.js Application Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build Production Bundle
```bash
npm run build
```

---

## 🔒 Security & Deployment Notes
- No changes, deployments, or deletions were performed on the target Salesforce org during metadata retrieval.
- Environment variables and sensitive secrets are managed via `.env.local` (excluded from version control).

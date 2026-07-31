# Build Workflow for SalonFlow

Follow these steps to install dependencies and build the Next.js project.

## Step 1: Install Dependencies
Run npm install to retrieve and build all packages defined in `package.json`:
```bash
npm install
```

## Step 2: Build the Application
Compile the TypeScript and Next.js project. Since Windows does not natively support POSIX-style environment variables in npm scripts directly without shell adjustment, compile using:
```bash
npx next build
```
Alternatively, on POSIX-compliant shells (macOS/Linux), you can run:
```bash
npm run build
```

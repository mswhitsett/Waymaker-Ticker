# Waymaker Ticker — The 25 Initiative

A simple local dashboard for displaying all-time impact numbers for The 25 Initiative.

## Stage 1 Scope

- Manual entry only
- Packaged Mac app through Electron
- Network-accessible admin page
- One shared admin password
- Fixed/static background
- Locked metric order
- No Planning Center integration
- No church plant details or personal data

## Metrics

1. Gospel Responses
2. Baptisms
3. Church Plants
4. Goers Sent
5. Goers Sent to Unreached People Groups

## Default admin password

```text
waymaker
```

The packaged app stores the numbers on the display Mac. The admin page updates that shared data file, so another device on the same network can update the dashboard.

## Build the Mac app from GitHub

1. Open the GitHub repo.
2. Go to **Actions**.
3. Select **Build Mac App**.
4. Click **Run workflow**.
5. Wait for the workflow to finish.
6. Download the artifact named **The-25-Initiative-macOS**.
7. Unzip it and open the `.dmg` or `.zip` app build.

## Using the packaged Mac app

When the Mac app opens, it starts a local web server on port `4173`.

Dashboard on the display Mac:

```text
http://127.0.0.1:4173/dashboard
```

Admin page from another device on the same network:

```text
http://YOUR-MAC-IP:4173/admin
```

The app menu includes an **Open Admin Panel** option and a **Copy Admin URL** option.

## Local development

Install dependencies:

```bash
npm install
```

Start the browser dev server:

```bash
npm run dev
```

The dev version runs at:

```text
http://localhost:5173/dashboard
http://localhost:5173/admin
```

The browser dev version can still work with local browser storage, but the packaged Electron app is the version intended for shared network updates.

## Build locally on a Mac

```bash
npm install
npm run dist:mac
```

Build outputs are placed in:

```text
release/
```

# Waymaker Ticker — The 25 Initiative

A simple local React dashboard for displaying all-time impact numbers for The 25 Initiative.

## Stage 1 Scope

- Manual entry only
- Browser-based dashboard
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

## Run the app

Install dependencies:

```bash
npm install
```

Start the local server:

```bash
npm run dev
```

The app runs at:

```text
http://localhost:5173/dashboard
```

The admin page runs at:

```text
http://localhost:5173/admin
```

## Update from another device on the network

The dev server is configured to listen on the local network.

Find the Mac's IP address, then visit:

```text
http://YOUR-MAC-IP:5173/admin
```

Example:

```text
http://10.110.50.25:5173/admin
```

## Default admin password

```text
waymaker
```

The password is intentionally simple for Stage 1 and is stored locally in the browser. This should only be used on a trusted internal network.

## Display

Open this route fullscreen on the display Mac:

```text
http://localhost:5173/dashboard
```

The dashboard checks for updated data every two seconds.

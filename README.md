# BloodBridge — Blood Donation Network (MERN)

A professional starter application for coordinating urgent blood requests between hospitals and nearby eligible donors.

## Included
- React + Vite + React Router frontend with responsive, polished UI
- Express + MongoDB backend
- JWT authentication and role-based access (`donor`, `hospital`)
- Donor profiles with ABO/Rh blood group, availability, phone and coordinates
- Hospital accounts with organization name and location
- Hospital request creation; backend finds nearby donors with a compatible blood group
- Persistent notifications plus Socket.IO real-time delivery when a donor is online
- Donor can accept a request; hospital can see accepting donors and their contact details
- Radius setting per request, geospatial MongoDB indexes, input validation

## Important safety/product notes
This is a coordination tool, not a blood-bank or clinical eligibility system. Compatibility rules are simplified for initial matching and must be reviewed by a qualified blood-bank professional before real-world use. Hospitals must verify identity, donor eligibility, blood type, availability, and all clinical/lab requirements. Do not use this demo as an emergency service. The app does not send SMS/push notifications by itself; it provides in-app + Socket.IO notifications while users are online. For production, add a verified SMS/push provider, rate limits, audit logs, consent, privacy controls, monitoring, and security review.

## Requirements
- Node.js 20+
- MongoDB local or MongoDB Atlas
- npm

## 1. Backend setup
```bash
cd server
copy .env.example .env
npm install
```
Edit `server/.env` and set `MONGO_URI` and a long random `JWT_SECRET`.

```bash
npm run dev
```
Backend runs at `http://localhost:5000`.

## 2. Frontend setup
Open a second terminal:
```bash
cd client
copy .env.example .env
npm install
npm run dev
```
Frontend runs at the URL Vite prints (normally `http://localhost:5173`).

## 3. How to use
1. Register one account with **Donor** role. Add your blood group, phone, and location coordinates. Turn on donor availability.
2. Register another account with **Hospital** role and provide hospital/organization name and location coordinates.
3. Sign in as hospital and create a request with blood group, units, urgency, radius and patient/hospital notes.
4. Compatible donors within the selected radius receive a persistent notification. If online, it appears immediately via Socket.IO.
5. Donor opens Notifications and accepts. Hospital's request detail shows the accepting donor and contact details.

## Location input
For this starter, location is entered as latitude and longitude to avoid silently collecting browser geolocation. A later iteration can add a map/geocoding provider with explicit user permission. Coordinates are approximate; use valid decimal degrees.

## Deployment
- Backend: deploy `server` as a Node web service; install command `npm install`, start command `npm start`. Set environment variables from `.env.example`.
- Frontend: deploy `client` to Vercel; build command `npm run build`, output directory `dist`. Set `VITE_API_URL` to your deployed backend URL (no trailing slash) and `VITE_SOCKET_URL` to the backend URL.
- Configure `CLIENT_URL` on backend to your deployed frontend origin.
- Use MongoDB Atlas and HTTPS in production.

# Ride-Sharing Platform Backend API & System Architecture

A production-grade, distributed ride-sharing backend engineered with Node.js, Express, MongoDB (2dsphere geospatial indexing), Socket.IO real-time event streaming, and an asynchronous cascading dispatch matching engine.

---

## 🏛️ System Architecture

```
[ Rider App ]           [ Captain (Driver) App ]
     |                               |
     +------------ HTTP / REST ------+
     |                               |
     v                               v
[ Express API Gateway & Auth (JWT + Blacklist) ]
     |
     +---> [ Maps & Routing Engine (Google Maps + Haversine Fallback) ]
     |
     +---> [ Fare Engine (Dynamic Distance & Duration Pricing) ]
     |
     +---> [ MongoDB Cluster (2dsphere Spatial Indexing) ]
     |
     v
[ Socket.IO Real-Time Gateway ] <---> [ Cascading Dispatch Matching Engine ]
     |                                          |
     +--- 15s Countdown Offer Notification ----+
```

---

## 🔄 Ride Lifecycle Finite State Machine (FSM)

```
[REQUESTED] 
    │  (System triggers cascading dispatch to closest drivers within 5km)
    ▼
[ACCEPTED] ──(Captain accepts offer; acquired via atomic findOneAndUpdate)
    │
    ▼
[ARRIVED] ──(Captain arrives at pickup location)
    │
    ▼
[IN_PROGRESS] ──(Captain verifies 4-digit OTP from Rider)
    │
    ▼
[COMPLETED] ──(Trip finished; Captain freed to 'active')
```

---

## 📡 Real-Time Socket.IO Protocol

Connect to `ws://localhost:4000` (or `http://localhost:4000` in Postman Socket.IO client).

### 1. Connection & Room Registration
Immediately after connecting, clients must emit `join`:

```json
// Rider:
socket.emit('join', { "userId": "<RIDER_USER_ID>", "userType": "user" })

// Captain:
socket.emit('join', { "userId": "<CAPTAIN_ID>", "userType": "captain" })
```

### 2. Events Emitted by Server
| Event | Recipient | Payload | Trigger |
|---|---|---|---|
| `new-ride-offer` | Candidate Captain | `{ rideId, pickup, destination, fare, distance, duration, timeoutSeconds: 15 }` | Ride created; offered to nearest driver |
| `offer-expired` | Candidate Captain | `{ rideId }` | 15 seconds elapsed without response |
| `offer-cancelled` | Candidate Captain | `{ rideId }` | Captain declined offer |
| `ride-confirmed` | Assigned Captain | `{ ride }` | Captain successfully claimed ride |
| `ride-accepted` | Rider | `{ ride, captain }` | Driver assigned with vehicle details |
| `ride-started` | Rider | `{ ride }` | Driver entered valid 4-digit OTP |
| `ride-ended` | Rider | `{ ride }` | Driver completed trip |
| `no-captains-found` | Rider | `{ rideId, message }` | No captains within 5km or all declined |

---

## 🚀 REST API Reference

### 1. Authentication (Rider & Captain)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/users/register` | Public | Register rider account |
| `POST` | `/users/login` | Public | Login rider (returns JWT + sets cookie) |
| `GET` | `/users/profile` | Rider Auth | Get logged-in rider profile |
| `GET` | `/users/logout` | Rider Auth | Blacklist token & clear cookie |
| `POST` | `/captains/register` | Public | Register captain with vehicle details |
| `POST` | `/captains/login` | Public | Login captain |
| `GET` | `/captains/profile` | Captain Auth | Get logged-in captain profile |
| `GET` | `/captains/logout` | Captain Auth | Blacklist token & clear cookie |

### 2. Geospatial Location & Driver Status

#### `PATCH /captains/location` (Captain Auth)
Updates driver's GPS location into MongoDB's `2dsphere` spatial index:
```json
{
  "latitude": 28.6129,
  "longitude": 77.2295
}
```

#### `PATCH /captains/status` (Captain Auth)
Toggle driver availability:
```json
{
  "status": "active" // "active" | "inactive"
}
```

#### `GET /captains/nearby` (Public / Query)
Find active drivers within radius (in meters):
```
GET /captains/nearby?latitude=28.6315&longitude=77.2167&radius=5000&vehicleType=car
```

---

### 3. Fares & Ride Lifecycle

#### `GET /rides/get-fare` (Rider Auth)
Calculate distance, ETA, and dynamic pricing quotes for `car`, `auto`, and `moto`:
```
GET /rides/get-fare?pickup=Connaught Place, New Delhi&destination=India Gate, New Delhi
```

#### `POST /rides/create` (Rider Auth)
Book a ride. Automatically generates 4-digit OTP and triggers the cascading matching engine:
```json
{
  "pickup": "Connaught Place, New Delhi",
  "destination": "India Gate, New Delhi",
  "vehicleType": "car"
}
```

#### `POST /rides/confirm` (Captain Auth)
Captain accepts the ride offer (atomic update):
```json
{
  "rideId": "<RIDE_ID>"
}
```

#### `POST /rides/reject` (Captain Auth)
Captain declines the offer. Instantly cascades the offer to the next closest driver without waiting for the 15-second timeout:
```json
{
  "rideId": "<RIDE_ID>"
}
```

#### `POST /rides/start-ride` (Captain Auth)
Captain validates passenger's 4-digit OTP to start billing:
```json
{
  "rideId": "<RIDE_ID>",
  "otp": "4821"
}
```

#### `POST /rides/end-ride` (Captain Auth)
Captain completes the trip. Frees captain status back to `active`:
```json
{
  "rideId": "<RIDE_ID>"
}
```

---

## 🛠️ Environment Variables (`.env`)

```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/my_database
JWT_SECRET=your_jwt_secret_key
GOOGLE_MAPS_API=optional_google_maps_key # Optional; falls back to Haversine + OSM
```

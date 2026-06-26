🚗 Mini Uber Clone — Real-Time Ride Matching System

A full-stack real-time ride-hailing system built with FastAPI, Redis GEO, WebSockets, React, and Leaflet.js — inspired by how Uber matches riders with nearby drivers.

=> FEATURES
📍 Geo-based driver matching — finds nearest available driver within 5km using Redis GEO
🔴 Real-time location tracking — driver location updates every 2 seconds via WebSockets
🗺️ Live map — interactive OpenStreetMap with 📍 customer and 🚗 driver markers
📏 Distance & ETA — live distance in km and estimated arrival time
🔵 Route line — blue dashed line connecting driver to customer, shrinks as driver approaches
⚡ Auto-assignment — nearest available driver assigned after 10-second countdown
🚦 Driver status management — tracks available/busy/offline driver states

=>ARCHITECTURE
React Frontend (port 5173)
        │
        ▼
FastAPI Backend (port 8000)
        │
        ▼
Redis GEO (Docker, port 6379)
        ▲
        │
driver_client.py (WebSocket simulator)


=>GETTING STARTED
Prerequisites
Python 3.10+
Node.js 18+
Docker Desktop

1. Clone the repository
bashgit clone https://github.com/yourusername/mini-uber-clone.git
cd mini-uber-clone

2. Start Redis with Docker
bashdocker run -d --name redis-location -p 6379:6379 redis

3. Start the backend
bashcd Location-system
pip install fastapi uvicorn redis websockets httpx pydantic
uvicorn main:app --reload

4. Upload 50 drivers
Send a POST request to http://localhost:8000/driver/bulk-upload with the driver data from drivers_chandigarh.json.

5. Start the frontend
bashcd uber-fronted
npm install
npm run dev

6. Open the app
Go to http://localhost:5173


=>HOW TO USE
STEP1:-Enter your location coordinates (e.g. Sector 17 Chandigarh: 30.7333, 76.7794)
STEP2:-Click Find Nearby Drivers — green 🚗 markers appear on the map
STEP3:-Wait for the 10-second countdown — nearest driver is auto-assigned
STEP4:-Watch the blue line and distance/ETA update in real time
STEP5:-Run the driver simulator to see the driver move toward you:
bashcd Location-system
python driver_client.py driver_47

📂 PROJECT STRUCTURE
Uber(RedisGEO)/
├── Location-system/          # FastAPI backend
│   ├── main.py               # All API endpoints + WebSocket
│   └── driver_client.py      # Driver simulator
└── uber-fronted/             # React frontend
    └── src/
        ├── App.jsx
        └── pages/
            ├── RiderPage.jsx  # Main booking + tracking page
            └── TrackingPage.jsx

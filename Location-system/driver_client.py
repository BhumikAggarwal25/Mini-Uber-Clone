import asyncio
import json
import websockets
import sys
import httpx
async def driver(driver_id):

    uri = f"ws://localhost:8000/ws/driver/{driver_id}"

    latitude = 30.7338
    longitude = 76.7806

    # Step 1 — fetch active ride for this driver
    async with httpx.AsyncClient() as client:
        res = await client.get(f"http://localhost:8000/driver/{driver_id}/active-ride")
        ride_data = res.json()

    if "ride_id" not in ride_data:
        print("❌ No active ride found for this driver!")
        return

    ride_id = ride_data["ride_id"]
    customer_lat = ride_data["customer_lat"]
    customer_lon = ride_data["customer_lon"]

    print(f"✅ Ride found: {ride_id}")
    print(f"📍 Customer at: {customer_lat}, {customer_lon}")

    async with websockets.connect(uri) as ws:
        print(f"✅ Driver {driver_id} connected!")
        while True:

            # Move TOWARD customer each step
            if abs(latitude - customer_lat) > 0.0001:
                latitude += 0.0001 if customer_lat > latitude else -0.0001

            if abs(longitude - customer_lon) > 0.0001:
                longitude += 0.0001 if customer_lon > longitude else -0.0001

            await ws.send(
                json.dumps({
                    "latitude": latitude,
                    "longitude": longitude
                }))
            response = await ws.recv()
            print(f"📍 {driver_id}: lat={round(latitude,4)} lon={round(longitude,4)}")
            await asyncio.sleep(2)

driver_id=sys.argv[1] if len(sys.argv)>1 else"driver_1"
asyncio.run(driver(driver_id))
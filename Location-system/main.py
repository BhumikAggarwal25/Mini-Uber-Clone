from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import redis
import uuid
import json
import math
from pydantic import BaseModel

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
redis_client= redis.Redis(host='localhost',port=6379,decode_responses=True)

#Store Active Connection
active_connections:dict[str,WebSocket]={}

class DriverLocation(BaseModel):
    driver_id:str
    latitude: float
    longitude: float

# Phase-1 Drivers Location and id
@app.post("/driver/bulk-upload")
def bulk_upload(drivers: list[DriverLocation]):
    for driver in drivers:
        redis_client.geoadd(
            "drivers",(
                driver.longitude,
                driver.latitude,
                driver.driver_id
            )
        )
    return{
        "message":f"{len(drivers)} drivers added successfully"
    }

# Phase-2 finding nearest driver

class CustomerLocation(BaseModel):
    latitude:float
    longitude:float

@app.post("/order/new")
def find_nearest_driver(customer:CustomerLocation):
    nearby_drivers=redis_client.geosearch(
        "drivers",
        longitude=customer.longitude,
        latitude=customer.latitude,
        radius=5,
        unit="km",
        sort="ASC" # help to find closest
    )

    if not nearby_drivers:
        return{"message":"No drivers found nearby"}
    
    for driver_id in nearby_drivers:
        status=redis_client.get(f"driver_status:{driver_id}")

        if status !="busy":
           redis_client.set(f"driver_status:{driver_id}","busy")

           # create ride id 
           ride_id=str(uuid.uuid4())

           #store Ride details
           redis_client.hset(
               f"ride:{ride_id}",
               mapping={
                   "driver_id":driver_id,
                   "status":"ASSIGNED",
                   "customer_lat":customer.latitude,
                   "customer_lon":customer.longitude
               }
           )
           return{
            "ride_id":ride_id,
            "driver_id":driver_id,
            "status":"ASSIGNED"
           }

    return{
    "message":"All nearby drivers are busy",
    "status":"FAILED"
}

@app.post("/ride/complete/{driver_id}")
def complete_ride(driver_id:str):
    redis_client.set(
        f"driver_status:{driver_id}",
        "available"
    )
    return{
        "message":"Ride Complete"
    }


# phase-3 Websocket endPoint

@app.websocket("/ws/driver/{driver_id}")
async def driver_websocket(websocket:WebSocket, driver_id:str):
    await websocket.accept()  # basically it is asking server websocket connection 
    active_connections[driver_id]=websocket
    redis_client.set(
        f"driver_status:{driver_id}",
        "available"
    )
    print(f"Driver{driver_id} connected")

    try:
        while True:
            data=await websocket.receive_text()
            try:
                location=json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_text("Invalid JSON")
                continue

            #Update drover location in redis 
            redis_client.geoadd(
                "drivers",(
                    location["longitude"],
                    location["latitude"],
                    driver_id
                )
            )

            await websocket.send_text(json.dumps({
                "driver_id":driver_id,
                "latitude":location["latitude"],
                "longitude":location["longitude"],
                "status":"location updated"
                
            }))
    
    except WebSocketDisconnect:
        del active_connections[driver_id]
        print(f"Driver {driver_id} disconnected")

        redis_client.set(
            f"driver_status:{driver_id}",
            "offline"
        )

@app.get("/driver/location/{driver_id}")
def get_driver_location(driver_id:str):

    position=redis_client.geopos(
        "drivers",
        driver_id
    )
    if not position or position[0] is None:
        return {"message":"Driver not found"}
    
    longitude,latitude=position[0]
    return{
        "driver_id":driver_id,
        "latitude":latitude,
        "longitude":longitude
    }

def calculate_distance(lat1,lon1,lat2,lon2):
    R=6371
    dlat=math.radians(lat2-lat1)
    dlon=math.radians(lon2-lon1)
    a=math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2

    c=2* math.atan2(math.sqrt(a),math.sqrt(1-a))
    return round(R*c,2)

@app.get("/ride/{ride_id}/status")
def get_ride_status(ride_id:str):
    ride=redis_client.hgetall(f"ride:{ride_id}")
    if not ride:
        return {"message":"Rode not Found"}
    
    driver_pos=redis_client.geopos("drivers",ride["driver_id"])
    if not driver_pos or driver_pos[0] is None:
        return {"message":"Driver location not found"}
    
    driver_lon,driver_lat=driver_pos[0]
    customer_lat=float(ride["customer_lat"])
    customer_lon=float(ride["customer_lon"])

    distance=calculate_distance(customer_lat,customer_lon,float(driver_lat),float(driver_lon))

    #Average speed 30Km/h
    eta_minutes = max(1, round((distance / 30) * 60))

    return{
        "driver_id":ride["driver_id"],
        "driver_lat":float(driver_lat),
        "driver_lon":float(driver_lon),
        "customer_lat":float(customer_lat),
        "customer_lon":float(customer_lon),
        "distance_km":distance,
        "eta_minutes":eta_minutes,
        "status":ride.get("status","ASSIGNED")
    }

@app.get("/ride/{ride_id}")
def get_ride(ride_id:str):
    ride=redis_client.hgetall(f"ride:{ride_id}")

    if not ride:
        return{"message":"Ride not found"}
    
    return ride

@app.get("/drivers/nearby")
def get_nearby_drivers(latitude:float, longitude:float, radius:float=5):
    nearby=redis_client.geosearch(
        "drivers",
        longitude=longitude,
        latitude=latitude,
        radius=radius,
        unit="km",
        sort="ASC",
        withcoord=True
    )

    drivers=[]
    for item in nearby:
        driver_id, coords=item
        status=redis_client.get(f"driver_status:{driver_id}") or "available"
        if status !="busy":
            drivers.append({
                "driver_id":driver_id,
                "latitude":coords[1],
                "longitude":coords[0],
                "status":status
            })

    return {"drivers":drivers[:5]}

@app.get("/ride/{ride_id/customer-location}")
def get_customer_location(ride_id:str):
    ride=redis_client.hgrtall(f"ride:{ride_id}")
    if not ride:
        return{"message":"Ride not found"}
    return{
        "customer_lat":float(ride["customer_lat"]),
        "customer_lon":float(ride["customer_lon"])
    }

@app.get("/driver/{driver_id}/active-ride")
def get_driver_active_ride(driver_id: str):
    ride_keys = redis_client.keys("ride:*")
    for key in ride_keys:
        ride = redis_client.hgetall(key)
        if ride.get("driver_id") == driver_id and ride.get("status") == "ASSIGNED":
            ride_id = key.split(":")[1]
            return {
                "ride_id": ride_id,
                "customer_lat": float(ride["customer_lat"]),
                "customer_lon": float(ride["customer_lon"])
            }
    return {"message": "No active ride found"}
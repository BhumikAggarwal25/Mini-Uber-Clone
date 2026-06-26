
import {useEffect, useRef, useState } from "react";
import axios from "axios";
import { MapContainer,TileLayer, Marker,Popup, Polyline, useMap } from "react-leaflet";
import"leaflet/dist/leaflet.css";
import L from "leaflet";

const customerIcon = L.divIcon({
  html: '<div style="font-size: 32px; line-height: 1;">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  className: ""
});

const driverIcon = L.divIcon({
  html: '<div style="font-size: 32px; line-height: 1;">🚗</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20],
  className: ""
});

// Moves map to centre when location changes
function RecenterMap({center}){
    const map=useMap();
    const hasSet=useRef(false);
   
  useEffect(() => {
    if (center) {
      map.setView(center, 14);
    }
  }, [center]);

  return null;
}
function RiderPage({onRideBooked}){
    const [latitude,setLatitude]= useState("");
    const [longitude, setLongitude]=useState("");
    const[phase,setPhase]=useState("input");
    const[message,setMessage]=useState("");
    const[loading,setLoading]=useState(false);
    const[nearbyDrivers,setNearbyDrivers]=useState([]);
    const[assignedRide,setAssignedRide]=useState(null);
    const[rideStatus,setRideStaus]=useState(null);
    const[countdown,setCountdown]=useState(6);
    const intervalRef=useRef(null);

    const customerPos=latitude && longitude
    ?[parseFloat(latitude),parseFloat(longitude)]: null;

    // find nearby drivers
    const findDrivers=async()=>{
        if(!latitude || !longitude){
            setMessage("Please enter your location!");
            return;
        }
        setMessage("");
        setPhase("searching");
        try {
            const res=await axios.get("http://localhost:8000/drivers/nearby",{
                params:{
                    latitude:parseFloat(latitude),
                    longitude:parseFloat(longitude),
                },
            });

            if(res.data.drivers.length==0){
                setMessage("No drivers nearby!");
                setPhase("input");
                return;
            }
            setNearbyDrivers(res.data.drivers);
            setPhase("found");

            // autobook after 6 seconds
            let count=6;
            setCountdown(count);
            const timer=setInterval(()=>{
                count -=1;
                setCountdown(count);
                if(count==0){
                    clearInterval(timer);
                    bookRide();
                }
            }, 1000);
        } catch (error) {
            setMessage("Something went wrong!");
            setPhase("input");
        }
    };

    const bookRide=async()=>{
        try {
          const response=await axios.post("http://localhost:8000/order/new",{
            latitude:parseFloat(latitude),
            longitude:parseFloat(longitude),
          });

          console.log("Response:", response.data);
          if(response.data.ride_id){
            setAssignedRide(response.data);
            setPhase("tracking");
            startTracking(response.data.ride_id);
          } else{
            setMessage(response.data.message);
            setPhase("input");
          }
         
        } catch (error) {
            setMessage("Something went wrong!");
            setPhase("input");
        }
    };

    // step-3 poll distance
    const startTracking=(ride_id)=>{
        intervalRef.current=setInterval(async()=>{
            try {
                const res=await axios.get(`http://localhost:8000/ride/${ride_id}/status`);
                setRideStaus(res.data);
            } catch (error) {
                console.log("Tracking error:",error);
            }
        }, 4000);
    };

    useEffect(()=>{
        return()=>{
            if(intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

   return (
    <div style={{ backgroundColor: "#0f0f0f", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{
        backgroundColor: "#1a1a1a", padding: "16px 24px",
        borderBottom: "1px solid #2a2a2a",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#fff" }}>🚗 MiniUber</h1>
        {phase === "tracking" && (
          <span style={{
            backgroundColor: "#00c853", color: "#000",
            padding: "6px 14px", borderRadius: "20px",
            fontSize: "13px", fontWeight: "700"
          }}>DRIVER ASSIGNED</span>
        )}
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 60px)" }}>

        {/* Left panel */}
        <div style={{
          width: "340px", backgroundColor: "#1a1a1a",
          padding: "24px", borderRight: "1px solid #2a2a2a",
          display: "flex", flexDirection: "column", gap: "16px",
          overflowY: "auto"
        }}>

          {/* INPUT PHASE */}
          {phase === "input" && (
            <>
              <h2 style={{ color: "#fff", fontSize: "18px" }}>Where are you?</h2>

              <div>
                <label style={{ color: "#888", fontSize: "12px" }}>LATITUDE</label>
                <input
                  type="text" placeholder="e.g. 28.6097"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  style={{
                    width: "100%", padding: "12px", marginTop: "6px",
                    backgroundColor: "#2a2a2a", border: "1px solid #333",
                    borderRadius: "8px", color: "#fff", fontSize: "15px",
                    outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ color: "#888", fontSize: "12px" }}>LONGITUDE</label>
                <input
                  type="text" placeholder="e.g. 77.2070"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  style={{
                    width: "100%", padding: "12px", marginTop: "6px",
                    backgroundColor: "#2a2a2a", border: "1px solid #333",
                    borderRadius: "8px", color: "#fff", fontSize: "15px",
                    outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              <button onClick={findDrivers} style={{
                width: "100%", padding: "14px",
                backgroundColor: "#00c853", color: "#000",
                fontWeight: "700", fontSize: "15px",
                border: "none", borderRadius: "8px", cursor: "pointer"
              }}>
                🔍 Find Nearby Drivers
              </button>

              {message && (
                <p style={{ color: "#ff5252", fontSize: "13px", textAlign: "center" }}>
                  {message}
                </p>
              )}
            </>
          )}

          {/* SEARCHING PHASE */}
          {phase === "searching" && (
            <div style={{ textAlign: "center", paddingTop: "40px" }}>
              <p style={{ fontSize: "32px" }}>🔍</p>
              <p style={{ color: "#fff", fontSize: "16px", marginTop: "12px" }}>
                Finding drivers near you...
              </p>
            </div>
          )}

          {/* FOUND PHASE — show drivers + countdown */}
          {phase === "found" && (
            <>
              <div style={{
                backgroundColor: "#00c85320",
                border: "1px solid #00c853",
                borderRadius: "10px", padding: "16px",
                textAlign: "center"
              }}>
                <p style={{ color: "#00c853", fontSize: "13px", fontWeight: "700" }}>
                  {nearbyDrivers.length} DRIVERS FOUND NEARBY
                </p>
                <p style={{ color: "#fff", fontSize: "32px", fontWeight: "800", margin: "8px 0" }}>
                  {countdown}
                </p>
                <p style={{ color: "#888", fontSize: "13px" }}>
                  Auto-assigning nearest driver...
                </p>
              </div>

              {nearbyDrivers.map((driver, i) => (
                <div key={driver.driver_id} style={{
                  backgroundColor: "#2a2a2a", borderRadius: "8px",
                  padding: "12px 16px", display: "flex",
                  justifyContent: "space-between", alignItems: "center",
                  border: i === 0 ? "1px solid #00c853" : "1px solid #333"
                }}>
                  <span style={{ color: "#fff", fontSize: "14px" }}>
                    🚗 {driver.driver_id}
                  </span>
                  {i === 0 && (
                    <span style={{
                      backgroundColor: "#00c853", color: "#000",
                      fontSize: "11px", fontWeight: "700",
                      padding: "2px 8px", borderRadius: "10px"
                    }}>NEAREST</span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* TRACKING PHASE — distance + ETA */}
          {phase === "tracking" && assignedRide && (
            <>
              <div style={{
                backgroundColor: "#2a2a2a", borderRadius: "10px", padding: "16px"
              }}>
                <p style={{ color: "#888", fontSize: "12px" }}>ASSIGNED DRIVER</p>
                <p style={{ color: "#fff", fontSize: "20px", fontWeight: "700", marginTop: "4px" }}>
                  🚗 {assignedRide.driver_id}
                </p>
              </div>

              {rideStatus && (
                <>
                  {/* Distance */}
                  <div style={{
                    backgroundColor: "#2a2a2a", borderRadius: "10px",
                    padding: "16px", textAlign: "center"
                  }}>
                    <p style={{ color: "#888", fontSize: "12px" }}>DISTANCE</p>
                    <p style={{ color: "#00c853", fontSize: "28px", fontWeight: "800" }}>
                      {rideStatus.distance_km} km
                    </p>
                  </div>

                  {/* ETA */}
                  <div style={{
                    backgroundColor: "#2a2a2a", borderRadius: "10px",
                    padding: "16px", textAlign: "center"
                  }}>
                    <p style={{ color: "#888", fontSize: "12px" }}>ETA</p>
                    <p style={{ color: "#fff", fontSize: "28px", fontWeight: "800" }}>
                      {rideStatus.eta_minutes} min
                    </p>
                  </div>

                  {/* Driver coords */}
                  <div style={{
                    backgroundColor: "#2a2a2a", borderRadius: "10px", padding: "16px"
                  }}>
                    <p style={{ color: "#888", fontSize: "12px" }}>DRIVER LOCATION</p>
                    <p style={{ color: "#aaa", fontSize: "13px", marginTop: "4px" }}>
                      {rideStatus.driver_lat.toFixed(4)}, {rideStatus.driver_lon.toFixed(4)}
                    </p>
                  </div>
                </>
              )}

              {!rideStatus && (
                <p style={{ color: "#888", textAlign: "center" }}>
                  Loading driver location...
                </p>
              )}
            </>
          )}
        </div>

        {/* Map */}
        <div style={{ flex: 1 }}>
          {customerPos ? (
           <MapContainer
    center={[30.7333, 76.7794]} /* ← always show Chandigarh by default */
    zoom={13}
    zoomSnap={0.5}
    zoomDelta={0.5}
    style={{ height: "100%", width: "100%" }}
  >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {/* Customer marker */}
              {customerPos && (
  <Marker position={customerPos} icon={customerIcon}>
    <Popup>📍 You are here</Popup>
  </Marker>
)}

              {/* Nearby drivers (before booking) */}
              {phase === "found" && nearbyDrivers.map((driver) => (
                <Marker
                  key={driver.driver_id}
                  position={[driver.latitude, driver.longitude]}
                  icon={driverIcon}
                >
                  <Popup>🚗 {driver.driver_id}</Popup>
                </Marker>
              ))}

              {/* Assigned driver (after booking) */}
              {phase === "tracking" && rideStatus && (
  <>
    <Marker
      position={[rideStatus.driver_lat, rideStatus.driver_lon]}
      icon={driverIcon}
    >
      <Popup>
        🚗 {assignedRide.driver_id}<br />
        {rideStatus.distance_km} km away<br />
        ETA: {rideStatus.eta_minutes} min
      </Popup>
    </Marker>

    {/* ← Blue line from driver to customer */}
    <Polyline
      positions={[
        [rideStatus.driver_lat, rideStatus.driver_lon],  // driver
        [rideStatus.customer_lat, rideStatus.customer_lon]  // customer
      ]}
      pathOptions={{
        color: "#4FC3F7",
        weight: 4,              // line thickness
        dashArray: "10 8",     // dashed line
        opacity: 0.8
      }}
    />
  </>
)}
            </MapContainer>
          ) : (
            <div style={{
              height: "100%", display: "flex",
              alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: "12px"
            }}>
              <p style={{ fontSize: "48px" }}>🗺️</p>
              <p style={{ color: "#444", fontSize: "16px" }}>
                Enter your location to see nearby drivers
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RiderPage;
import { useState, useEffect} from "react";

import axios from "axios";
import {MapContainer, TileLayer,Marker,Popup} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from"leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function TrackingPage({rideData}){
    const[driverLocation,setDriverLocation]=useState(null);

    useEffect(()=>{
        const interval=setInterval(async()=>{
            const res=await axios.get(
                `http://localhost:8000/driver/location/${rideData.driver_id}`
            );
            setDriverLocation(res.data);
        }, 3000);
        return()=>clearInterval(interval);
    }, [rideData.driver_id]);

    if(!driverLocation) return <p>Loading map...</p>

     return (
    <div style={{ backgroundColor: "#0f0f0f", minHeight: "100vh" }}>

      {/* Top bar */}
      <div style={{
        backgroundColor: "#1a1a1a",
        padding: "16px 24px",
        borderBottom: "1px solid #2a2a2a",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800" }}>🚗 MiniUber</h1>
        <span style={{
          backgroundColor: "#00c853",
          color: "#000",
          padding: "6px 14px",
          borderRadius: "20px",
          fontSize: "13px",
          fontWeight: "700"
        }}>ASSIGNED</span>
      </div>

      {/* Info cards */}
      <div style={{
        display: "flex",
        gap: "16px",
        padding: "20px 24px",
        flexWrap: "wrap"
      }}>
        <div style={{
          backgroundColor: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: "12px",
          padding: "16px 24px",
          flex: 1
        }}>
          <p style={{ color: "#888", fontSize: "12px" }}>DRIVER</p>
          <p style={{ fontSize: "18px", fontWeight: "700", marginTop: "4px" }}>
            {rideData.driver_id}
          </p>
        </div>

        <div style={{
          backgroundColor: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: "12px",
          padding: "16px 24px",
          flex: 1
        }}>
          <p style={{ color: "#888", fontSize: "12px" }}>RIDE ID</p>
          <p style={{
            fontSize: "13px",
            fontWeight: "600",
            marginTop: "4px",
            color: "#aaa"
          }}>
            {rideData.ride_id.slice(0, 8)}...
          </p>
        </div>

        <div style={{
          backgroundColor: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: "12px",
          padding: "16px 24px",
          flex: 1
        }}>
          <p style={{ color: "#888", fontSize: "12px" }}>LOCATION</p>
          <p style={{ fontSize: "14px", fontWeight: "600", marginTop: "4px" }}>
            {driverLocation
              ? `${driverLocation.latitude.toFixed(4)}, ${driverLocation.longitude.toFixed(4)}`
              : "Loading..."}
          </p>
        </div>
      </div>

      {/* Map */}
      {driverLocation ? (
        <div style={{ padding: "0 24px 24px" }}>
          <MapContainer
            center={[driverLocation.latitude, driverLocation.longitude]}
            zoom={15}
            style={{
              height: "480px",
              width: "100%",
              borderRadius: "16px",
              border: "1px solid #2a2a2a"
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[driverLocation.latitude, driverLocation.longitude]}>
              <Popup>🚗 {rideData.driver_id} is here!</Popup>
            </Marker>
          </MapContainer>
        </div>
      ) : (
        <div style={{
          textAlign: "center",
          padding: "60px",
          color: "#888"
        }}>
          Loading map...
        </div>
      )}
    </div>
  );

}

export default TrackingPage;
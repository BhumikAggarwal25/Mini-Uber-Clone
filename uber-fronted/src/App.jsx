
import { useState } from "react";
import RiderPage from "./pages/RiderPage"
import TrackingPage from "./pages/TrackingPage"

function App(){
  const[rideData,setRideData]=useState(null);
  return(
    <div>
      {!rideData ?(
        <RiderPage onRideBooked={setRideData} />
      ) :(
        <TrackingPage rideData={rideData} />
      )}
    </div>
  );
}

export default App;
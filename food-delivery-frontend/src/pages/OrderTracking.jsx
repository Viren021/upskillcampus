import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'

// --- ICONS SETUP ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const restaurantIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/4287/4287725.png', 
    iconSize: [40, 40],
    iconAnchor: [20, 40]
})
const scooterIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/741/741407.png', 
    iconSize: [50, 50],
    iconAnchor: [25, 25]
})
const homeIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/619/619153.png', 
    iconSize: [40, 40],
    iconAnchor: [20, 40]
})

function OrderTracking() {
  const [status, setStatus] = useState("Loading...")
  const [orderId, setOrderId] = useState(null)
  
  // Locations
  const [restaurantPos, setRestaurantPos] = useState(null) 
  const [customerPos, setCustomerPos] = useState(null)
  const [driverPos, setDriverPos] = useState(null)
  const [roadPath, setRoadPath] = useState([]) 
  
  // Driver Updates
  const [driverMsg, setDriverMsg] = useState(null) 
  const [eta, setEta] = useState(null)             

  // Animation Ref
  const indexRef = useRef(0)

  // OTP State (Display only)
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otpCode, setOtpCode] = useState(null) // 👈 Changed from input to display code

  const [loading, setLoading] = useState(true)
  const ws = useRef(null)

  // 1. Fetch Order Data
  const fetchOrderData = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('http://127.0.0.1:8000/orders/my-latest', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const data = res.data
      setOrderId(data.id)
      setStatus(data.status) 

      if (data.restaurant) setRestaurantPos([data.restaurant.latitude, data.restaurant.longitude])
      if (data.delivery_latitude) setCustomerPos([data.delivery_latitude, data.delivery_longitude])
      
      setLoading(false)
    } catch (error) {
      console.error("Tracking Error", error)
      setStatus("No Active Order")
      setLoading(false)
    }
  }

  // 2. Fetch Route (Initial Static Path)
  const fetchRoadRoute = async (start, end) => {
      try {
          const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
          const response = await axios.get(url)
          setRoadPath(response.data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]))
      } catch (error) { console.error("OSRM Error", error) }
  }

  // 3. Trigger OTP Generation & Display
  const handleArrival = async () => {
      if (showOtpModal) return; 
      console.log("📍 Car Arrived! Fetching OTP...")
      
      try {
        const token = localStorage.getItem('token')
        // 👇 Call API to generate/fetch OTP
        const res = await axios.post(`http://127.0.0.1:8000/orders/${orderId}/generate-otp`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        })

        // 👇 Save the OTP to display it to the customer
        if(res.data.otp) {
            setOtpCode(res.data.otp)
            setShowOtpModal(true)
        }
      } catch (err) {
          console.error("Failed to generate OTP", err)
      }
  }

  // Initial Load & WebSocket
  useEffect(() => {
    fetchOrderData()
    
    const socket = new WebSocket("ws://127.0.0.1:8000/ws/tracking");
    ws.current = socket;

    socket.onopen = () => console.log("✅ WebSocket Connected");

    socket.onmessage = (e) => { 
        try {
            const d = JSON.parse(e.data); 
            if (d.status) setStatus(d.status); 
            if (d.event === "DRIVER_UPDATE") {
                if (d.lat && d.lng) setDriverPos([d.lat, d.lng]) 
                if (d.time) setEta(d.time)                       
                if (d.message) setDriverMsg(d.message)           
            }
        } catch(err) {
            console.log("WS Error:", err);
        }
    }

    socket.onclose = () => console.log("❌ WebSocket Disconnected");

    return () => { 
        if (socket.readyState === 1) socket.close();
    }
  }, [])

  // Trigger Route Fetch
  useEffect(() => {
      if (restaurantPos && customerPos) fetchRoadRoute(restaurantPos, customerPos)
  }, [restaurantPos, customerPos])

  // 5. 🕹️ ANIMATION LOGIC
  useEffect(() => {
    if (!restaurantPos) return; 

    let interval;

    if (status === 'OUT_FOR_DELIVERY' && roadPath.length > 0) {
        
        console.log("🚗 Starting Animation..."); 

        interval = setInterval(() => {
            const currentIndex = indexRef.current;

            if (currentIndex >= roadPath.length - 1) {
                clearInterval(interval); 
                setDriverPos(roadPath[roadPath.length - 1]);
                handleArrival(); 
                return;
            }

            setDriverPos(roadPath[currentIndex]);
            indexRef.current += 1; 

        }, 800); 

    } else if (status === 'DELIVERED' && customerPos) {
        setDriverPos(customerPos)
        setShowOtpModal(false) 
        if (interval) clearInterval(interval)
    } else {
        setDriverPos(restaurantPos)
        indexRef.current = 0;
    }

    return () => clearInterval(interval);
  }, [status, roadPath, restaurantPos, customerPos]) 


  if (loading) return <div style={{textAlign:'center', padding:'50px'}}>Loading Map... 🛰️</div>
  if (status === "No Active Order") return <div style={{textAlign:'center', padding:'50px'}}><h3>No active orders found.</h3></div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Navbar role="CUSTOMER" />
      <div className="container" style={{position: 'relative', marginTop: '20px'}}>
        
        {/* 🔔 DRIVER MESSAGE ALERT */}
        {driverMsg && (
            <div className="alert alert-info" style={{ textAlign: 'center', fontWeight: 'bold' }}>
                🔔 Message from Driver: "{driverMsg}"
            </div>
        )}

        {/* ⏱️ ETA STATUS BAR */}
        <div className="card" style={{ marginBottom: '20px', textAlign: 'center', borderLeft: `5px solid ${status === 'DELIVERED' ? 'green' : 'orange'}` }}>
            <h2 style={{ margin: 0, textTransform: 'uppercase', color: '#333' }}>
                {status.replace(/_/g, ' ')}
            </h2>
            <p style={{ color: '#666' }}>Order #{orderId}</p>
            {eta && <p style={{ fontWeight: 'bold', color: '#007bff' }}>⏱️ Estimated Arrival: {eta}</p>}
        </div>

        {/* 🗺️ MAP */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '500px', borderRadius: '12px', border: '2px solid #ddd' }}>
            {restaurantPos && (
            <MapContainer center={restaurantPos} zoom={13} style={{ height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={restaurantPos} icon={restaurantIcon}><Popup>Restaurant</Popup></Marker>
                
                {customerPos && <Marker position={customerPos} icon={homeIcon}><Popup>Your Home</Popup></Marker>}
                
                {driverPos && (status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') && (
                    <Marker position={driverPos} icon={scooterIcon}>
                        <Popup>Driver is here! <br/>{eta ? `Arriving in ${eta}` : 'On the way'}</Popup>
                    </Marker>
                )}
                
                {roadPath.length > 0 && <Polyline positions={roadPath} color="blue" weight={5} opacity={0.7} />}
            </MapContainer>
            )}
        </div>

        {/* 🔐 OTP DISPLAY MODAL (Updated) */}
        {showOtpModal && otpCode && (
            <div style={{
                position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
            }}>
                <div style={{ background: 'white', padding: '30px', borderRadius: '10px', textAlign: 'center', width: '300px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                    <h3 style={{ color: '#0d6efd' }}>📭 Driver Arrived!</h3>
                    <p>Share this code with your driver to receive your food.</p>
                    
                    <div style={{ 
                        fontSize: '40px', fontWeight: 'bold', letterSpacing: '5px', 
                        color: '#333', background: '#f0f0f0', padding: '10px', borderRadius: '10px', margin: '20px 0' 
                    }}>
                        {otpCode}
                    </div>
                    
                    <button 
                        className="btn btn-outline-secondary btn-sm" 
                        onClick={() => setShowOtpModal(false)}
                    >
                        Close
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}

export default OrderTracking
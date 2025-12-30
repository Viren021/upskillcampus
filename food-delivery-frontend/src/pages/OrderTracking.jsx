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
  
  // Animation Ref
  const indexRef = useRef(0)

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otpInput, setOtpInput] = useState("")
  // ❌ REMOVED: const [generatedOtp, setGeneratedOtp] = useState(null)

  const [loading, setLoading] = useState(true)

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

  // 2. Fetch Route
  const fetchRoadRoute = async (start, end) => {
      try {
          const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
          const response = await axios.get(url)
          setRoadPath(response.data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]))
      } catch (error) { console.error("OSRM Error", error) }
  }

  // 3. Trigger OTP Generation (Called when car arrives)
  const handleArrival = async () => {
      if (showOtpModal) return; 
      console.log("📍 Car Arrived! Generating OTP...")
      
      try {
        const token = localStorage.getItem('token')
        // We just call the API. It sends the SMS. It does NOT return the code.
        await axios.post(`http://127.0.0.1:8000/orders/${orderId}/generate-otp`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        })
        setShowOtpModal(true)
      } catch (err) {
          console.error("Failed to generate OTP", err)
      }
  }

  // 4. Submit OTP
  const handleVerifyOtp = async () => {
      try {
        const token = localStorage.getItem('token')
        await axios.post(`http://127.0.0.1:8000/orders/${orderId}/complete-delivery`, { otp: otpInput }, {
            headers: { Authorization: `Bearer ${token}` }
        })
        alert("✅ OTP Verified! Order Delivered.")
        setShowOtpModal(false)
        setStatus("DELIVERED") 
      } catch (err) {
        alert("❌ Invalid OTP! Try again.")
      }
  }

  // Initial Load & WebSocket
  useEffect(() => {
    fetchOrderData()
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/tracking")
    ws.onmessage = (e) => { 
        try {
            const d = JSON.parse(e.data); 
            if (d.status) setStatus(d.status); 
        } catch(err) {}
    }
    return () => { if (ws.readyState === 1) ws.close() }
  }, [])

  // Trigger Route Fetch
  useEffect(() => {
      if (restaurantPos && customerPos) fetchRoadRoute(restaurantPos, customerPos)
  }, [restaurantPos, customerPos])


  // 5. 🕹️ ANIMATION LOGIC (Slow Car + OTP Trigger)
  useEffect(() => {
    if (!restaurantPos) return;

    let interval;

    if (status === 'OUT_FOR_DELIVERY' && roadPath.length > 0) {
        
        interval = setInterval(() => {
            const currentIndex = indexRef.current;

            if (currentIndex >= roadPath.length - 1) {
                clearInterval(interval); 
                setDriverPos(roadPath[roadPath.length - 1]);
                
                // 👇 TRIGGER OTP MODAL WHEN ARRIVED
                handleArrival(); 
                return;
            }

            setDriverPos(roadPath[currentIndex]);
            indexRef.current += 1; 

        }, 800); // 👈 SPEED: 800ms (Slow)

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
      <div className="container" style={{position: 'relative'}}>
        
        <div className="card" style={{ marginBottom: '20px', textAlign: 'center', borderLeft: `5px solid ${status === 'DELIVERED' ? 'green' : 'orange'}` }}>
            <h2 style={{ margin: 0, textTransform: 'uppercase', color: '#333' }}>
                {status.replace(/_/g, ' ')}
            </h2>
            <p style={{ color: '#666' }}>Order #{orderId}</p>
        </div>

        {/* 🗺️ MAP */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '500px', borderRadius: '12px', border: '2px solid #ddd' }}>
            {restaurantPos && (
            <MapContainer center={restaurantPos} zoom={13} style={{ height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={restaurantPos} icon={restaurantIcon} />
                {customerPos && <Marker position={customerPos} icon={homeIcon} />}
                {driverPos && (status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') && (
                    <Marker position={driverPos} icon={scooterIcon} />
                )}
                {roadPath.length > 0 && <Polyline positions={roadPath} color="blue" weight={5} opacity={0.7} />}
            </MapContainer>
            )}
        </div>

        {/* 🔐 OTP POPUP MODAL (Secure Version) */}
        {showOtpModal && (
            <div style={{
                position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
            }}>
                <div style={{ background: 'white', padding: '30px', borderRadius: '10px', textAlign: 'center', width: '300px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                    <h3>📭 Delivery Arrived!</h3>
                    <p>Please enter the OTP sent to your registered mobile number.</p>
                    
                    {/* ❌ REMOVED DEMO HELPER - Must check real phone now */}

                    <input 
                        type="text" 
                        maxLength="4"
                        placeholder="- - - -"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        style={{ fontSize: '24px', width: '100%', textAlign: 'center', letterSpacing: '5px', marginBottom: '20px', padding: '10px', borderRadius:'5px', border:'1px solid #ccc' }}
                    />
                    
                    <button 
                        className="btn btn-success btn-block" 
                        onClick={handleVerifyOtp}
                        disabled={otpInput.length < 4}
                    >
                        Confirm Delivery ✅
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}

export default OrderTracking
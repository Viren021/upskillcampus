import { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'


import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- CUSTOM ICONS ---
const restaurantIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/4287/4287725.png', // Pizza Icon
    iconSize: [40, 40],
    iconAnchor: [20, 40]
})

const scooterIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/741/741407.png', // Scooter Icon
    iconSize: [50, 50],
    iconAnchor: [25, 25]
})

const homeIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/619/619153.png', // House Icon
    iconSize: [40, 40],
    iconAnchor: [20, 40]
})

function OrderTracking() {
  const [status, setStatus] = useState("Loading...")
  const [orderId, setOrderId] = useState(null)
  
  //  Locations State
  const [restaurantPos, setRestaurantPos] = useState(null) 
  const [customerPos, setCustomerPos] = useState(null)
  const [driverPos, setDriverPos] = useState(null)
  
  //  NEW: Store the real road coordinates
  const [roadPath, setRoadPath] = useState([]) 

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

      if (data.restaurant) {
          setRestaurantPos([data.restaurant.latitude, data.restaurant.longitude])
      }

      if (data.delivery_latitude && data.delivery_longitude) {
          setCustomerPos([data.delivery_latitude, data.delivery_longitude])
      } else {
          console.warn("No location in order.")
      }
      
      setLoading(false)

    } catch (error) {
      console.error("Tracking Error", error)
      setStatus("No Active Order")
      setLoading(false)
    }
  }

  // 2. 👇 NEW: Fetch Real Driving Route (OSRM API)
  const fetchRoadRoute = async (start, end) => {
      try {
          // OSRM requires "Lon,Lat" format (Opposite of Leaflet)
          const startStr = `${start[1]},${start[0]}`
          const endStr = `${end[1]},${end[0]}`
          
          const url = `https://router.project-osrm.org/route/v1/driving/${startStr};${endStr}?overview=full&geometries=geojson`
          
          console.log("Fetching Route from OSRM...")
          const response = await axios.get(url)
          
          const coordinates = response.data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]])
          
          setRoadPath(coordinates)
      } catch (error) {
          console.error("OSRM Routing Error:", error)
      }
  }

  // 3. Initial Load & WebSocket
  useEffect(() => {
    fetchOrderData()

    const ws = new WebSocket("ws://127.0.0.1:8000/ws/tracking")
    ws.onopen = () => console.log("✅ WebSocket Connected!")
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.status) {
            console.log("⚡ Live Update:", data.status)
            setStatus(data.status) 
        }
      } catch (err) { console.warn("WS Parse Error", err) }
    }

    return () => { if (ws.readyState === 1) ws.close() }
  }, [])


  // 4. Trigger Route Fetch when we have both points
  useEffect(() => {
      if (restaurantPos && customerPos) {
          fetchRoadRoute(restaurantPos, customerPos)
      }
  }, [restaurantPos, customerPos])

  // 5.  SMART DRIVER LOGIC (Snaps to Road!)
  useEffect(() => {
    if (!restaurantPos) return;

    if (status === 'OUT_FOR_DELIVERY' && roadPath.length > 0) {
        
        const middleIndex = Math.floor(roadPath.length / 2)
        setDriverPos(roadPath[middleIndex]) 
    } 
    else if (status === 'DELIVERED' && customerPos) {
        setDriverPos(customerPos)
    } 
    else {
        
        setDriverPos(restaurantPos)
    }
  }, [status, roadPath]) 

  
  if (loading) return <div style={{textAlign:'center', padding:'50px'}}>Loading Map... 🛰️</div>
  if (status === "No Active Order") return <div style={{textAlign:'center', padding:'50px'}}><h3>No active orders found.</h3></div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Navbar role="CUSTOMER" />

      <div className="container">
        
        {/* Status Header */}
        <div className="card" style={{ marginBottom: '20px', textAlign: 'center', borderLeft: `5px solid ${status === 'DELIVERED' ? 'green' : 'orange'}` }}>
            <h2 style={{ margin: 0, textTransform: 'uppercase', color: '#333' }}>
                {status.replace(/_/g, ' ')}
            </h2>
            <p style={{ color: '#666' }}>Order #{orderId}</p>
        </div>

        {/*  THE MAP */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '500px', borderRadius: '12px', border: '2px solid #ddd' }}>
            
            {restaurantPos && (
            <MapContainer center={restaurantPos} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />
                
                {/* 1. Restaurant */}
                <Marker position={restaurantPos} icon={restaurantIcon}>
                    <Popup><b>🍳 Kitchen</b><br/>Preparing food</Popup>
                </Marker>

                {/* 2. Customer */}
                {customerPos && (
                    <Marker position={customerPos} icon={homeIcon}>
                         <Popup><b>🏠 You</b><br/>Waiting for food</Popup>
                    </Marker>
                )}

                {/* 3. Driver */}
                {driverPos && (status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') && (
                    <Marker position={driverPos} icon={scooterIcon}>
                        <Popup><b>🛵 Driver</b><br/>On the way!</Popup>
                    </Marker>
                )}

                {/*  4. REAL ROAD PATH (No longer a straight dotted line!) */}
                {roadPath.length > 0 && (
                    <Polyline positions={roadPath} color="blue" weight={5} opacity={0.7} />
                )}
            
            </MapContainer>
            )}
        </div>
      </div>
    </div>
  )
}

export default OrderTracking
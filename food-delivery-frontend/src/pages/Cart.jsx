import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function Cart() {
  const [cartItems, setCartItems] = useState([])
  
  // 👇 NEW: State for Delivery Location
  const [location, setLocation] = useState({ lat: null, lng: null, address: '' })
  const [loadingLoc, setLoadingLoc] = useState(false)
  
  const [total, setTotal] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || "[]")
    setCartItems(savedCart)
    
    // Calculate Total
    const sum = savedCart.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0)
    setTotal(sum)
  }, [])

  // 👇 1. FUNCTION TO GET LIVE GPS
  const handleGetLocation = () => {
    setLoadingLoc(true)
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser")
      setLoadingLoc(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        // Update state with coordinates
        setLocation({ ...location, lat: lat, lng: lng })
        setLoadingLoc(false)
        // Auto-fill address field with a placeholder to confirm success
        if (!location.address) setLocation(prev => ({ ...prev, address: "GPS Location Set ✅" }))
      },
      (error) => {
        console.error("Error getting location:", error)
        alert("❌ Unable to retrieve your location. Please allow permissions.")
        setLoadingLoc(false)
      }
    )
  }

  const handlePayment = async () => {
    try {
      // 1. GET & CLEAN TOKEN
      let token = localStorage.getItem('token')
      if (token) token = token.replace(/^"|"$/g, '');

      if (!token) {
        alert("Please login to place an order")
        navigate('/login')
        return
      }

      if (cartItems.length === 0) return alert("Cart is empty!")

      // 👇 2. VALIDATE LOCATION BEFORE PAYING
      if (!location.lat || !location.lng) {
        alert("Please set your delivery location first! 📍")
        // Scroll to top or highlight the location box could go here
        return
      }

      const restaurantId = cartItems[0].restaurant_id

      const orderData = {
        restaurant_id: restaurantId,
        items: cartItems.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity || 1
        })),
        // 👇 SEND LOCATION DATA TO BACKEND
        delivery_latitude: location.lat,
        delivery_longitude: location.lng,
        delivery_address: location.address || "Live GPS Location"
      }

      // 3. Initiate Payment
      console.log("Initiating Payment with Token:", token)
      
      const { data } = await axios.post('http://127.0.0.1:8000/orders/initiate', orderData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // 4. Open Razorpay
      const options = {
        key: data.key_id, 
        amount: data.amount,
        currency: data.currency,
        name: "Food Delivery App",
        description: "Payment for Order",
        order_id: data.order_id, 
        
        handler: async function (response) {
            console.log("Payment Succeeded! Verifying with Backend...")
            
            try {
                // 5. Verify on Backend
                const verifyRes = await axios.post('http://127.0.0.1:8000/orders/verify', {
                    payment: {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    },
                    order: orderData
                }, { headers: { Authorization: `Bearer ${token}` } })

                console.log("Backend Verification Success:", verifyRes.data)
                
                // Clear Cart & Redirect
                localStorage.removeItem('cart')
                setCartItems([])
                navigate('/tracking') 
                
            } catch (err) {
                console.error("Backend Verification Failed:", err)
                alert("Critical Error: Payment happened but Order Save failed! Check Console.")
            }
        },
        theme: { color: "#e23744" }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();

    } catch (error) {
      console.error("Initialization Error:", error)
      if (error.response && error.response.status === 401) {
          alert("Session Expired. Please Login Again.")
          navigate('/login')
      } else {
          alert("Could not start payment. Check Console.")
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Navbar role="CUSTOMER" />

      <div className="container" style={{ maxWidth: '600px' }}>
        
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
            🛒 Your Cart
        </h2>

        {cartItems.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '50px' }}>
                <h3 style={{ color: '#888' }}>Cart is Empty 😢</h3>
                <button 
                    className="btn btn-primary" 
                    style={{ marginTop: '20px' }}
                    onClick={() => navigate('/')}
                >
                    Browse Restaurants
                </button>
            </div>
        ) : (
            <>
                {/* 1. Items List */}
                <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
                    <div style={{ background: '#eee', padding: '15px 20px', fontWeight: 'bold', color: '#555' }}>
                        Order Summary
                    </div>
                    <div style={{ padding: '20px' }}>
                        {cartItems.map((item, index) => (
                            <div key={index} style={{ 
                                display: 'flex', justifyContent: 'space-between', padding: '12px 0',
                                borderBottom: index !== cartItems.length - 1 ? '1px solid #f0f0f0' : 'none'
                            }}>
                                <div>
                                    <span style={{ fontWeight: 'bold', color: '#333' }}>{item.quantity || 1} x </span>
                                    <span style={{ color: '#555' }}>{item.name}</span>
                                </div>
                                <span style={{ fontWeight: '600', color: '#333' }}>
                                    ₹{item.price * (item.quantity || 1)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 👇 2. LOCATION CARD (New UI) */}
                <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 15px 0' }}>📍 Delivery Address</h4>
                    
                    <button 
                        onClick={handleGetLocation} 
                        className="btn btn-outline btn-block" 
                        disabled={loadingLoc}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                        {loadingLoc ? "Finding you..." : "📍 Use My Current Location"}
                    </button>
                    
                    {location.lat && (
                        <p style={{ color: 'green', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>
                            ✅ GPS Coordinates Set: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </p>
                    )}
                    
                    <input 
                        type="text" 
                        placeholder="House / Flat No / Landmark (Optional)"
                        value={location.address}
                        onChange={(e) => setLocation({...location, address: e.target.value})}
                        style={{ 
                            display: 'block', width: '100%', padding: '12px', marginTop: '15px', 
                            borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' 
                        }}
                    />
                </div>

                {/* 3. Total & Pay Button */}
                <div className="card" style={{ padding: '20px', background: '#fcfcfc', borderTop: '2px dashed #ddd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', marginBottom: '20px' }}>
                        <span style={{ fontWeight: 'bold' }}>Total Payable</span>
                        <span style={{ color: '#2e7d32', fontWeight: '800', fontSize: '22px' }}>₹{total}</span>
                    </div>
                    
                    <button 
                        className="btn btn-success btn-block" 
                        style={{ padding: '15px', fontSize: '18px' }}
                        onClick={handlePayment}
                    >
                        Proceed to Pay ➔
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  )
}

export default Cart
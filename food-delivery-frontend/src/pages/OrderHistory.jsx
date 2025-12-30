import { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'

function OrderHistory() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // 1. Fetch Orders
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('http://127.0.0.1:8000/orders/my-orders', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setOrders(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 2. 👇 NEW: DELETE LOGIC
  const handleDelete = async (orderId) => {
    if(!window.confirm("Are you sure you want to delete this order from your history?")) return;

    try {
        const token = localStorage.getItem('token')
        // Call the new backend endpoint we made
        await axios.delete(`http://127.0.0.1:8000/orders/${orderId}/customer`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        
        // Remove from list instantly
        setOrders(orders.filter(o => o.id !== orderId))
        alert("🗑️ Order deleted.")
    } catch (error) {
        console.error(error)
        alert("Could not delete order.")
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Navbar role="CUSTOMER" />

      <div className="container" style={{ maxWidth: '800px' }}>
        <h2 style={{ marginBottom: '20px', borderLeft: '5px solid var(--primary)', paddingLeft: '15px' }}>
            📜 Order History
        </h2>

        {loading ? <p>Loading history...</p> : orders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#777' }}>
                <h3>No past orders found 🕸️</h3>
                <p>Go order some delicious food!</p>
            </div>
        ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
                {orders.map(order => (
                    <div key={order.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px' }}>
                        
                        {/* Left: Restaurant Info */}
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div style={{ 
                                width: '50px', height: '50px', background: '#eee', borderRadius: '8px', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' 
                            }}>
                                🍔
                            </div>
                            <div>
                                <h4 style={{ margin: 0 }}>{order.restaurant?.name || "Unknown Restaurant"}</h4>
                                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#888' }}>
                                    {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>

                        {/* Right: Price, Status & DELETE */}
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0' }}>₹{order.total_amount}</h3>
                                <span className={`badge ${
                                    order.status === 'DELIVERED' ? 'bg-green' : 
                                    order.status === 'PENDING' ? 'bg-orange' : 'bg-blue'
                                }`}>
                                    {order.status}
                                </span>
                            </div>

                            {/* 👇 NEW: DELETE BUTTON (Only shows if completed) */}
                            {(order.status === 'DELIVERED' || order.status === 'CANCELLED') && (
                                <button 
                                    onClick={() => handleDelete(order.id)}
                                    className="btn btn-outline-danger btn-sm"
                                    style={{ fontSize: '12px', padding: '5px 10px' }}
                                >
                                    🗑️ Delete
                                </button>
                            )}
                        </div>

                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  )
}

export default OrderHistory
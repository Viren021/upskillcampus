import { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'

function OrderHistory() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
                    <div key={order.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        
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

                        {/* Right: Price & Status */}
                        <div style={{ textAlign: 'right' }}>
                            <h3 style={{ margin: '0 0 5px 0' }}>₹{order.total_amount}</h3>
                            <span className={`badge ${
                                order.status === 'DELIVERED' ? 'bg-green' : 
                                order.status === 'PENDING' ? 'bg-orange' : 'bg-blue'
                            }`}>
                                {order.status}
                            </span>
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
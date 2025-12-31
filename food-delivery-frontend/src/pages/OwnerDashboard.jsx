import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function OwnerDashboard() {
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([]) 
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Helper to fetch data
  const refreshData = async () => {
    try {
      const token = localStorage.getItem('token')
      const role = localStorage.getItem('role')

      // 1. Security Check: Must be an OWNER
      if (role !== 'OWNER') { 
          alert("Access Denied: You are not an Owner.")
          navigate('/')
          return
      }

      const config = { headers: { Authorization: `Bearer ${token}` } }
      
      // 2. Fetch Analytics
      try {
        const statsReq = await axios.get('http://127.0.0.1:8000/analytics/peak-hours', config)
        setStats(statsReq.data)
      } catch (err) {
        console.warn("Analytics loading failed", err)
      }
      
      // 3. Fetch Live Orders
      const ordersReq = await axios.get('http://127.0.0.1:8000/orders/owner/orders', config)

      setOrders(ordersReq.data)
      setLoading(false)

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setLoading(false)
      
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          localStorage.removeItem('token')
          localStorage.removeItem('role')
          window.location.href = '/login'
      }
    }
  }

  // Initial Load + Auto-Refresh
  useEffect(() => {
    refreshData()
    const interval = setInterval(refreshData, 10000) 
    return () => clearInterval(interval)
  }, [navigate])

  // Function to Accept/Update Order
  const handleStatusChange = async (orderId, newStatus) => {
      try {
        const token = localStorage.getItem('token')
        await axios.patch(`http://127.0.0.1:8000/orders/${orderId}/status`, 
            { status: newStatus }, 
            { headers: { Authorization: `Bearer ${token}` } }
        )
        refreshData() 
      } catch (error) {
          console.error(error)
          alert("Failed to update status. Check console.")
      }
  }

  // 👇 NEW: DELETE ORDER FUNCTION
  const handleDeleteOrder = async (orderId) => {
    if(!window.confirm("⚠️ Are you sure you want to delete this order record? This cannot be undone.")) return;

    try {
        const token = localStorage.getItem('token')
        await axios.delete(`http://127.0.0.1:8000/orders/${orderId}/owner`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        
        // Remove from UI instantly
        setOrders(orders.filter(o => o.id !== orderId))
        alert("🗑️ Order record deleted.")
    } catch (error) {
        console.error(error)
        alert("Failed to delete order. It might still be active.")
    }
  }
  
  const handleLogout = () => {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      navigate('/login')
  }

  if (loading) return (
    <div style={{minHeight:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>
        <h2>Loading Dashboard... ⏳</h2>
    </div>
  )

  return (
    <div style={{ background: '#f4f6f8', minHeight: '100vh' }}>
      <Navbar role="OWNER" /> 

      <div className="container">
        
        {/* Header */}
        <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h1 style={{ margin: '0 0 10px 0' }}>👨‍🍳 Dashboard</h1>
                <p style={{ color: '#666', margin: 0 }}>Managing: <strong>{stats?.restaurant || "Loading..."}</strong></p>
            </div>

            <button 
                className="btn btn-primary" 
                style={{ marginRight: '10px' }}
                onClick={() => navigate('/add-menu')}
                >
                ➕ Add New Item
            </button>
            <button 
                onClick={handleLogout}
                className="btn"
                style={{ background: '#333', color: 'white' }}
            >
                Logout
            </button>
        </div>

        {/* KPI Cards */}
        <div className="grid-3" style={{ marginBottom: '40px' }}>
          <div className="card" style={{ borderLeft: '5px solid var(--blue)' }}>
            <h4 style={{ margin: 0, color: '#777', textTransform: 'uppercase', fontSize: '12px' }}>Total Orders</h4>
            <h1 style={{ fontSize: '42px', margin: '10px 0', color: 'var(--secondary)' }}>{orders.length}</h1>
          </div>
          <div className="card" style={{ borderLeft: '5px solid var(--green)' }}>
            <h4 style={{ margin: 0, color: '#777', textTransform: 'uppercase', fontSize: '12px' }}>Total Revenue</h4>
            <h1 style={{ fontSize: '42px', margin: '10px 0', color: 'var(--green)' }}>
               ₹{stats?.total_revenue || orders.reduce((sum, order) => sum + order.total_amount, 0)}
            </h1>
          </div>
          <div className="card" style={{ borderLeft: '5px solid var(--orange)' }}>
            <h4 style={{ margin: 0, color: '#777', textTransform: 'uppercase', fontSize: '12px' }}>Top Selling Item</h4>
            <h3 style={{ margin: '15px 0', color: 'var(--orange)' }}>{stats?.top_item || "Calculating..."}</h3>
          </div>
        </div>

        {/* Live Orders Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ width: '10px', height: '10px', background: 'red', borderRadius: '50%', marginRight: '10px', boxShadow: '0 0 5px red' }}></div>
            <h2 style={{ margin: 0 }}>Live Orders Feed</h2>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                <h3>No active orders right now 😴</h3>
                <p>Wait for new orders to appear here automatically.</p>
            </div>
        ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
            {orders.map(order => (
                <div key={order.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                
                {/* Order Info */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0 }}>Order #{order.id}</h3>
                        <span className={`badge ${
                            order.status === 'PENDING' ? 'bg-orange' : 
                            order.status === 'DELIVERED' ? 'bg-green' : 'bg-blue'
                        }`}>
                            {order.status}
                        </span>
                    </div>
                    <p style={{ color: '#777', margin: 0, fontSize: '14px' }}>
                        {new Date(order.created_at).toLocaleString()} • 
                        <strong style={{ color: 'var(--secondary)' }}> ₹{order.total_amount}</strong>
                    </p>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    
                    {/* Workflow Buttons */}
                    {order.status === 'PENDING' && (
                    <button className="btn btn-success" onClick={() => handleStatusChange(order.id, 'PREPARING')}>
                        ✅ Accept
                    </button>
                    )}
                    {order.status === 'PREPARING' && (
                    <button className="btn btn-primary" onClick={() => handleStatusChange(order.id, 'OUT_FOR_DELIVERY')}>
                        🛵 Send Driver
                    </button>
                    )}
                    {order.status === 'OUT_FOR_DELIVERY' && (
                    <button className="btn btn-outline" onClick={() => handleStatusChange(order.id, 'DELIVERED')}>
                        🏁 Complete
                    </button>
                    )}
                    {order.status === 'DELIVERED' && (
                    <span style={{ color: 'var(--green)', fontWeight: 'bold', border: '1px solid var(--green)', padding: '5px 10px', borderRadius: '5px' }}>
                        Completed ✨
                    </span>
                    )}

                    {/* 👇 NEW: DELETE BUTTON (Visible for ALL orders) */}
                    <button 
                        className="btn btn-sm btn-outline-danger" 
                        onClick={() => handleDeleteOrder(order.id)}
                        title="Delete Order Record"
                        style={{ marginLeft: '10px', padding: '8px 12px' }}
                    >
                        🗑️
                    </button>

                </div>

                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  )
}

export default OwnerDashboard
import { useNavigate } from 'react-router-dom'

function Navbar({ role }) {
  const navigate = useNavigate()
  
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    
    // The 'cart' key remains in localStorage! 🛒
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="logo" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
        🍕 FoodDelivery
      </div>
      <div className="nav-links">
        {role === 'OWNER' ? (
           <span style={{fontWeight:'bold', color:'var(--primary)'}}>Owner Mode</span>
        ) : (
           <>
             <button onClick={() => navigate('/')}>Home</button>
             <button onClick={() => navigate('/cart')}>Cart 🛒</button>
             <button onClick={() => navigate('/my-orders')}>My Orders 📜</button>
             <button onClick={() => navigate('/tracking')}>Track Order 🛵</button>
           </>
        )}
        <button onClick={handleLogout} style={{color:'red'}}>Logout ➔</button>
      </div>
    </nav>
  )
}

export default Navbar
import { useNavigate } from 'react-router-dom'

function Navbar({ role }) {
  const navigate = useNavigate()
  
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    // Optional: Clear cart on logout so the next user doesn't see it
    localStorage.removeItem('cart') 
    navigate('/login')
  }

  // Smart Logo Redirect based on Role
  const handleLogoClick = () => {
      if (role === 'DRIVER') navigate('/driver')
      else if (role === 'OWNER') navigate('/owner')
      else navigate('/')
  }

  return (
    <nav className="navbar">
      {/* 1. Logo with Smart Redirect */}
      <div className="logo" onClick={handleLogoClick} style={{cursor:'pointer'}}>
        🍕 FoodDelivery
      </div>

      <div className="nav-links">
        
        {/* =========================================
            🚀 SCENARIO 1: CUSTOMER VIEW (Default)
            (Only show these links if role is NOT Driver/Owner)
           ========================================= */}
        {role !== 'OWNER' && role !== 'DRIVER' && (
           <>
             <button onClick={() => navigate('/')}>Home</button>
             <button onClick={() => navigate('/cart')}>Cart 🛒</button>
             <button onClick={() => navigate('/my-orders')}>My Orders 📜</button>
             {/* Note: Tracking is usually accessed via My Orders, but kept here if you want direct access */}
             {/* <button onClick={() => navigate('/tracking')}>Track Order 🛵</button> */}
           </>
        )}

        {/* =========================================
            👨‍🍳 SCENARIO 2: OWNER VIEW
           ========================================= */}
        {role === 'OWNER' && (
           <span style={{fontWeight:'bold', color:'#0d6efd', marginRight:'15px', border:'1px solid #0d6efd', padding:'5px 10px', borderRadius:'5px'}}>
             👨‍🍳 Manager Mode
           </span>
        )}

        {/* =========================================
            🛵 SCENARIO 3: DRIVER VIEW
           ========================================= */}
        {role === 'DRIVER' && (
           <span style={{fontWeight:'bold', color:'#ffc107', marginRight:'15px', border:'1px solid #ffc107', padding:'5px 10px', borderRadius:'5px'}}>
             🚖 Driver Console
           </span>
        )}

        {/* 3. Logout Button (Always Visible) */}
        <button onClick={handleLogout} style={{color:'red', fontWeight:'bold'}}>Logout ➔</button>
      </div>
    </nav>
  )
}

export default Navbar
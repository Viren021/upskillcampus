import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../components/Navbar'

function Menu() {
  const { id } = useParams() 
  const [menu, setMenu] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    //  SAFETY CHECK: Don't call API if ID is missing or broken
    if (!id || id === 'undefined') {
        console.warn("No Restaurant ID found in URL")
        return
    }

    axios.get(`http://127.0.0.1:8000/menu/${id}`)
      .then(res => setMenu(res.data))
      .catch(err => console.error("Menu Fetch Error:", err))
  }, [id])

  const addToCart = (item) => {
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]')
    const existing = currentCart.find(i => i.id === item.id)
    
    // Check if user is ordering from a different restaurant
    if (currentCart.length > 0 && currentCart[0].restaurant_id !== id) {
        if (!confirm("Start a new cart? You can only order from one restaurant at a time.")) return
        localStorage.removeItem('cart') // Clear old cart
        currentCart.length = 0 
    }

    if (existing) {
        existing.quantity += 1
    } else {
        currentCart.push({ ...item, quantity: 1, restaurant_id: id }) 
    }
    
    localStorage.setItem('cart', JSON.stringify(currentCart))
    
    if(confirm(`${item.name} added! View Cart?`)) {
        navigate('/cart')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Navbar role="CUSTOMER" />

      <div className="container">
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ borderBottom: '3px solid var(--primary)', paddingBottom: '5px' }}>
                📜 Menu
            </h2>
            <button className="btn btn-outline" onClick={() => navigate('/')}>
                ← Back
            </button>
        </div>

        {/* Grid Layout */}
        <div className="grid-3">
          {menu.map(item => (
            <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              
              {/* Image */}
              <div style={{ height: '180px', overflow: 'hidden' }}>
                  <img 
                    src={item.image_url || "https://placehold.co/400x300?text=Yummy+Food"} 
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
              </div>

              {/* Info */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{item.name}</h3>
                    <span className="badge bg-green">Veg</span>
                </div>
                <p style={{ color: '#777', fontSize: '13px', lineHeight: '1.5', flex: 1 }}>
                    {item.description}
                </p>

                {/* Price & Button */}
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                    <h3 style={{ margin: 0, color: '#333' }}>₹{item.price}</h3>
                    <button 
                        className="btn btn-outline" 
                        onClick={() => addToCart(item)}
                        style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    >
                        ADD +
                    </button>
                </div>
              </div>

            </div>
          ))}
        </div>

        {menu.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                <h3>No items found or Loading... ⏳</h3>
            </div>
        )}
      </div>
    </div>
  )
}

export default Menu
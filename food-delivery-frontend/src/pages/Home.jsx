import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar' // 👈 Import Navbar

function Home() {
  const [restaurants, setRestaurants] = useState([])
  const [recommendations, setRecommendations] = useState([]) 
  const [searchTerm, setSearchTerm] = useState("") 
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get & Clean Token
        let token = localStorage.getItem('token')
        if (token) token = token.replace(/^"|"$/g, ''); 

        if (!token) {
          navigate('/login')
          return
        }

        const config = { headers: { Authorization: `Bearer ${token}` } }

        // A. Fetch All Restaurants 
        const resResponse = await axios.get('http://127.0.0.1:8000/restaurants/', config)
        setRestaurants(resResponse.data)

        // B. Fetch AI Recommendations
        try {
            const recResponse = await axios.get('http://127.0.0.1:8000/orders/recommend', config)
            setRecommendations(recResponse.data)
        } catch (aiError) {
            console.log("AI Recommendations skipped")
        }

      } catch (error) {
        console.error("❌ Error fetching data:", error)
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            navigate('/login'); 
        }
      }
    }

    fetchData()
  }, [navigate])

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* 1. The New Navbar */}
      <Navbar role="CUSTOMER" />

      {/* 2. Hero Section */}
      <div style={{ 
          background: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white', 
          padding: '80px 20px', 
          textAlign: 'center', 
          marginBottom: '30px' 
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '15px' }}>Hungry? 🍔</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '30px' }}>Order from the best restaurants near you.</p>
        
        {/* Search Bar */}
        <input 
            type="text" 
            placeholder="🔍 Search for restaurants (e.g. Pizza, Burger)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
            style={{
                padding: '15px 25px',
                width: '100%',
                maxWidth: '600px',
                borderRadius: '50px',
                border: 'none',
                fontSize: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                outline: 'none'
            }}
        />
      </div>

      <div className="container">

        {/* 3. AI Recommendations (Horizontal Scroll) */}
        {recommendations.length > 0 && (
          <div style={{ marginBottom: '50px' }}>
            <h2 style={{ marginBottom: '20px', borderLeft: '5px solid var(--orange)', paddingLeft: '15px' }}>
                🤖 Recommended For You
            </h2>
            
            <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '15px' }}>
              {recommendations.map((item) => (
                <div key={item.id} className="card" style={{ 
                    minWidth: '220px', 
                    padding: '0', 
                    overflow: 'hidden', 
                    flexShrink: 0 
                }}>
                  <div style={{ height: '120px', background: '#eee', overflow: 'hidden' }}>
                      <img src={item.image_url || "https://placehold.co/300x200?text=Yum"} alt={item.name} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                  </div>
                  <div style={{ padding: '15px' }}>
                      <h4 style={{ margin: '0 0 5px 0' }}>{item.name}</h4>
                      <p style={{ fontSize: '12px', color: '#777', margin: 0 }}>Try this today!</p>
                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>₹{item.price}</span>
                          <button className="btn btn-outline" style={{padding:'5px 10px', fontSize:'12px'}}>View</button>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Restaurant Grid */}
        <h2 style={{ marginBottom: '20px', borderLeft: '5px solid var(--primary)', paddingLeft: '15px' }}>
            🍽️ Popular Restaurants
        </h2>

        <div className="grid-3">
          {restaurants
            .filter((val) => {
              if (searchTerm === "") return val;
              if (val.name.toLowerCase().includes(searchTerm)) return val;
              return null;
            })
            .map((r) => (
            <div key={r.id} className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => navigate(`/menu/${r.id}`)}>
              {/* Image */}
              <div style={{ height: '200px', overflow: 'hidden', position: 'relative' }}>
                 <img 
                    src={r.image_url || "https://placehold.co/600x400?text=Restaurant"} 
                    alt={r.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                 />
                 <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'white', padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    ⏱️ 30 mins
                 </div>
              </div>
              
          
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px' }}>{r.name}</h3>
                    <span className="badge bg-green">4.5 ★</span>
                </div>
                
                <p style={{ color: '#777', fontSize: '14px', margin: '5px 0 15px 0' }}>📍 {r.address}</p>
                
                <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {r.is_open ? 
                    <span style={{ color: 'var(--green)', fontWeight: 'bold', fontSize: '14px' }}>● Open Now</span> : 
                    <span style={{ color: 'red', fontWeight: 'bold', fontSize: '14px' }}>● Closed</span>
                  }
                  <span style={{ color: 'var(--blue)', fontWeight: '600', fontSize: '14px' }}>View Menu ➔</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {restaurants.filter(r => r.name.toLowerCase().includes(searchTerm)).length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
                <h3>No restaurants found matching "{searchTerm}" 😢</h3>
            </div>
        )}

      </div>
    </div>
  )
}

export default Home
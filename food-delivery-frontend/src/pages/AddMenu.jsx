import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function AddMenu() {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [desc, setDesc] = useState("")
  const [category, setCategory] = useState("Fast Food")
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null) // To show image preview
  const navigate = useNavigate()

  const handleImageChange = (e) => {
      const file = e.target.files[0]
      if (file) {
          setImage(file)
          setPreview(URL.createObjectURL(file)) // Create a preview URL
      }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!image) { alert("Please select an image!"); return; }

    try {
        const token = localStorage.getItem('token')
        const formData = new FormData()
        formData.append('name', name)
        formData.append('price', price)
        formData.append('description', desc)
        formData.append('category', category)
        formData.append('image', image)

        await axios.post('http://127.0.0.1:8000/menu/add', formData, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        })
        alert("✅ New Dish Added Successfully!")
        navigate('/owner')

    } catch (error) {
        console.error(error)
        alert("Failed to add item.")
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f8' }}>
      <Navbar role="OWNER" />
      
      <div className="container" style={{ display: 'flex', justifyContent: 'center', marginTop: '40px', paddingBottom: '40px' }}>
        
        {/* 🎨 CARD CONTAINER */}
        <div className="card" style={{ 
            width: '100%', 
            maxWidth: '500px', 
            background: 'white', 
            padding: '30px', 
            borderRadius: '15px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
        }}>
            
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <h2 style={{ color: '#333', fontWeight: 'bold' }}>🍳 Add New Item</h2>
                <p style={{ color: '#777' }}>Expand your restaurant's menu</p>
            </div>
            
            <form onSubmit={handleSubmit}>
                
                {/* 1. Name */}
                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#555' }}>Dish Name</label>
                    <input 
                        type="text" 
                        required 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="e.g. Spicy Pepperoni Pizza" 
                        style={inputStyle}
                    />
                </div>

                {/* 2. Price & Category Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#555' }}>Price (₹)</label>
                        <input 
                            type="number" 
                            required 
                            value={price} 
                            onChange={e => setPrice(e.target.value)} 
                            placeholder="299" 
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#555' }}>Category</label>
                        <select 
                            value={category} 
                            onChange={e => setCategory(e.target.value)}
                            style={inputStyle}
                        >
                            <option>Fast Food</option>
                            <option>Drinks</option>
                            <option>Dessert</option>
                            <option>Main Course</option>
                            <option>Starters</option>
                        </select>
                    </div>
                </div>

                {/* 3. Description */}
                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#555' }}>Description</label>
                    <textarea 
                        required 
                        rows="3"
                        value={desc} 
                        onChange={e => setDesc(e.target.value)} 
                        placeholder="Describe the ingredients and taste..." 
                        style={{...inputStyle, resize: 'none'}}
                    />
                </div>

                {/* 4. IMAGE UPLOAD PREVIEW */}
                <div className="form-group" style={{ marginBottom: '25px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#555' }}>Food Image</label>
                    
                    <div style={{ 
                        border: '2px dashed #ddd', 
                        borderRadius: '10px', 
                        padding: '20px', 
                        textAlign: 'center',
                        background: '#fafafa',
                        cursor: 'pointer',
                        position: 'relative'
                    }}>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageChange} 
                            required
                            style={{ 
                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' 
                            }}
                        />
                        {preview ? (
                            <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                        ) : (
                            <div style={{ color: '#888' }}>
                                <span style={{ fontSize: '24px' }}>📸</span>
                                <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>Click to Upload Image</p>
                            </div>
                        )}
                    </div>
                </div>

                <button 
                    type="submit" 
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'linear-gradient(45deg, #ff416c, #ff4b2b)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(255, 75, 43, 0.4)'
                    }}
                >
                    🚀 Add to Menu
                </button>
            </form>
        </div>
      </div>
    </div>
  )
}

// 🖌️ Common Input Style
const inputStyle = {
    width: '100%',
    padding: '10px 15px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
    background: '#fff',
    outline: 'none',
    transition: 'border 0.3s'
}

export default AddMenu
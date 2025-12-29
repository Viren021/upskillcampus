import { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleLogin = async () => {
    try {
      const formData = new FormData()
      formData.append('username', email)
      formData.append('password', password)

      // Calls the Async Backend
      const response = await axios.post('http://127.0.0.1:8000/login', formData)
      
      //  DEBUG: See what the backend actually sent
      console.log("Login Success! Role from Server:", response.data.role)

      // Save Token & Role
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('role', response.data.role)

      // Redirect based on Role
      
      if (response.data.role === "OWNER") {
        window.location.href = '/owner' 
      } else {
        window.location.href = '/'
      }

    } catch (error) {
      console.error(error)
      alert("Login Failed! Check your email and password.")
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>

      <div style={styles.glassCard}>
        <h1 style={styles.title}>Welcome Back! 🍕</h1>
        <p style={styles.subtitle}>Login to satisfy your cravings</p>
        
        {/* --- FORM --- */}
        <input 
          type="email" 
          placeholder="Email Address" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />
        
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button 
          onClick={handleLogin}
          style={styles.button}
          onMouseOver={(e) => e.target.style.background = '#e64a00'}
          onMouseOut={(e) => e.target.style.background = '#ff5200'}
        >
          LOGIN
        </button>

        <p style={styles.footerText}>
          New here? <Link to="/signup" style={styles.link}>Create an Account</Link>
        </p>
      </div>
    </div>
  )
}


const styles = {
  container: {
    height: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundImage: "url('https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    fontFamily: "'Segoe UI', sans-serif"
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    zIndex: 1
  },
  glassCard: {
    position: 'relative',
    zIndex: 2,
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    color: 'white'
  },
  title: { marginBottom: '10px', fontSize: '28px', fontWeight: 'bold', color: '#fff' },
  subtitle: { marginBottom: '30px', fontSize: '16px', color: '#ddd' },
  input: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    fontSize: '16px',
    outline: 'none',
    marginBottom: '20px',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#ff5200',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '10px',
    transition: 'background 0.3s'
  },
  footerText: { marginTop: '20px', fontSize: '14px', color: '#ddd' },
  link: { color: '#ff9e80', textDecoration: 'none', fontWeight: 'bold' }
}

export default Login
import { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  
  // OTP States
  const [otp, setOtp] = useState('')
  const [isOtpSent, setIsOtpSent] = useState(false)
  
  const navigate = useNavigate()

  // 1. Send OTP to Phone
  const handleSendOtp = async () => {
    if (phone.length < 10) return alert("Please enter a valid phone number")
    
    try {
      // Calls the Async Backend
      await axios.post(`http://127.0.0.1:8000/users/send-otp?phone_number=${phone}`)
      setIsOtpSent(true)
      alert(`OTP Sent to ${phone}! Check your backend terminal.`)
    } catch (error) {
      console.error(error)
      alert("Failed to send OTP.")
    }
  }

  // 2. Register with Verified OTP
  const handleSignup = async () => {
    try {
      const userData = { 
          email, 
          password, 
          phone_number: phone, 
          role: "CUSTOMER" 
      }
      
      // Send OTP in query param, Data in body
      await axios.post(`http://127.0.0.1:8000/users/?otp=${otp}`, userData)
      
      alert("Account Created Successfully!")
      navigate('/login')
    } catch (error) {
      alert(error.response?.data?.detail || "Signup Failed!")
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>
      <div style={styles.glassCard}>
        <h1 style={styles.title}>Create Account 🍔</h1>
        <p style={styles.subtitle}>Join us for delicious food!</p>

        {/* PHONE INPUT + VERIFY BUTTON */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
             <input 
               type="text" 
               placeholder="Phone Number" 
               value={phone}
               onChange={(e) => setPhone(e.target.value)}
               style={{ ...styles.input, marginBottom: 0, flex: 1 }}
               disabled={isOtpSent} 
             />
             
             {!isOtpSent && (
                 <button 
                    onClick={handleSendOtp} 
                    style={{ ...styles.button, width: '100px', marginTop: 0, background: '#28a745' }}
                 >
                    Verify
                 </button>
             )}
        </div>

        {/* OTP INPUT (Hidden until sent) */}
        {isOtpSent && (
          <div style={{ marginBottom: '15px' }}>
              <input 
                type="text" 
                placeholder="Enter OTP Code" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ ...styles.input, border: '2px solid #28a745', textAlign: 'center' }}
              />
              <small style={{color: '#90ee90', display: 'block', marginBottom: '10px'}}>
                ✅ Check your VS Code Terminal for the code
              </small>
          </div>
        )}
        
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

        {/* FINISH BUTTON (Only if OTP sent) */}
        {isOtpSent && (
            <button 
            onClick={handleSignup} 
            style={styles.button}
            onMouseOver={(e) => e.target.style.background = '#e64a00'}
            onMouseOut={(e) => e.target.style.background = '#ff5200'}
            >
            FINISH SIGNUP
            </button>
        )}

        <p style={styles.footerText}>
          Already have an account? <Link to="/login" style={styles.link}>Login here</Link>
        </p>
      </div>
    </div>
  )
}

// --- STYLES (Same as Login to keep consistent look) ---
const styles = {
    container: { height: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundImage: "url('https://images.unsplash.com/photo-1561758033-d89a9ad46330?q=80&w=2070&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', fontFamily: "'Segoe UI', sans-serif" },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1 },
    glassCard: { position: 'relative', zIndex: 2, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px', textAlign: 'center', color: 'white' },
    title: { marginBottom: '10px', fontSize: '28px', fontWeight: 'bold', color: '#fff' },
    subtitle: { marginBottom: '20px', fontSize: '16px', color: '#ddd' },
    input: { width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.3)', background: 'rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '16px', outline: 'none', marginBottom: '15px', boxSizing: 'border-box' },
    button: { width: '100%', padding: '14px', background: '#ff5200', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', marginTop: '10px', transition: 'background 0.3s' },
    footerText: { marginTop: '20px', fontSize: '14px', color: '#ddd' },
    link: { color: '#ff9e80', textDecoration: 'none', fontWeight: 'bold' }
}

export default Signup
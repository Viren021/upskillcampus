import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

function DriverDashboard() {
  const navigate = useNavigate();
  
  // State
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("update"); // 'update' or 'status'

  // 🔒 SECURITY CHECK (The Bouncer)
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "DRIVER" && role !== "OWNER") {
      alert("🚫 ACCESS DENIED: This page is for Drivers only.");
      navigate("/"); // Kick them back to home
    }
  }, [navigate]);

  // 👇 FUNCTION TO SEND MESSAGE
  const sendUpdate = async (msgText) => {
    if (!orderId) return alert("⚠️ Please enter the Active Order ID first.");
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://127.0.0.1:8000/orders/${orderId}/driver-location`, {
        latitude: 19.0760,   // Mock GPS
        longitude: 72.8777,
        distance_text: "2 km",
        time_text: "5 mins",
        message: msgText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Show success feedback
      const successBanner = document.getElementById("success-banner");
      successBanner.style.display = "block";
      setTimeout(() => successBanner.style.display = "none", 3000);
      
      setMessage(""); 
    } catch (error) {
      console.error(error);
      alert("❌ Failed. Check Order ID.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f4f7f6" }}>
      <Navbar role="DRIVER" />
      
      <div className="container" style={{ maxWidth: "480px", paddingTop: "20px" }}>
        
        {/* 🟢 Success Banner (Hidden by default) */}
        <div id="success-banner" className="alert alert-success text-center shadow-sm" style={{ display: 'none', position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 999, width: '90%', maxWidth: '400px' }}>
            ✅ Message Sent to Customer!
        </div>

        {/* 📱 Mobile App Card Style */}
        <div className="card border-0 shadow-lg overflow-hidden" style={{ borderRadius: "20px" }}>
          
          {/* Header */}
          <div className="card-header bg-dark text-white p-4 text-center">
            <h4 className="mb-0">🛵 Delivery Console</h4>
            <small className="text-white-50">Manage your active run</small>
          </div>

          <div className="card-body p-4">
            
            {/* 1. Order ID Input (Big & Bold) */}
            <div className="mb-4">
                <label className="text-muted small fw-bold mb-1">ACTIVE ORDER ID</label>
                <input 
                  type="number" 
                  className="form-control form-control-lg text-center fw-bold text-primary" 
                  style={{ fontSize: "2rem", height: "60px", borderRadius: "12px", border: "2px solid #e0e0e0" }}
                  placeholder="#"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
            </div>

            <hr className="my-4" style={{ opacity: 0.1 }} />

            {/* 2. Quick Actions (Chips) */}
            <label className="text-muted small fw-bold mb-2">QUICK UPDATES</label>
            <div className="d-grid gap-2 mb-3">
                <button className="btn btn-outline-primary py-2 fw-bold" style={{borderRadius: '10px'}} onClick={() => sendUpdate("I have arrived at the restaurant 🏢")}>
                    🏢 Arrived at Restaurant
                </button>
                <button className="btn btn-outline-success py-2 fw-bold" style={{borderRadius: '10px'}} onClick={() => sendUpdate("Food picked up! On my way 🥡")}>
                    🥡 Food Picked Up
                </button>
                <button className="btn btn-outline-danger py-2 fw-bold" style={{borderRadius: '10px'}} onClick={() => sendUpdate("I am outside your location 📍")}>
                    📍 I've Arrived at Drop-off
                </button>
            </div>

            {/* 3. Custom Message */}
            <div className="mt-4">
                <label className="text-muted small fw-bold mb-2">CUSTOM MESSAGE</label>
                <div className="input-group">
                    <input 
                        type="text" 
                        className="form-control"
                        placeholder="Type message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        style={{ borderRadius: "10px 0 0 10px", border: "1px solid #ced4da" }}
                    />
                    <button 
                        className="btn btn-dark" 
                        type="button" 
                        onClick={() => sendUpdate(message)}
                        disabled={loading || !message}
                        style={{ borderRadius: "0 10px 10px 0", paddingLeft: "20px", paddingRight: "20px" }}
                    >
                        ➤
                    </button>
                </div>
            </div>

          </div>
          
          {/* Footer Status */}
          <div className="card-footer bg-light text-center p-3">
              <span className="badge bg-success dot">●</span> GPS Tracking Active
          </div>
        </div>

      </div>
    </div>
  );
}

export default DriverDashboard;
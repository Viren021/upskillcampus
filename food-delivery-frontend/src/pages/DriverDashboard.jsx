import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

function DriverDashboard() {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Security Check
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "DRIVER" && role !== "OWNER") {
      alert("🚫 ACCESS DENIED: Driver only.");
      navigate("/");
    }
  }, [navigate]);

  const sendUpdate = async (msgText) => {
    if (!orderId) return alert("⚠️ Enter Order ID first.");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://127.0.0.1:8000/orders/${orderId}/driver-location`, {
        latitude: 19.0760, 
        longitude: 72.8777,
        distance_text: "2 km", 
        time_text: "5 mins",
        message: msgText
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Show temporary success banner
      const banner = document.getElementById("success-banner");
      banner.style.top = "20px";
      setTimeout(() => banner.style.top = "-100px", 3000);
      
      setMessage(""); 
    } catch (error) {
      alert("❌ Failed. Check Order ID.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#eef2f5", paddingBottom: "50px" }}>
      <Navbar role="DRIVER" />
      
      {/* 🟢 CSS to Hide Number Spinners */}
      <style>
        {`
          /* Chrome, Safari, Edge, Opera */
          input::-webkit-outer-spin-button,
          input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          /* Firefox */
          input[type=number] {
            -moz-appearance: textfield;
          }
        `}
      </style>

      {/* 🟢 Success Animation Banner */}
      <div id="success-banner" style={{
          position: 'fixed', top: '-100px', left: '50%', transform: 'translateX(-50%)',
          background: '#28a745', color: 'white', padding: '15px 30px', borderRadius: '50px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)', transition: 'top 0.5s ease', zIndex: 9999, fontWeight: 'bold'
      }}>
        ✅ Update Sent!
      </div>

      <div className="container" style={{ maxWidth: "450px", marginTop: "30px" }}>
        
        {/* 📱 Main App Card */}
        <div className="card border-0 shadow-lg" style={{ borderRadius: "25px", overflow: "hidden" }}>
          
          {/* Header Section */}
          <div style={{ background: "linear-gradient(135deg, #0d6efd, #0a58ca)", padding: "30px 20px", color: "white", textAlign: "center" }}>
            <h3 style={{ fontWeight: "700", margin: 0 }}>🛵 Delivery Console</h3>
            <p style={{ margin: "5px 0 0 0", opacity: 0.8, fontSize: "0.9rem" }}>Active Session</p>
          </div>

          <div className="card-body p-4">
            
            {/* 1. Order Input */}
            <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#6c757d", letterSpacing: "1px" }}>ACTIVE ORDER ID</label>
            <div className="input-group mb-4">
                <span className="input-group-text bg-light border-0" style={{ fontSize: "1.5rem", color: "#0d6efd" }}>#</span>
                <input 
                  type="number" 
                  className="form-control form-control-lg border-0 bg-light fw-bold" 
                  placeholder="Enter ID"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  style={{ fontSize: "1.5rem", color: "#333", borderRadius: "0 10px 10px 0" }}
                />
            </div>

            <hr style={{ borderColor: "#eee" }} />

            {/* 2. Quick Actions - STACKED LAYOUT */}
            <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#6c757d", letterSpacing: "1px", marginBottom: "15px", display: "block" }}>QUICK UPDATES</label>
            
            <div className="d-grid gap-3">
                <button className="btn btn-outline-primary btn-lg shadow-sm" style={{ borderRadius: "12px", textAlign: "left", padding: "15px", border: "2px solid #0d6efd" }} 
                    onClick={() => sendUpdate("I have arrived at the restaurant 🏢")}>
                    <span style={{ marginRight: "10px" }}>🏢</span> Arrived at Restaurant
                </button>

                <button className="btn btn-outline-warning btn-lg shadow-sm text-dark" style={{ borderRadius: "12px", textAlign: "left", padding: "15px", border: "2px solid #ffc107" }} 
                    onClick={() => sendUpdate("Food picked up! On my way 🥡")}>
                    <span style={{ marginRight: "10px" }}>🥡</span> Food Picked Up
                </button>

                <button className="btn btn-outline-success btn-lg shadow-sm" style={{ borderRadius: "12px", textAlign: "left", padding: "15px", border: "2px solid #198754" }} 
                    onClick={() => sendUpdate("I've arrived at drop-off location 📍")}>
                    <span style={{ marginRight: "10px" }}>📍</span> Arrived at Customer
                </button>
            </div>

            {/* 3. Custom Message */}
            <div className="mt-4">
                <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#6c757d", letterSpacing: "1px", marginBottom: "10px", display: "block" }}>CUSTOM MESSAGE</label>
                <div className="input-group">
                    <input 
                        type="text" 
                        className="form-control form-control-lg border-secondary"
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        style={{ borderRadius: "30px 0 0 30px", fontSize: "1rem", borderRight: "none" }}
                    />
                    <button 
                        className="btn btn-dark" 
                        onClick={() => sendUpdate(message)}
                        disabled={loading || !message}
                        style={{ borderRadius: "0 30px 30px 0", paddingLeft: "20px", paddingRight: "20px" }}
                    >
                        ➤
                    </button>
                </div>
            </div>

          </div>

          {/* Footer Status */}
          <div className="bg-light p-3 text-center border-top">
              <span style={{ display: "inline-block", width: "10px", height: "10px", backgroundColor: "#28a745", borderRadius: "50%", marginRight: "8px" }}></span>
              <span style={{ fontSize: "0.9rem", color: "#666", fontWeight: "500" }}>GPS Tracking Active</span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default DriverDashboard;
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

function DriverDashboard() {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Security Check
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "DRIVER" && role !== "OWNER") {
      alert("🚫 ACCESS DENIED: Driver only.");
      navigate("/");
    }
  }, [navigate]);

  // 1. Send Location/Status Update
  const sendUpdate = async (msgText) => {
    if (!orderId) return alert("⚠️ Enter Order ID first.");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://127.0.0.1:8000/orders/${orderId}/driver-location`, {
        latitude: 19.0760, 
        longitude: 72.8777,
        distance_text: "0 km", 
        time_text: "0 mins",
        message: msgText
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Show temporary toast/alert
      const banner = document.getElementById("status-msg");
      banner.style.opacity = "1";
      banner.innerText = `✅ Update Sent: "${msgText}"`;
      setTimeout(() => banner.style.opacity = "0", 3000);
      
      setMessage(""); 
    } catch (error) {
      alert("❌ Failed. Check Order ID.");
    }
    setLoading(false);
  };

  // 2. 🔐 Verify OTP & Complete Delivery
  const completeDelivery = async () => {
    if (!orderId || otp.length !== 4) return alert("⚠️ Enter Valid Order ID and 4-digit OTP.");
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://127.0.0.1:8000/orders/${orderId}/complete-delivery`, 
        { otp: otp }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("🎉 DELIVERY SUCCESSFUL! Great job.");
      setOtp("");
      setOrderId(""); 
      window.location.reload(); 
    } catch (error) {
      console.error(error);
      alert("❌ INVALID OTP. Please ask customer again.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-color)" }}>
      <Navbar role="DRIVER" />
      
      {/* 🟢 CSS Reset for Inputs just for this page to match theme */}
      <style>{`
        .input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        .form-input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            outline: none;
            transition: border 0.2s;
        }
        .form-input:focus {
            border-color: var(--primary);
        }
        .status-btn {
            background: #fff;
            border: 1px solid #eee;
            padding: 15px;
            border-radius: 8px;
            text-align: left;
            cursor: pointer;
            transition: 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            color: var(--secondary);
        }
        .status-btn:hover {
            background: #f1f1f1;
            border-color: #ccc;
        }
      `}</style>

      <div className="container" style={{ marginTop: "40px", paddingBottom: "40px" }}>
        
        {/* Centered Card Layout */}
        <div className="card" style={{ maxWidth: "500px", margin: "0 auto", padding: "30px" }}>
            
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "30px" }}>
                <h2 style={{ margin: "0", color: "var(--secondary)" }}>🛵 Driver Console</h2>
                <p style={{ color: "#777", fontSize: "14px", marginTop: "5px" }}>Manage your active delivery</p>
                
                {/* Status Toast Message */}
                <div id="status-msg" style={{ 
                    marginTop: "10px", padding: "8px", background: "#d4edda", 
                    color: "#155724", borderRadius: "6px", fontSize: "13px", 
                    opacity: 0, transition: "opacity 0.3s" 
                }}>
                    Ready...
                </div>
            </div>

            {/* 1. Active Order ID Section */}
            <div style={{ marginBottom: "25px" }}>
                <label style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", color: "#888", marginBottom: "5px", display: "block" }}>
                    Active Order ID
                </label>
                <div className="input-group">
                    <span style={{ display: "flex", alignItems: "center", padding: "0 15px", background: "#eee", borderRadius: "8px", fontWeight: "bold", color: "#555" }}>#</span>
                    <input 
                        type="number" 
                        className="form-input" 
                        placeholder="Enter Order ID (e.g. 24)"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                    />
                </div>
            </div>

            {/* 2. Quick Status Updates */}
            <div style={{ marginBottom: "30px" }}>
                <label style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", color: "#888", marginBottom: "10px", display: "block" }}>
                    Update Status
                </label>
                <div style={{ display: "grid", gap: "10px" }}>
                    <button className="status-btn" onClick={() => sendUpdate("I have arrived at the restaurant 🏢")}>
                        🏢 <span>Arrived at Restaurant</span>
                    </button>
                    <button className="status-btn" onClick={() => sendUpdate("Food picked up! On my way 🥡")}>
                        🥡 <span>Food Picked Up</span>
                    </button>
                    <button className="status-btn" onClick={() => sendUpdate("I've arrived at drop-off location 📍")}>
                        📍 <span>Arrived at Customer</span>
                    </button>
                </div>
            </div>

            {/* 3. Secure Handover (Clean OTP Section) */}
            <div style={{ background: "#f8f9fa", border: "1px dashed #ccc", borderRadius: "12px", padding: "20px", textAlign: "center", marginBottom: "25px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "var(--primary)" }}>🔐 Secure Handover</h4>
                <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>
                    Ask customer for the 4-digit code
                </p>

                <input 
                    type="text" 
                    maxLength="4"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="0 0 0 0"
                    style={{ 
                        width: "100%", padding: "15px", fontSize: "20px", textAlign: "center", 
                        letterSpacing: "8px", fontWeight: "bold", border: "1px solid #ccc", 
                        borderRadius: "8px", marginBottom: "15px", outline: "none"
                    }}
                />

                <button 
                    className="btn btn-success btn-block" 
                    onClick={completeDelivery}
                    disabled={otp.length !== 4}
                    style={{ opacity: otp.length === 4 ? 1 : 0.6 }}
                >
                    VERIFY & COMPLETE DELIVERY
                </button>
            </div>

            {/* 4. Custom Message */}
            <div>
                <label style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", color: "#888", marginBottom: "5px", display: "block" }}>
                    Custom Message
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                    <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Traffic / Delay..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <button 
                        className="btn btn-primary" 
                        onClick={() => sendUpdate(message)}
                        disabled={loading || !message}
                    >
                        SEND
                    </button>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}

export default DriverDashboard;
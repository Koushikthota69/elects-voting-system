import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "./ForgotPassword.css";
import { API_ENDPOINTS } from "../../config/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [nic, setNic] = useState(""); // CHANGED: nicNo to nic
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!email || !nic) {
      Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Please enter both email and NIC number",
        confirmButtonColor: "#ffa726",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        API_ENDPOINTS.FORGOT_PASSWORD,
        { 
          email: email.toLowerCase().trim(), 
          nic: nic.toUpperCase().trim() // CHANGED: nicNo to nic and uppercase conversion
        }
      );
      
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: response.data.message,
        confirmButtonColor: "#6a11cb",
      });
      
      // Clear form
      setEmail("");
      setNic(""); // CHANGED: nicNo to nic
    } catch (err) {
      console.error("Forgot password error:", err);
      
      // More specific error messages
      let errorMessage = "Something went wrong! Please try again.";
      if (err.response?.status === 404) {
        errorMessage = "No account found with these credentials. Please check your email and NIC number.";
      } else if (err.response?.status === 400) {
        errorMessage = "Please provide both email and NIC number.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      Swal.fire({
        icon: "error",
        title: "Request Failed",
        text: errorMessage,
        confirmButtonColor: "#f44336",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <form className="forgot-password-form" onSubmit={handleSubmit}>
        <h2>Reset Your Password</h2>
        <p className="forgot-password-description">
          Enter your registered email and NIC number to receive password reset instructions.
        </p>
        
        <div className="input-group">
          <label htmlFor="nic">NIC Number</label>
          <input
            id="nic"
            type="text"
            placeholder="Enter your NIC number"
            className="forgot-password-input"
            value={nic}
            onChange={(e) => setNic(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="input-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your registered email"
            className="forgot-password-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button 
          className="forgot-password-button" 
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Sending Reset Instructions...
            </>
          ) : (
            'Send Reset Instructions'
          )}
        </button>

        <div className="forgot-password-help">
          <p>Don't have access to this email? <a href="/contact-support">Contact support</a></p>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;
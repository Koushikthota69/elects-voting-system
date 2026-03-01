import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './CSS/LoginSignup.css';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
// Should be:
import { useAuth } from '../Context/AuthContext';

const LoginSignup = () => {
    const [nicError, setNicError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");
    const [parties, setParties] = useState([]);
    const [state, setState] = useState("Login");
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        nic: "",
        gender: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        addressline1: "",
        addressline2: "",
        city: "",
        district: "",
        province: "",
        profilePhoto: null,
        isCandidate: false,
        skills: "",
        objectives: "",
        bio: "",
        party: "",
        nicFront: null,
        nicBack: null
    });
    const [previewImages, setPreviewImages] = useState({
        profilePhoto: null,
        nicFront: null,
        nicBack: null
    });

    const { login } = useAuth();
    const navigate = useNavigate();

    // Fetch political parties
    useEffect(() => {
        const fetchParties = async () => {
            try {
                const response = await axios.get(API_ENDPOINTS.PARTY_LIST);
                setParties(response.data.data);
            } catch (error) {
                console.error('Failed to fetch political parties:', error);
            }
        };
        fetchParties();
    }, []);

    const changeHandler = (e) => {
        const { name, type, value, files, checked } = e.target;

        if (type === 'file') {
            if (files && files.length > 0) {
                const file = files[0];
                setFormData(prev => ({ ...prev, [name]: file }));
                setPreviewImages(prev => ({ ...prev, [name]: URL.createObjectURL(file) }));
            }
        } else if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const validateNIC = () => {
        let nic = formData.nic.toLowerCase();
        const regex = /^(?:\d{12}|\d{9}[vx])$/;

        if (!regex.test(nic)) {
            setNicError("Invalid NIC format. Use 12 digits or 9 digits followed by 'v' or 'x'.");
            return false;
        } else {
            setNicError("");
            return true;
        }
    };

    const validatePassword = () => {
        const password = formData.password;
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!regex.test(password)) {
            setPasswordError(
                "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character."
            );
            return false;
        } else {
            setPasswordError("");
            return true;
        }
    };

    const validateConfirmPassword = () => {
        if (formData.password !== formData.confirmPassword) {
            setConfirmPasswordError("Passwords do not match.");
            return false;
        } else {
            setConfirmPasswordError("");
            return true;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (state === "Login") {
            await loginUser();
        } else {
            const isNICValid = validateNIC();
            const isPasswordValid = validatePassword();
            const isConfirmValid = validateConfirmPassword();

            if (isNICValid && isPasswordValid && isConfirmValid) {
                await signup();
            } else {
                toast.error('Please fix the validation errors above.');
            }
        }
    };

    const loginUser = async () => {
      try {
        const response = await axios.post(API_ENDPOINTS.USER_LOGIN, {
          nic: formData.nic.toLowerCase(),
          password: formData.password
        });

        if (response.data.success) {
          const { token, user } = response.data;

          // Use AuthContext login function
          await login(token, user);

          toast.success("Login successful!");

          // Wait a moment for auth state to update
          setTimeout(() => {
            // Check admin status and redirect accordingly
            if (user.email === 'thotakoushik69@gmail.com' || localStorage.getItem('isAdmin') === 'true') {
              console.log('🔄 Redirecting to admin dashboard');
              navigate('/admin/dashboard');
            } else {
              navigate('/');
            }
          }, 100);
        }
      } catch (error) {
        console.error('Login error:', error);
        const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
        toast.error(errorMessage);
      }
    };
    const signup = async () => {
        const formDataToSend = new FormData();

        // Append all form data
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== undefined && key !== 'confirmPassword') {
                if (key === 'politicalParty') {
                    formDataToSend.append('party', formData[key]);
                } else {
                    formDataToSend.append(key, formData[key]);
                }
            }
        });

        try {
            const response = await axios.post(API_ENDPOINTS.USER_REGISTER, formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                toast.success("Registration successful!");
                setState("Login");
                // Reset form
                setFormData({
                    firstName: "", lastName: "", nic: "", gender: "", email: "",
                    password: "", confirmPassword: "", phone: "", addressline1: "",
                    addressline2: "", city: "", district: "", province: "",
                    profilePhoto: null, isCandidate: false, skills: "", objectives: "",
                    bio: "", party: "", nicFront: null, nicBack: null
                });
                setPreviewImages({
                    profilePhoto: null, nicFront: null, nicBack: null
                });
            }
        } catch (error) {
            console.error('Signup error:', error);
            const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
            toast.error(errorMessage);
        }
    };

    return (
        <div className='loginsignup'>
            <ToastContainer />
            <div className="loginsignup-container">
                <h1>{state}</h1>
                <form onSubmit={handleSubmit}>
                    <div className="loginsignup-fields">
                        {state === "Sign Up" && (
                            <div className='signup-container'>
                                <div className='form-row'>
                                    <input name='firstName' value={formData.firstName} onChange={changeHandler} type="text" placeholder='Your First Name' required />
                                    <input name='lastName' value={formData.lastName} onChange={changeHandler} type="text" placeholder='Your Last Name' required />
                                </div>
                                <div className='form-row'>
                                    <input name='nic' value={formData.nic} onChange={changeHandler} type="text" placeholder='NIC Number' required />
                                    <input name='email' value={formData.email} onChange={changeHandler} type="email" placeholder='Your Email' />
                                </div>
                                <div className='form-row'>
                                    <input name='phone' value={formData.phone} onChange={changeHandler} type="text" placeholder='Phone Number' required />
                                    <select name='gender' value={formData.gender} onChange={changeHandler} required>
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className='form-row'>
                                    <input name='addressline1' value={formData.addressline1} onChange={changeHandler} type="text" placeholder='Address Line 1' required />
                                    <input name='addressline2' value={formData.addressline2} onChange={changeHandler} type="text" placeholder='Address Line 2' />
                                </div>
                                <div className="form-row">
                                    <select name='province' value={formData.province} onChange={changeHandler} required>
                                        <option value="">Select Province</option>
                                        <option value="Western Province">Western Province</option>
                                        <option value="Central Province">Central Province</option>
                                        <option value="Southern Province">Southern Province</option>
                                        <option value="Northern Province">Northern Province</option>
                                        <option value="Eastern Province">Eastern Province</option>
                                        <option value="North Western Province">North Western Province</option>
                                        <option value="North Central Province">North Central Province</option>
                                        <option value="Uva Province">Uva Province</option>
                                        <option value="Sabaragamuwa Province">Sabaragamuwa Province</option>
                                    </select>
                                    <select name='district' value={formData.district} onChange={changeHandler} required>
                                        <option value="">Select District</option>
                                        <option value="Colombo">Colombo</option>
                                        <option value="Gampaha">Gampaha</option>
                                        <option value="Kalutara">Kalutara</option>
                                        <option value="Kandy">Kandy</option>
                                        <option value="Matale">Matale</option>
                                        <option value="Nuwara Eliya">Nuwara Eliya</option>
                                        <option value="Galle">Galle</option>
                                        <option value="Matara">Matara</option>
                                        <option value="Hambantota">Hambantota</option>
                                        <option value="Jaffna">Jaffna</option>
                                        <option value="Kilinochchi">Kilinochchi</option>
                                        <option value="Mannar">Mannar</option>
                                        <option value="Vavuniya">Vavuniya</option>
                                        <option value="Mullaitivu">Mullaitivu</option>
                                        <option value="Batticaloa">Batticaloa</option>
                                        <option value="Ampara">Ampara</option>
                                        <option value="Trincomalee">Trincomalee</option>
                                        <option value="Kurunegala">Kurunegala</option>
                                        <option value="Puttalam">Puttalam</option>
                                        <option value="Anuradhapura">Anuradhapura</option>
                                        <option value="Polonnaruwa">Polonnaruwa</option>
                                        <option value="Badulla">Badulla</option>
                                        <option value="Monaragala">Monaragala</option>
                                        <option value="Ratnapura">Ratnapura</option>
                                        <option value="Kegalle">Kegalle</option>
                                    </select>
                                </div>
                                <div className='form-row'>
                                    <input name='city' value={formData.city} onChange={changeHandler} type="text" placeholder='City' required />
                                </div>

                                {/* File Uploads */}
                                <div className='form-row'>
                                    <div className="upload-section">
                                        <label>Profile Photo</label>
                                        <input name='profilePhoto' onChange={changeHandler} type="file" accept="image/*" />
                                        {previewImages.profilePhoto && (
                                            <img src={previewImages.profilePhoto} alt="Profile Preview" className="image-preview" />
                                        )}
                                    </div>
                                    <div className="upload-section">
                                        <label>NIC Front</label>
                                        <input name='nicFront' onChange={changeHandler} type="file" accept="image/*" required />
                                        {previewImages.nicFront && (
                                            <img src={previewImages.nicFront} alt="NIC Front Preview" className="image-preview" />
                                        )}
                                    </div>
                                </div>
                                <div className='form-row'>
                                    <div className="upload-section">
                                        <label>NIC Back</label>
                                        <input name='nicBack' onChange={changeHandler} type="file" accept="image/*" required />
                                        {previewImages.nicBack && (
                                            <img src={previewImages.nicBack} alt="NIC Back Preview" className="image-preview" />
                                        )}
                                    </div>
                                </div>

                                {/* Candidate Section */}
                                <div className='form-row'>
                                    <label className='checkbox'>
                                        <input name='isCandidate' checked={formData.isCandidate} onChange={changeHandler} type="checkbox" />
                                        <span>Are you a Candidate?</span>
                                    </label>
                                </div>
                                {formData.isCandidate && (
                                    <>
                                        <div className='form-row'>
                                            <input name='skills' value={formData.skills} onChange={changeHandler} type="text" placeholder='Skills (comma separated)' />
                                            <input name='objectives' value={formData.objectives} onChange={changeHandler} type="text" placeholder='Objectives' />
                                        </div>
                                        <div className='form-row'>
                                            <textarea name='bio' value={formData.bio} onChange={changeHandler} placeholder='Bio' rows="3"></textarea>
                                        </div>
                                        <div className='form-row'>
                                            <select name='party' value={formData.party} onChange={changeHandler} required>
                                                <option value="">Select Political Party</option>
                                                {parties.map((party) => (
                                                    <option key={party._id} value={party._id}>{party.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Login Fields */}
                        <div className={state === "Sign Up" ? "login-container" : "full-width"}>
                            {nicError && <p className="error-message">{nicError}</p>}
                            <input name="nic" value={formData.nic} onChange={changeHandler} type="text" placeholder="NIC Number" required />
                            {passwordError && <p className="error-message">{passwordError}</p>}
                            <input name="password" value={formData.password} onChange={changeHandler} type="password" placeholder="Password" required />
                            {state === "Sign Up" && (
                                <>
                                    {confirmPasswordError && <p className="error-message">{confirmPasswordError}</p>}
                                    <input name="confirmPassword" value={formData.confirmPassword} onChange={changeHandler} type="password" placeholder="Confirm Password" required />
                                </>
                            )}
                        </div>
                    </div>
                    <div className="loginsignup-agree">
                        <input type="checkbox" required />
                        <p>By continuing, I agree to the terms and conditions.</p>
                    </div>
                    <button type="submit">{state === "Login" ? "Login" : "Continue"}</button>
                    {state === "Sign Up" ? (
                        <p className='loginsignup-login'>
                            Already have an account? <span onClick={() => setState("Login")}>Login here</span>
                        </p>
                    ) : (
                        <>
                            <div className='forgot-password'>
                                <Link to='/forgot-password'>Forgot Password?</Link>
                            </div>
                            <p className='loginsignup-login'>
                                Don't have an account? <span onClick={() => setState("Sign Up")}>Register here</span>
                            </p>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default LoginSignup;
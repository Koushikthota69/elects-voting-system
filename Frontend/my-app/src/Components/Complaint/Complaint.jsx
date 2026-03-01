import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './Complaint.css';
import { FaFileAlt } from 'react-icons/fa';
import pdfIcon from '../Assests/pdf.png';
import { useTheme } from '../../Context/ThemeContext';
import { API_ENDPOINTS } from '../../config/api'; // ADD THIS IMPORT

const Complaint = ({ userId }) => {
    const { id } = useParams();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const { theme } = useTheme();

    useEffect(() => {
        const fetchComplaintsDetails = async () => {
            try {
                // FIXED: Use API_ENDPOINTS instead of relative URLs
                const response = await axios.get(API_ENDPOINTS.COMPLAINTS_BY_USER(userId || id));
                const approvedComplaints = response.data.data?.filter(complaint => complaint.isReviewed === true) || [];
                setComplaints(approvedComplaints);
            } catch (err) {
                console.error('Error fetching complaints:', err);
                setError(err.response?.data?.message || err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchComplaintsDetails();
    }, [userId, id]);

    if (loading) return <div className="loading">Loading complaints...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    const openImageModal = (imageSrc) => {
        setSelectedImage(imageSrc);
    };

    const closeImageModal = () => {
        setSelectedImage(null);
    };

    return (
        <div className={`complaints-container ${theme}`}>
            <h3 className="complaints-title">Complaints</h3>
            {complaints.length > 0 ? (
                <ul className="complaints-list">
                    {complaints.map(complaint => (
                        <li key={complaint._id} className={`complaint-card ${theme}`}>
                            <h4 className="complaint-title">{complaint.title}</h4>
                            <p className={`complaint-description ${theme}`}>{complaint.description}</p>
                            {complaint.proofs?.length > 0 && (
                                <div className="complaint-attachments">
                                    <p><strong>Proofs:</strong></p>
                                    <div className="attachments-container">
                                        {complaint.proofs.map((proof, index) => {
                                            const isImage = /\.(jpeg|jpg|png|gif)$/i.test(proof);
                                            const isPdf = /\.pdf$/i.test(proof);

                                            return isImage ? (
                                                <img
                                                    key={index}
                                                    src={proof}
                                                    alt={`Proof ${index + 1}`}
                                                    onClick={() => openImageModal(proof)}
                                                    className="attachment-thumbnail"
                                                />
                                            ) : isPdf ? (
                                                <a
                                                    key={index}
                                                    href={proof}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="file-icon-link"
                                                >
                                                    <img
                                                        src={pdfIcon}
                                                        alt="PDF Icon"
                                                        className="pdf-icon"
                                                    />
                                                </a>
                                            ) : (
                                                <a
                                                    key={index}
                                                    href={proof}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="file-icon-link"
                                                >
                                                    <FaFileAlt className="file-icon" />
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="no-complaints-message">No approved complaints found.</p>
            )}

            {/* Image Modal */}
            {selectedImage && (
                <div className="image-modal" onClick={closeImageModal}>
                    <div className="modal-content">
                        <img src={selectedImage} alt="Zoomed Img" className='img-model-img' />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Complaint;
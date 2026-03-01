import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ProjectSlides.css';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { useTheme } from '../../Context/ThemeContext';

const API_BASE = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const ProjectSlides = () => {
  const { theme } = useTheme();
  const [projects, setProjects] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE}/api/v1/projects/all`);
        
        const projectsData = response.data?.data || response.data || [];
        const sortedProjects = projectsData
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);

        if (sortedProjects.length === 0) {
          setError('No projects found.');
        } else {
          setProjects(sortedProjects);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching projects:', {
          message: err.message,
          status: err.response?.status,
          url: `${API_BASE}/api/v1/projects/all`
        });
        setError('Failed to load projects. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    if (projects.length === 0 || isHovered) return;

    const slideInterval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % projects.length);
    }, 5000);

    return () => clearInterval(slideInterval);
  }, [projects, isHovered]);

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + projects.length) % projects.length);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % projects.length);
  };

  const isImage = (filePath) => {
    if (!filePath) return false;
    const validImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return validImageTypes.some((type) => filePath.toLowerCase().endsWith(type));
  };

  if (loading) {
    return (
      <div className="project-slides-container loading">
        <p className="loading-message">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-slides-container error">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="project-slides-container empty">
        <p className="empty-message">No projects available</p>
      </div>
    );
  }

  return (
    <div className={`project-slides-container ${theme}`}>
      <div
        className="project-slide-wrapper"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="project-slides" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {projects.map((project, index) => (
            <div key={project._id || index} className={`project-slide ${theme}`}>
              <h2>{project?.title || 'No title available'}</h2>
              <h4>{project?.user?.firstName} {project?.user?.lastName}</h4>
              <p>{project?.description || 'No description available'}</p>
              {project?.attachments?.length > 0 && (
                <div className="project-image">
                  {project.attachments.map((attachment, idx) => (
                    isImage(attachment) && (
                      <img
                        key={idx}
                        src={attachment}
                        alt={`Project ${project.title}`}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/default-image.jpg';
                        }}
                      />
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Arrow Navigation */}
      {projects.length > 1 && (
        <div className="navigation-arrows">
          <button className="prev-arrow" onClick={handlePrevious} aria-label="Previous Project">
            <FaArrowLeft size={30} />
          </button>
          <button className="next-arrow" onClick={handleNext} aria-label="Next Project">
            <FaArrowRight size={30} />
          </button>
        </div>
      )}

      {/* Dots Indicator */}
      {projects.length > 1 && (
        <div className="slide-dots">
          {projects.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectSlides;

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './Components/Navbar/Navbar';
import LoginSignup from './Pages/LoginSignup';
import Home from './Pages/Home';
import Dashboard from './Pages/Dashboard';
import Footer from './Components/Footer/Footer';
import Candidates from './Components/Candidates/Candidates';
import Contact from './Components/Contact/Contact';
import About from './Components/About/About';
import Election from './Components/Election/Election';
import ComplaintForm from './Components/ComplaintForm/ComplaintForm';
import EditProfileUser from "./Components/EditProfileUser/EditProfileUser";
import EditProfileCandidate from "./Components/EditProfileCandidate/EditProfileCandidate";
import EditPersonalCandidate from "./Components/EditPersonalCandidate/EditPersonalCandidate";
import AddProjectCandidate from './Components/AddProjectCandidate/AddProjectCandidate';
import Results from './Components/Results/Results';
import ElectionDetails from './Components/ElectionDetails/ElectionDetails';
import CandidateProfile from "./Components/CandidateProfile/CandidateProfile";
import EditProject from "./Components/EditProject/EditProject";
import Projects from "./Components/Projects/Projects";
import ForgotPassword from './Components/ForgotPassword/ForgotPassword';
import SetPassword from './Components/SetPassword/SetPassword';
import ElectionDetailsParlimentary from "./Components/ElectionDetailsParlimentary/ElectionDetailsParlimentary";
import ElectionDetailsPresidential from "./Components/ElectionDetailsPresidential/ElectionDetailsPresidential";
import ElectionDetailsProvincial from "./Components/ElectionDetailsProvincial/ElectionDetailsProvincial";
import FiledComplaints from "./Components/FiledComplaints/FiledComplaints";
import ComplaintList from "./Components/ComplaintList/ComplaintList";
import ReportFake from "./Components/ReportFake/ReportFake";
import CandidateDescription from "./Components/CandidateDescription/CandidateDescription";

// Import components
import VotingInterface from './Components/Voting/VotingInterface';
import CreateElection from './Components/Admin/CreateElection';
import CreateParty from './Components/Admin/CreateParty';
import AdminDashboard from './Components/Admin/AdminDashboard';
import ProtectedRoute from './Components/Auth/ProtectedRoute';
import AdminRoute from './Components/Auth/AdminRoute';

// ADD THESE IMPORTS
import PartiesList from './Components/Admin/PartiesList';
import ResetPassword from './Components/ResetPassword/ResetPassword';
import AdminVerifications from './Components/Admin/AdminVerifications';
import FaceRegistrationPage from './Components/FaceRegistration/FaceRegistration';

// IMPORT AUTH PROVIDER
import { AuthProvider, useAuth } from './Context/AuthContext';
import { ThemeProvider, useTheme } from './Context/ThemeContext';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

// AppContent component with loading state
const AppContent = () => {
  const { theme } = useTheme();
  const { loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className={`App ${theme} loading-app`}>
        <div className="app-loading">
          <div className="loading-spinner"></div>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`App ${theme}`}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path='/' element={<Home />} />
          <Route path='/login' element={<LoginSignup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/setpassword" element={<SetPassword />} />
          <Route path='/about' element={<About />} />
          <Route path='/contact' element={<Contact />} />

          {/* Admin Routes - MUST COME BEFORE REGULAR DASHBOARD */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/verifications"
            element={
              <AdminRoute>
                <AdminVerifications />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/create-election"
            element={
              <AdminRoute>
                <CreateElection />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/create-party"
            element={
              <AdminRoute>
                <CreateParty />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/parties"
            element={
              <AdminRoute>
                <PartiesList />
              </AdminRoute>
            }
          />

          {/* User Dashboard - This should come after admin routes */}
          <Route
            path='/dashboard'
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Face Registration Page */}
          <Route
            path="/face-registration"
            element={
              <ProtectedRoute>
                <FaceRegistrationPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path='/elections'
            element={
              <ProtectedRoute>
                <Election />
              </ProtectedRoute>
            }
          />
          <Route
            path='/candidates'
            element={
              <ProtectedRoute>
                <Candidates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-candidates"
            element={
              <ProtectedRoute>
                <EditProfileCandidate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-users/:id"
            element={
              <ProtectedRoute>
                <EditProfileUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates/personal/:id"
            element={
              <ProtectedRoute>
                <EditPersonalCandidate />
              </ProtectedRoute>
            }
          />
          <Route
            path='/candidates/add-projects'
            element={
              <ProtectedRoute>
                <AddProjectCandidate />
              </ProtectedRoute>
            }
          />

          {/* Election Routes */}
          <Route path="/election/:id" element={<ElectionDetails />} />
          <Route path="/presidential-election/:id" element={<ElectionDetailsPresidential/>}/>
          <Route path="/parlimentary-election/:id" element={<ElectionDetailsParlimentary/>}/>
          <Route path="/provincial-election/:id" element={<ElectionDetailsProvincial/>}/>

          {/* Voting Routes */}
          <Route
            path="/vote/general/:electionId"
            element={
              <ProtectedRoute>
                <VotingInterface electionType="general" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vote/presidential/:electionId"
            element={
              <ProtectedRoute>
                <VotingInterface electionType="presidential" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vote/parliamentary/:electionId"
            element={
              <ProtectedRoute>
                <VotingInterface electionType="parliamentary" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vote/provincial/:electionId"
            element={
              <ProtectedRoute>
                <VotingInterface electionType="provincial" />
              </ProtectedRoute>
            }
          />

          {/* Results Routes */}
          <Route path="/results" element={<Results />} />
          <Route path="/results/general/:electionId" element={<Results />} />
          <Route path="/results/presidential/:electionId" element={<Results />} />
          <Route path="/results/parliamentary/:electionId" element={<Results />} />
          <Route path="/results/provincial/:electionId" element={<Results />} />

          {/* Complaint Routes */}
          <Route
            path="/filed-complaints/:id"
            element={
              <ProtectedRoute>
                <FiledComplaints/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints"
            element={
              <ProtectedRoute>
                <ComplaintList/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/report/:id"
            element={
              <ProtectedRoute>
                <ReportFake/>
              </ProtectedRoute>
            }
          />

          {/* Candidate Routes */}
          <Route path="/candidate/:id" element={<CandidateProfile />} />
          <Route
            path="/description"
            element={
              <ProtectedRoute>
                <CandidateDescription/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates/edit-projects/:id"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-project/:id"
            element={
              <ProtectedRoute>
                <EditProject />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaint-form/:id"
            element={
              <ProtectedRoute>
                <ComplaintForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaint-form"
            element={
              <ProtectedRoute>
                <ComplaintForm />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Footer />
    </div>
  );
};

export default App;
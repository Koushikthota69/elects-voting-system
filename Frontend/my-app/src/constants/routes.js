// src/constants/routes.js
export const ROUTES = {
  // Public Routes
  HOME: '/',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  SET_PASSWORD: '/setpassword',
  ABOUT: '/about',
  CONTACT: '/contact',
  RESULTS: '/results',
  
  // Candidate Public Profiles
  CANDIDATE_PROFILE: '/candidate/:id',
  
  // Election Public Pages
  ELECTION_DETAILS: '/election/:id',
  PRESIDENTIAL_ELECTION: '/presidential-election/:id',
  PARLIAMENTARY_ELECTION: '/parlimentary-election/:id',
  PROVINCIAL_ELECTION: '/provincial-election/:id',
  
  // Protected User Routes
  DASHBOARD: '/dashboard',
  ELECTIONS: '/elections',
  CANDIDATES: '/candidates',
  
  // User Profile Management
  EDIT_USER_PROFILE: '/edit-users/:id',
  EDIT_CANDIDATE_PROFILE: '/edit-candidates',
  EDIT_CANDIDATE_PERSONAL: '/candidates/personal/:id',
  
  // Candidate Project Management
  ADD_PROJECTS: '/candidates/add-projects',
  EDIT_PROJECTS: '/edit-project/:id',
  PROJECTS_LIST: '/candidates/edit-projects/:id',
  
  // Voting
  VOTE_GENERAL: '/vote/general/:electionId',
  VOTE_PRESIDENTIAL: '/vote/presidential/:electionId',
  VOTE_PARLIAMENTARY: '/vote/parliamentary/:electionId',
  VOTE_PROVINCIAL: '/vote/provincial/:electionId',
  
  // Results
  RESULTS_GENERAL: '/results/general/:electionId',
  RESULTS_PRESIDENTIAL: '/results/presidential/:electionId',
  RESULTS_PARLIAMENTARY: '/results/parliamentary/:electionId',
  RESULTS_PROVINCIAL: '/results/provincial/:electionId',
  
  // Complaints & Reports
  COMPLAINT_FORM: '/complaint-form/:id',
  FILED_COMPLAINTS: '/filed-complaints/:id',
  COMPLAINTS_LIST: '/complaints',
  REPORT_FAKE: '/report/:id',
  
  // Candidate Description
  CANDIDATE_DESCRIPTION: '/description',
  
  // Admin Routes
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_CREATE_ELECTION: '/admin/create-election',
  ADMIN_CREATE_PARTY: '/admin/create-party',
  ADMIN_PARTIES_LIST: '/admin/parties',
};

// Helper function to generate paths with params
export const generatePath = (path, params = {}) => {
  return Object.keys(params).reduce(
    (currentPath, key) => currentPath.replace(`:${key}`, params[key]),
    path
  );
};
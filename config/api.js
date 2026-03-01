// API Utility using environment variables
const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
export const API_ENDPOINTS = {
  // Users
  USER_PROFILE: (id) => \\\/\\,
  // Admin
  ADMIN: \\\\,
  // Elections
  ELECTIONS: \\\\,
  ELECTION_BY_ID: (id) => \\\/\\,
  // Candidates
  CANDIDATES: \\\\,
  CANDIDATE_BY_ID: (id) => \\\/\\,
  // Voting
  VOTING: \\\\,
  // Results
  RESULTS: \\\\,
  ELECTION_RESULTS: (id) => \\\/\\,
};

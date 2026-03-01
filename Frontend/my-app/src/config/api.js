const API_BASE = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // ===== AUTHENTICATION & USERS =====
  USER_LOGIN: `${API_BASE}/api/v1/users/login`,
  USER_REGISTER: `${API_BASE}/api/v1/users/register`,
  USER_PROFILE: (id) => `${API_BASE}/api/v1/users/profile/${id}`,
  UPDATE_USER_PHOTO: (id) => `${API_BASE}/api/v1/users/updatephoto/${id}`,
  ADMIN_LOGIN: `${API_BASE}/api/v1/admins/login`,
  
  // ===== PASSWORD MANAGEMENT =====
  FORGOT_PASSWORD: `${API_BASE}/api/v1/passwords/forgotpassword`,
  RESET_PASSWORD: `${API_BASE}/api/v1/passwords/resetpassword`,
  
  // ===== ELECTIONS =====
  ELECTIONS: `${API_BASE}/api/v1/elections`,
  ELECTION_DETAILS: (id) => `${API_BASE}/api/v1/elections/election/${id}`,
  PRESIDENTIAL_ELECTIONS: `${API_BASE}/api/v1/presidentialElections`,
  PRESIDENTIAL_ELECTION_DETAILS: (id) => `${API_BASE}/api/v1/presidentialElections/election/${id}`,
  PARLIAMENTARY_ELECTIONS: `${API_BASE}/api/v1/parlimentaryElections`,
  PARLIAMENTARY_ELECTION_DETAILS: (id) => `${API_BASE}/api/v1/parlimentaryElections/election/${id}`,
  PROVINCIAL_ELECTIONS: `${API_BASE}/api/v1/provincialElections`,
  PROVINCIAL_ELECTION_DETAILS: (id) => `${API_BASE}/api/v1/provincialElections/election/${id}`,
  
  // ===== ELECTION CREATION =====
  CREATE_ELECTION: `${API_BASE}/api/v1/elections`,
  CREATE_PRESIDENTIAL_ELECTION: `${API_BASE}/api/v1/presidentialElections`,
  CREATE_PARLIAMENTARY_ELECTION: `${API_BASE}/api/v1/parlimentaryElections`,
  CREATE_PROVINCIAL_ELECTION: `${API_BASE}/api/v1/provincialElections`,
  
  // ===== CANDIDATES =====
  CANDIDATES: `${API_BASE}/api/v1/candidates`,
  CANDIDATE_PROFILE: (id) => `${API_BASE}/api/v1/candidates/profile/${id}`,
  CANDIDATE_BY_USER: (id) => `${API_BASE}/api/v1/candidates/user/profile/${id}`,

  // ===== CANDIDATE VERIFICATION =====
  PENDING_VERIFICATIONS: `${API_BASE}/api/v1/candidates/pending-verifications`,
  VERIFY_CANDIDATE: (userId) => `${API_BASE}/api/v1/candidates/verify/${userId}`,
  VERIFY_CANDIDATE_BY_CANDIDATE_ID: (candidateId) => `${API_BASE}/api/v1/candidates/verify-by-candidate/${candidateId}`,
  PENDING_CANDIDATES_COUNT: `${API_BASE}/api/v1/candidates/get/pendingcandidates/count`,

  // ===== CANDIDATE VOTING =====
  VOTE_CANDIDATE: (candidateId) => `${API_BASE}/api/v1/candidates/${candidateId}/vote`,

  // ===== CANDIDATE APPLICATION =====
  APPLY_GENERAL_ELECTION: (id) => `${API_BASE}/api/v1/elections/${id}/apply`,
  APPLY_PRESIDENTIAL_ELECTION: (id) => `${API_BASE}/api/v1/presidentialElections/${id}/apply`,
  APPLY_PARLIAMENTARY_ELECTION: (id) => `${API_BASE}/api/v1/parlimentaryElections/${id}/apply`,
  APPLY_PROVINCIAL_ELECTION: (id) => `${API_BASE}/api/v1/provincialElections/${id}/apply`,

  // ===== VOTING =====
  VOTE_GENERAL_ELECTION: (electionId, candidateId) => `${API_BASE}/api/v1/elections/${electionId}/vote/${candidateId}`,
  VOTE_PRESIDENTIAL_ELECTION: (electionId, candidateId) => `${API_BASE}/api/v1/presidentialElections/${electionId}/vote/${candidateId}`,
  VOTE_PARLIAMENTARY_ELECTION: (electionId, candidateId) => `${API_BASE}/api/v1/parlimentaryElections/${electionId}/vote/${candidateId}`,
  VOTE_PROVINCIAL_ELECTION: (electionId, candidateId) => `${API_BASE}/api/v1/provincialElections/${electionId}/vote/${candidateId}`,

  // ===== ELECTION RESULTS =====
  RESULTS_GENERAL: (electionId) => `${API_BASE}/api/v1/results/general/${electionId}`,
  RESULTS_PRESIDENTIAL: (electionId) => `${API_BASE}/api/v1/results/presidential/${electionId}`,
  RESULTS_PARLIAMENTARY: (electionId) => `${API_BASE}/api/v1/results/parlimentary/${electionId}`,
  RESULTS_PROVINCIAL: (electionId) => `${API_BASE}/api/v1/results/provincial/${electionId}`,

  // ===== POLITICAL PARTIES =====
  PARTIES: `${API_BASE}/api/v1/parties`,
  PARTY_LIST: `${API_BASE}/api/v1/parties/party`,

  // ===== PROJECTS =====
  PROJECTS_ALL: `${API_BASE}/api/v1/projects/all`,
  PROJECTS_BY_USER: (id) => `${API_BASE}/api/v1/projects/${id}`,

  // ===== COMPLAINTS & REPORTS =====
  COMPLAINTS: `${API_BASE}/api/v1/complaints`,
  COMPLAINTS_BY_USER: (id) => `${API_BASE}/api/v1/complaints/comp/${id}`,
  COMPLAINTS_BY_OWNER: (id) => `${API_BASE}/api/v1/complaints/comp/owner/${id}`,
  COMPLAINTS_REVIEWED: (id) => `${API_BASE}/api/v1/complaints/comp/reviewed/${id}`,
  COMPLAINTS_PENDING: `${API_BASE}/api/v1/complaints/show/pending-reviews`,

  // ===== FAKE REPORTS =====
  REPORT_FAKE: `${API_BASE}/api/v1/reportFakes`,
  REPORT_FAKE_UNREVIEWED: `${API_BASE}/api/v1/reportFakes/unreviewed`,

  // ===== CANDIDATE DESCRIPTIONS =====
  CANDIDATE_DESCRIPTION_ADD: (id) => `${API_BASE}/api/v1/candidateDescription/add/${id}`,
  CANDIDATE_DESCRIPTION_VIEW: (id) => `${API_BASE}/api/v1/candidateDescription/view/${id}`,
  CANDIDATE_DESCRIPTION_EDIT: (id) => `${API_BASE}/api/v1/candidateDescription/edit/${id}`,
  CANDIDATE_DESCRIPTION_DELETE: (id) => `${API_BASE}/api/v1/candidateDescription/delete/${id}`,

  // ===== ADMIN =====
  ADMIN_DASHBOARD_STATS: `${API_BASE}/api/v1/admins/dashboard/stats`,
  ADMIN_CHECK: (email) => `${API_BASE}/api/v1/admins/check-admin/${email}`,

  // ===== FILE UPLOAD =====
  UPLOAD: `${API_BASE}/api/v1/upload/upload`,

  // ===== EXTERNAL DATA =====
  EXTERNAL_PEOPLE: `${API_BASE}/api/v1/peoples/external-people`,

  // ===== FACE VERIFICATION =====
  FACE_VERIFICATION: `${API_BASE}/api/v1/verifications/facerecognition/verify`,
  FACE_REGISTRATION: `${API_BASE}/api/v1/verifications/facerecognition/register`,
  FACE_STATUS: `${API_BASE}/api/v1/verifications/facerecognition/status`,

  // ===== CANDIDATE FIXING ROUTES =====
  FIX_MISSING_CANDIDATE: (userId) => `${API_BASE}/api/v1/candidates/fix-missing-candidate/${userId}`,
  FIX_USER_STATUS: (userId) => `${API_BASE}/api/v1/candidates/fix-user-status/${userId}`,
  FIX_ALL_INCONSISTENT_CANDIDATES: `${API_BASE}/api/v1/candidates/fix-all-inconsistent-candidates`,
  FORCE_CANDIDATE_STATUS: (userId) => `${API_BASE}/api/v1/candidates/force-candidate/${userId}`,
};

export { API_BASE };
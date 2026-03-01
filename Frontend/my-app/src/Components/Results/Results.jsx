import React, { useEffect, useState } from 'react'
import { Pie, Bar } from 'react-chartjs-2'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios'
import Swal from 'sweetalert2'
import { FaDownload } from "react-icons/fa";
import './Results.css'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  BarElement,
  Title
} from 'chart.js'
import { Link } from 'react-router-dom'
import unavailable from '../Assests/unavailable.png'
import { useTheme } from '../../Context/ThemeContext';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  BarElement,
  Title
)

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const Results = () => {
  const [electionType, setElectionType] = useState('')
  const [elections, setElections] = useState([])
  const [selectedElectionId, setSelectedElectionId] = useState('')
  const [electionDetails, setElectionDetails] = useState(null)
  const [isBlurred, setIsBlurred] = useState(false)
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()

  const navigate = useNavigate()

  useEffect(() => {
    if (electionType) {
      const fetchElections = async () => {
        try {
          setLoading(true)
          let url = ''
          switch (electionType) {
            case 'general':
              url = `${BASE_URL}/api/v1/elections`
              break
            case 'presidential':
              url = `${BASE_URL}/api/v1/presidentialElections`
              break
            case 'parlimentary':
              url = `${BASE_URL}/api/v1/parlimentaryElections`
              break
            case 'provincial':
              url = `${BASE_URL}/api/v1/provincialElections`
              break
            default:
              break
          }

          const response = await axios.get(url)
          setElections(response.data.data || [])
        } catch (error) {
          console.error('Error fetching elections:', error)
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to fetch elections. Please try again.'
          })
        } finally {
          setLoading(false)
        }
      }

      fetchElections()
    }
  }, [electionType])

  useEffect(() => {
    if (selectedElectionId && electionType) {
      const fetchElectionDetails = async () => {
        try {
          setLoading(true)
          let url = ''
          switch (electionType) {
            case 'general':
              url = `${BASE_URL}/api/v1/results/general/${selectedElectionId}`
              break
            case 'presidential':
              url = `${BASE_URL}/api/v1/results/presidential/${selectedElectionId}`
              break
            case 'parlimentary':
              url = `${BASE_URL}/api/v1/results/parlimentary/${selectedElectionId}`
              break
            case 'provincial':
              url = `${BASE_URL}/api/v1/results/provincial/${selectedElectionId}`
              break
            default:
              console.error('Invalid election type selected')
              return
          }

          console.log('🔍 Fetching results from:', url)
          const response = await axios.get(url)
          console.log('📦 FULL API RESPONSE:', response.data)

          if (response.data.success) {
            console.log('✅ ELECTION DATA RECEIVED:')
            console.log('   Total Votes:', response.data.data?.results?.totalVotes)
            console.log('   Vote Distribution:', response.data.data?.results?.voteDistribution)
            console.log('   Winning Candidate:', response.data.data?.results?.winningCandidate)
            console.log('   Winning Party:', response.data.data?.results?.winningParty)

            setElectionDetails(response.data.data || null)
          } else {
            throw new Error(response.data.message || 'Failed to fetch election details')
          }
        } catch (error) {
          console.error('❌ Error fetching election details:', error.response?.data || error.message)
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || error.response?.data?.error || 'Failed to fetch election results. Please try again.'
          })
        } finally {
          setLoading(false)
        }
      }

      fetchElectionDetails()
    }
  }, [selectedElectionId, electionType])

  const handleElectionTypeChange = e => {
    const electionType = e.target.value
    setElectionType(electionType)
    setElections([])
    setSelectedElectionId('')
    setElectionDetails(null)
  }

  const handleElectionChange = event => {
    const selectedId = event.target.value
    setSelectedElectionId(selectedId)

    // Find the selected election
    const selectedElection = elections.find(
      election => election._id === selectedId
    )

    if (selectedElection) {
      const status = getElectionStatus(
        selectedElection.startTime,
        selectedElection.endTime
      )

      if (status === 'Upcoming') {
        setIsBlurred(true)
        Swal.fire('Warning', 'The Election has not started yet', 'warning').then(() => {
          navigate('/')
        })
        return
      }

      if (status === 'Ongoing') {
        Swal.fire(
          'Notice',
          'The Election is still ongoing. Results will be available after it finishes.',
          'info'
        ).then(() => {
          navigate('/')
        })
        return
      }

      setSelectedElectionId(selectedId)
      setIsBlurred(false)
    }
  }

  // ✅ FIXED: Calculate total votes - Use election's totalVotes directly
  const calculateTotalVotes = () => {
    if (!electionDetails || !electionDetails.results) return 0

    // Use the totalVotes from election results (this is where votes are actually stored)
    const totalVotes = electionDetails.results.totalVotes || 0

    console.log('🧮 Calculated Total Votes:', totalVotes)
    return totalVotes
  }

  // ✅ FIXED: Find the winner - Use data from election results
  const findWinner = () => {
    if (!electionDetails || !electionDetails.results) return 'No winner'

    // Check if backend already computed winner
    if (electionDetails.results.winningCandidate) {
      const winner = electionDetails.results.winningCandidate
      return `${winner.user?.firstName || 'Unknown'} ${winner.user?.lastName || ''}`
    }

    // Fallback: Calculate from vote distribution
    const voteDistribution = electionDetails.results.voteDistribution || []
    if (voteDistribution.length === 0) return 'No winner'

    const sortedCandidates = [...voteDistribution].sort((a, b) => (b.votes || 0) - (a.votes || 0))

    if (sortedCandidates.length === 0 || sortedCandidates[0].votes === 0) {
      return 'No winner'
    }

    const highestVotes = sortedCandidates[0].votes
    const winners = sortedCandidates.filter(candidate => candidate.votes === highestVotes)

    if (winners.length > 1) {
      return `${winners.length} Winners (Tie)`
    }

    const winner = winners[0]?.candidateId?.user
    return winner ? `${winner.firstName} ${winner.lastName}` : 'Unknown'
  }

  // ✅ FIXED: Find the winning party - Use data from election results
  const findWinningParty = () => {
    if (!electionDetails || !electionDetails.results) return 'No party declared'

    // Check if backend already computed winning party
    if (electionDetails.results.winningParty) {
      return electionDetails.results.winningParty.name || 'No party declared'
    }

    // Fallback: Calculate from vote distribution
    const voteDistribution = electionDetails.results.voteDistribution || []
    if (voteDistribution.length === 0) return 'No party declared'

    const partyVotes = {}
    voteDistribution.forEach(item => {
      const party = item.candidateId?.party?.name || 'Independent'
      partyVotes[party] = (partyVotes[party] || 0) + (item.votes || 0)
    })

    const sortedParties = Object.entries(partyVotes).sort((a, b) => b[1] - a[1])
    return sortedParties[0]?.[0] || 'No party declared'
  }

  const COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
  ]

  const voteDistribution = electionDetails?.results?.voteDistribution || []

  const pieChartData = {
    labels: voteDistribution.map(
      item => item.candidateId?.user?.firstName || 'Unknown Candidate'
    ),
    datasets: [
      {
        data: voteDistribution.map(item => item.votes || 0),
        backgroundColor: COLORS
      }
    ]
  }

  const barChartData = {
    labels: voteDistribution.map(
      item => item.candidateId?.user?.firstName || 'Unknown Candidate'
    ),
    datasets: [
      {
        label: 'Votes',
        data: voteDistribution.map(item => item.votes || 0),
        backgroundColor: COLORS
      }
    ]
  }

  const getElectionStatus = (startTime, endTime) => {
    const now = new Date()
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (now < start) return 'Upcoming'
    if (now >= start && now <= end) return 'Ongoing'
    return 'Finished'
  }

  const downloadResultsPDF = () => {
    Swal.fire({
      title: "Download Results",
      text: "Do you want to download the results as a PDF?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, download!'
    }).then((result) => {
      if (result.isConfirmed) {
        const resultsDiv = document.getElementById('resultsSection');

        if (!resultsDiv) {
          console.error('Results container not found');
          return;
        }

        html2canvas(resultsDiv, { scale: 2 }).then(canvas => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');

          const imgWidth = 210;
          const pageHeight = 297;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft > 0) {
            position -= pageHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          pdf.save(`Election_Results_${electionDetails.name || 'Unknown'}.pdf`);
          Swal.fire('Success!', 'Results downloaded successfully.', 'success');
        });
      }
    });
  };

  if (loading) {
    return (
      <div className="results-loading">
        <div className="loading-spinner"></div>
        <p>Loading election results...</p>
      </div>
    );
  }

  return (
    <div
      className={
        isBlurred ? `blur-background ${theme}` : `results-container ${theme}`
      }
      id='resultsSection'
    >
      <h1 className={`resultsh1 ${theme}`}>Election Results</h1>

      <div className={`form-container ${theme}`}>
        <label htmlFor='election-type'>Select Election Type</label>
        <div className={`radio-buttons ${theme}`}>
          <label>
            <input
              type='radio'
              name='election-type'
              value='general'
              onChange={handleElectionTypeChange}
              checked={electionType === 'general'}
            />
            General Election
          </label>
          <label>
            <input
              type='radio'
              name='election-type'
              value='presidential'
              onChange={handleElectionTypeChange}
              checked={electionType === 'presidential'}
            />
            Presidential Election
          </label>
          <label>
            <input
              type='radio'
              name='election-type'
              value='parlimentary'
              onChange={handleElectionTypeChange}
              checked={electionType === 'parlimentary'}
            />
            Parliamentary Election
          </label>
          <label>
            <input
              type='radio'
              name='election-type'
              value='provincial'
              onChange={handleElectionTypeChange}
              checked={electionType === 'provincial'}
            />
            Provincial Election
          </label>
        </div>

        {elections.length > 0 && (
          <div className={`dropdown-container ${theme}`}>
            <label htmlFor='election'>Select an Election</label>
            <select
              id='election'
              value={selectedElectionId}
              onChange={handleElectionChange}
            >
              <option value=''>Select an Election</option>
              {elections.map(election => {
                const status = getElectionStatus(
                  election.startTime,
                  election.endTime
                )
                return (
                  <option key={election._id} value={election._id}>
                    {`${electionType === 'general'
                        ? election.name
                        : `${election.year} ${election.province || ''}`
                      } - ${status}`}
                  </option>
                )
              })}
            </select>
          </div>
        )}
      </div>

      {electionDetails && (
        <div className={`results-details ${theme}`}>
          {/* 🔧 DEBUG INFO - Temporary (you can remove this after testing) */}
          <div style={{background: '#f0f0f0', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '2px solid red'}}>
            <h4>🔧 DEBUG INFO:</h4>
            <p><strong>Total Votes from API:</strong> {electionDetails.results?.totalVotes}</p>
            <p><strong>Vote Distribution Length:</strong> {electionDetails.results?.voteDistribution?.length}</p>
            {electionDetails.results?.voteDistribution?.map((item, index) => (
              <p key={index}>
                <strong>Candidate {index + 1}:</strong> {item.votes} votes |
                Candidate ID: {item.candidateId?._id || 'No ID'} |
                Candidate Name: {item.candidateId?.user?.firstName || 'Unknown'}
              </p>
            ))}
          </div>

          <h2 className={`election-title ${theme}`}>
            {electionDetails.name || 'Election Results'}
          </h2>

          {electionDetails.description && (
            <p className={`election-description ${theme}`}>
              {electionDetails.description}
            </p>
          )}

          <div className={`results-summary ${theme}`}>
            <div className={`summary-item ${theme}`}>
              <h3>Total Votes</h3>
              <p className="summary-value">{calculateTotalVotes().toLocaleString()}</p>
            </div>
            <div className={`summary-item winner-item ${theme}`}>
              <h3>Winner</h3>
              <p className="summary-value winner-name">{findWinner()}</p>
            </div>
            <div className={`summary-item ${theme}`}>
              <h3>Winning Party</h3>
              <p className="summary-value">{findWinningParty()}</p>
            </div>
          </div>

          <div className="download-section">
            <button
              onClick={downloadResultsPDF}
              className={`download-btn ${theme}`}
              title="Download Results as PDF"
            >
              <FaDownload size={20} />
              <span>Download PDF</span>
            </button>
          </div>

          {voteDistribution.length > 0 ? (
            <>
              <div className={`charts-container ${theme}`}>
                <h2>Vote Analysis</h2>
                <div className={`charts-grid ${theme}`}>
                  {/* Pie Chart */}
                  <div className={`chart-card ${theme}`}>
                    <h3>Vote Distribution</h3>
                    <div className={`chart-content ${theme}`}>
                      <Pie
                        data={pieChartData}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className={`chart-card ${theme}`}>
                    <h3>Votes by Candidate</h3>
                    <div className={`chart-content ${theme}`}>
                      <Bar
                        data={barChartData}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              display: false
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={`candidates-section ${theme}`}>
                <h3>Candidate Results</h3>
                <div className="candidates-grid">
                  {[...voteDistribution]
                    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
                    .map((item, index) => (
                      <div key={index} className={`candidate-card ${theme}`}>
                        <div className="candidate-rank">
                          #{index + 1}
                        </div>
                        <img
                          src={
                            item.candidateId?.user?.profilePhoto
                              ? item.candidateId.user.profilePhoto
                              : unavailable
                          }
                          alt={item.candidateId?.user?.firstName || 'Unknown'}
                          className='candidate-photo-img'
                          onError={(e) => {
                            e.target.src = unavailable;
                          }}
                        />
                        <div className={`candidate-info ${theme}`}>
                          <h4>
                            {item.candidateId?.user?.firstName || 'Unknown'} {item.candidateId?.user?.lastName || ''}
                          </h4>
                          <p className="candidate-votes">Votes: {(item.votes || 0).toLocaleString()}</p>
                          {item.candidateId?.party && (
                            <p className="candidate-party">
                              Party: {item.candidateId.party.name}
                            </p>
                          )}
                          {item.candidateId?.user ? (
                            <Link
                              to={`/candidate/${item.candidateId.user._id}`}
                              className='candidate-link'
                            >
                              View Details
                            </Link>
                          ) : (
                            <span className='unavailable-msg'>Candidate Unavailable</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div className="no-results">
              <h3>No Results Available</h3>
              <p>There are no voting results available for this election yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Results
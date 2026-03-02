const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/user');
const Candidate = require('../models/candidate');
const router = express.Router();

const getModels = () => ({
  Election: mongoose.model("Election"),
  PresidentialElection: mongoose.model("PresidentialElection"),
  ParlimentaryElection: mongoose.model("ParlimentaryElection"),
  ProvincialElection: mongoose.model("ProvincialElection")
});

// ✅ FIXED: GET General Election Results with PROPER candidate matching
router.get('/general/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;
    console.log('🔍 Fetching general election results for:', electionId);

    // Validate election ID
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID format'
      });
    }

    const Election = mongoose.model('Election');
    const { Election } = getModels();
    const election = await Election.findById(electionId)
      .populate({
        path: 'candidates',
        populate: [
          {
            path: 'user',
            select: 'firstName lastName profilePhoto email'
          },
          {
            path: 'party',
            select: 'name logo description'
          }
        ]
      })
      .populate({
        path: 'results.voteDistribution.candidateId',
        populate: [
          {
            path: 'user',
            select: 'firstName lastName profilePhoto email'
          },
          {
            path: 'party',
            select: 'name logo description'
          }
        ]
      });

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    console.log('✅ Election found:', election.name);
    console.log('📊 Election total votes from DB:', election.results.totalVotes);
    console.log('👥 Candidates count:', election.candidates?.length || 0);
    console.log('🗳️ Vote Distribution from DB:', election.results.voteDistribution);

    // ✅ FIXED: Calculate results from ELECTION'S voteDistribution
    const results = {
      totalVotes: election.results.totalVotes, // Use the actual stored total
      voteDistribution: [],
      winningCandidate: null,
      winningParty: null
    };

    // ✅ FIXED: Process vote distribution - NO NEED TO MATCH CANDIDATES!
    // The voteDistribution.candidateId is already populated with candidate data
    election.results.voteDistribution.forEach(voteDist => {
      console.log(`📊 Processing vote distribution:`, {
        candidateId: voteDist.candidateId?._id,
        candidateName: voteDist.candidateId?.user?.firstName,
        votes: voteDist.votes
      });

      // ✅ FIXED: Use the ALREADY POPULATED candidate from voteDistribution
      if (voteDist.candidateId) {
        results.voteDistribution.push({
          candidateId: voteDist.candidateId, // Already populated with candidate data
          votes: voteDist.votes, // Use the actual votes from vote distribution
          voters: voteDist.voters || []
        });

        console.log(`✅ ${voteDist.candidateId.user?.firstName}: ${voteDist.votes} votes`);
      } else {
        console.log(`❌ Candidate not found in vote distribution: ${voteDist.candidateId}`);
      }
    });

    // ✅ FIXED: If no votes in voteDistribution but election has votes, create from candidates
    if (results.voteDistribution.length === 0 && election.results.totalVotes > 0 && election.candidates.length > 0) {
      console.log('🔄 Creating vote distribution from election data...');
      election.candidates.forEach(candidate => {
        // Find if this candidate has any votes in the original voteDistribution
        const existingVotes = election.results.voteDistribution.find(vd =>
          vd.candidateId && vd.candidateId.toString() === candidate._id.toString()
        );

        results.voteDistribution.push({
          candidateId: candidate,
          votes: existingVotes ? existingVotes.votes : 0,
          voters: existingVotes ? existingVotes.voters || [] : []
        });

        console.log(`📝 ${candidate.user?.firstName}: ${existingVotes ? existingVotes.votes : 0} votes`);
      });
    }

    // Sort by votes descending
    results.voteDistribution.sort((a, b) => b.votes - a.votes);

    // Find winner if there are votes
    if (results.voteDistribution.length > 0 && results.voteDistribution[0].votes > 0) {
      results.winningCandidate = results.voteDistribution[0].candidateId;

      // Calculate party votes
      const partyVotes = {};
      results.voteDistribution.forEach(item => {
        const partyName = item.candidateId?.party?.name || 'Independent';
        partyVotes[partyName] = (partyVotes[partyName] || 0) + item.votes;
      });

      // Find winning party
      const winningPartyEntry = Object.entries(partyVotes).sort((a, b) => b[1] - a[1])[0];
      if (winningPartyEntry) {
        results.winningParty = {
          name: winningPartyEntry[0],
          votes: winningPartyEntry[1]
        };
      }
    }

    const responseData = {
      _id: election._id,
      name: election.name,
      description: election.description,
      date: election.date,
      startTime: election.startTime,
      endTime: election.endTime,
      location: election.where,
      results: results
    };

    console.log('🎉 Final results calculated:');
    console.log('   Total votes:', results.totalVotes);
    console.log('   Vote distribution:', results.voteDistribution.map(vd => ({
      candidate: vd.candidateId.user?.firstName,
      votes: vd.votes
    })));
    console.log('   Winner:', results.winningCandidate ? results.winningCandidate.user?.firstName : 'No winner');

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error fetching general election results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch election results',
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

// ✅ FIXED: GET Presidential Election Results
router.get('/presidential/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;
    console.log('🔍 Fetching presidential election results for:', electionId);

    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID format'
      });
    }

    const PresidentialElection = mongoose.model('PresidentialElection');
    const { PresidentialElection } = getModels();
    const election = await PresidentialElection.findById(electionId)
      .populate({
        path: 'candidates',
        populate: [
          {
            path: 'user',
            select: 'firstName lastName profilePhoto email'
          },
          {
            path: 'party',
            select: 'name logo description'
          }
        ]
      })
      .populate({
        path: 'results.voteDistribution.candidateId',
        populate: [
          {
            path: 'user',
            select: 'firstName lastName profilePhoto email'
          },
          {
            path: 'party',
            select: 'name logo description'
          }
        ]
      });

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Presidential election not found'
      });
    }

    // ✅ FIXED: Calculate results from ELECTION'S voteDistribution
    const results = {
      totalVotes: election.results.totalVotes,
      voteDistribution: [],
      winningCandidate: null,
      winningParty: null
    };

    // ✅ FIXED: Use the already populated candidate from voteDistribution
    election.results.voteDistribution.forEach(voteDist => {
      if (voteDist.candidateId) {
        results.voteDistribution.push({
          candidateId: voteDist.candidateId,
          votes: voteDist.votes,
          voters: voteDist.voters || []
        });
      }
    });

    // Sort by votes
    results.voteDistribution.sort((a, b) => b.votes - a.votes);

    // Find winner
    if (results.voteDistribution.length > 0 && results.voteDistribution[0].votes > 0) {
      results.winningCandidate = results.voteDistribution[0].candidateId;

      const partyVotes = {};
      results.voteDistribution.forEach(item => {
        const partyName = item.candidateId?.party?.name || 'Independent';
        partyVotes[partyName] = (partyVotes[partyName] || 0) + item.votes;
      });

      const winningPartyEntry = Object.entries(partyVotes).sort((a, b) => b[1] - a[1])[0];
      if (winningPartyEntry) {
        results.winningParty = {
          name: winningPartyEntry[0],
          votes: winningPartyEntry[1]
        };
      }
    }

    const responseData = {
      _id: election._id,
      name: `Presidential Election ${election.year}`,
      description: election.description,
      date: election.date,
      startTime: election.startTime,
      endTime: election.endTime,
      year: election.year,
      results: results
    };

    console.log('✅ Presidential results calculated - Total votes:', results.totalVotes);
    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error fetching presidential election results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch presidential election results',
      error: error.message
    });
  }
});

// ✅ FIXED: GET Parliamentary Election Results
router.get('/parlimentary/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;
    console.log('🔍 Fetching parliamentary election results for:', electionId);

    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID format'
      });
    }

    const ParlimentaryElection = mongoose.model('ParlimentaryElection');
    const { ParlimentaryElection } = getModels();
    const election = await ParlimentaryElection.findById(electionId)
      .populate({
        path: 'candidates',
        populate: [
          {
            path: 'user',
            select: 'firstName lastName profilePhoto email'
          },
          {
            path: 'party',
            select: 'name logo description'
          }
        ]
      })
      .populate({
        path: 'results.voteDistribution.candidateId',
        populate: [
          {
            path: 'user',
            select: 'firstName lastName profilePhoto email'
          },
          {
            path: 'party',
            select: 'name logo description'
          }
        ]
      });

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Parliamentary election not found'
      });
    }

    // ✅ FIXED: Calculate results from ELECTION'S voteDistribution
    const results = {
      totalVotes: election.results.totalVotes,
      voteDistribution: [],
      winningCandidate: null,
      winningParty: null
    };

    // ✅ FIXED: Use the already populated candidate from voteDistribution
    election.results.voteDistribution.forEach(voteDist => {
      if (voteDist.candidateId) {
        results.voteDistribution.push({
          candidateId: voteDist.candidateId,
          votes: voteDist.votes,
          voters: voteDist.voters || []
        });
      }
    });

    // Sort by votes
    results.voteDistribution.sort((a, b) => b.votes - a.votes);

    // Find winner
    if (results.voteDistribution.length > 0 && results.voteDistribution[0].votes > 0) {
      results.winningCandidate = results.voteDistribution[0].candidateId;

      const partyVotes = {};
      results.voteDistribution.forEach(item => {
        const partyName = item.candidateId?.party?.name || 'Independent';
        partyVotes[partyName] = (partyVotes[partyName] || 0) + item.votes;
      });

      const winningPartyEntry = Object.entries(partyVotes).sort((a, b) => b[1] - a[1])[0];
      if (winningPartyEntry) {
        results.winningParty = {
          name: winningPartyEntry[0],
          votes: winningPartyEntry[1]
        };
      }
    }

    const responseData = {
      _id: election._id,
      name: `Parliamentary Election ${election.year}`,
      description: election.description,
      date: election.date,
      startTime: election.startTime,
      endTime: election.endTime,
      year: election.year,
      results: results
    };

    console.log('✅ Parliamentary results calculated - Total votes:', results.totalVotes);
    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error fetching parliamentary election results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parliamentary election results',
      error: error.message
    });
  }
});

// ✅ FIXED: GET Provincial Election Results
router.get('/provincial/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;
    console.log('🔍 Fetching provincial election results for:', electionId);

    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID format'
      });
    }

    const ProvincialElection = mongoose.model('ProvincialElection');
    const { ProvincialElection } = getModels();
    const election = await ProvincialElection.findById(electionId)
      .populate({
        path: 'candidates',
        populate: [
          {
            path: 'user',
            select: 'firstName lastName profilePhoto email'
          },
          {
            path: 'party',
            select: 'name logo description'
          }
        ]
      })
      .populate({
        path: 'results.voteDistribution.candidateId',
        populate: [
          {
            path: 'user',
            select: 'firstName lastName profilePhoto email'
          },
          {
            path: 'party',
            select: 'name logo description'
          }
        ]
      });

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Provincial election not found'
      });
    }

    // ✅ FIXED: Calculate results from ELECTION'S voteDistribution
    const results = {
      totalVotes: election.results.totalVotes,
      voteDistribution: [],
      winningCandidate: null,
      winningParty: null
    };

    // ✅ FIXED: Use the already populated candidate from voteDistribution
    election.results.voteDistribution.forEach(voteDist => {
      if (voteDist.candidateId) {
        results.voteDistribution.push({
          candidateId: voteDist.candidateId,
          votes: voteDist.votes,
          voters: voteDist.voters || []
        });
      }
    });

    // Sort by votes
    results.voteDistribution.sort((a, b) => b.votes - a.votes);

    // Find winner
    if (results.voteDistribution.length > 0 && results.voteDistribution[0].votes > 0) {
      results.winningCandidate = results.voteDistribution[0].candidateId;

      const partyVotes = {};
      results.voteDistribution.forEach(item => {
        const partyName = item.candidateId?.party?.name || 'Independent';
        partyVotes[partyName] = (partyVotes[partyName] || 0) + item.votes;
      });

      const winningPartyEntry = Object.entries(partyVotes).sort((a, b) => b[1] - a[1])[0];
      if (winningPartyEntry) {
        results.winningParty = {
          name: winningPartyEntry[0],
          votes: winningPartyEntry[1]
        };
      }
    }

    const responseData = {
      _id: election._id,
      name: `Provincial Election - ${election.province} ${election.year}`,
      description: election.description,
      date: election.date,
      startTime: election.startTime,
      endTime: election.endTime,
      year: election.year,
      province: election.province,
      results: results
    };

    console.log('✅ Provincial results calculated - Total votes:', results.totalVotes);
    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error fetching provincial election results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch provincial election results',
      error: error.message
    });
  }
});

// Health check for results route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Results API is working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

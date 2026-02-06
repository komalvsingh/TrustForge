// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TrustForgeDAO
 * @dev Basic DAO using TFX token for governance
 */
contract TrustForgeDAO is Ownable {
    IERC20 public immutable tfxToken;

    uint256 public constant MIN_PROPOSAL_TOKENS = 100 * 1e18;
    uint256 public constant VOTING_DURATION = 6 hours;

    struct Proposal {
        string description;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 endTime;
        bool executed;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed proposalId, string description);
    event Voted(uint256 indexed proposalId, address voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _tfxToken) Ownable(msg.sender) {
        tfxToken = IERC20(_tfxToken);
    }

    // =========================
    // Proposal Creation
    // =========================
    function createProposal(string calldata description) external {
        require(
            tfxToken.balanceOf(msg.sender) >= MIN_PROPOSAL_TOKENS,
            "Not enough TFX to create proposal"
        );

        proposalCount++;

        proposals[proposalCount] = Proposal({
            description: description,
            yesVotes: 0,
            noVotes: 0,
            endTime: block.timestamp + VOTING_DURATION,
            executed: false
        });

        emit ProposalCreated(proposalCount, description);
    }

    // =========================
    // Voting
    // =========================
    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];

        require(block.timestamp < proposal.endTime, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        uint256 votingPower = tfxToken.balanceOf(msg.sender);
        require(votingPower > 0, "No voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.yesVotes += votingPower;
        } else {
            proposal.noVotes += votingPower;
        }

        emit Voted(proposalId, msg.sender, support, votingPower);
    }

    // =========================
    // Execute Proposal
    // =========================
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];

        require(block.timestamp >= proposal.endTime, "Voting still active");
        require(!proposal.executed, "Already executed");
        require(proposal.yesVotes > proposal.noVotes, "Proposal failed");

        proposal.executed = true;

        // 🔧 Logic placeholder (important!)
        // In real DAO, this could:
        // - change protocol params
        // - transfer funds
        // - call another contract

        emit ProposalExecuted(proposalId);
    }

    // =========================
    // Helper
    // =========================
    function getProposal(uint256 proposalId)
        external
        view
        returns (
            string memory description,
            uint256 yesVotes,
            uint256 noVotes,
            uint256 endTime,
            bool executed
        )
    {
        Proposal storage p = proposals[proposalId];
        return (p.description, p.yesVotes, p.noVotes, p.endTime, p.executed);
    }
}

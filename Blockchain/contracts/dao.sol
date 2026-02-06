// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TrustForgeDAO
 * @dev DAO that controls TrustForge via executable proposals
 */
contract TrustForgeDAO is Ownable {
    IERC20 public immutable tfxToken;

    uint256 public constant MIN_PROPOSAL_TOKENS = 100 * 1e18;
    uint256 public constant VOTING_DURATION = 6 hours;

    struct Proposal {
        address target; // Contract to call (TrustForge)
        uint256 value; // ETH to send (usually 0)
        bytes data; // Encoded function call
        uint256 yesVotes;
        uint256 noVotes;
        uint256 endTime;
        bool executed;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed target,
        string description
    );
    event Voted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _tfxToken) Ownable(msg.sender) {
        tfxToken = IERC20(_tfxToken);
    }

    // =========================
    // Proposal Creation
    // =========================
    function createProposal(
        address target,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external {
        require(
            tfxToken.balanceOf(msg.sender) >= MIN_PROPOSAL_TOKENS,
            "Not enough TFX to create proposal"
        );
        require(target != address(0), "Invalid target");

        proposalCount++;

        proposals[proposalCount] = Proposal({
            target: target,
            value: value,
            data: data,
            yesVotes: 0,
            noVotes: 0,
            endTime: block.timestamp + VOTING_DURATION,
            executed: false
        });

        emit ProposalCreated(proposalCount, target, description);
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

        (bool success, ) = proposal.target.call{value: proposal.value}(
            proposal.data
        );
        require(success, "Execution failed");

        emit ProposalExecuted(proposalId);
    }

    // =========================
    // View Helper
    // =========================
    function getProposal(
        uint256 proposalId
    )
        external
        view
        returns (
            address target,
            uint256 value,
            bytes memory data,
            uint256 yesVotes,
            uint256 noVotes,
            uint256 endTime,
            bool executed
        )
    {
        Proposal storage p = proposals[proposalId];
        return (
            p.target,
            p.value,
            p.data,
            p.yesVotes,
            p.noVotes,
            p.endTime,
            p.executed
        );
    }

    // Allow DAO to receive ETH if needed
    receive() external payable {}
}

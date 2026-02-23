// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TrustForgeDAO v3 — Deployment Ready
 * @dev Governance contract for TrustForge
 *
 * CHANGELOG v2 → v3 (Deployment & Linking Fixes):
 * ─────────────────────────────────────────────────────────────────────────────
 * [DEPLOY-01] quorumThreshold moved to constructor argument — set it correctly
 *             at deploy time based on your expected USDC liquidity. Default
 *             of 1000 USDC was potentially unreachable.
 *
 * [DEPLOY-02] verifyLink() view — confirms DAO ↔ TrustForge are correctly
 *             wired and that the DAO actually owns TrustForge.
 *
 * [DEPLOY-03] proposeTrustForgeCall() helper — makes it easy to create proposals
 *             that call TrustForge admin functions without needing to manually
 *             ABI-encode calldata on the frontend. Just pass function name + args.
 *
 * [DEPLOY-04] getProposalState() — returns a human-readable status string
 *             (PENDING, ACTIVE, DEFEATED, QUEUED, EXECUTABLE, EXECUTED, CANCELLED)
 *             so frontends and users can clearly see what stage a proposal is in.
 *
 * [DEPLOY-05] Execution failure now returns the revert reason via
 *             bubbled-up error bytes, making debugging proposals much easier.
 *
 * ─── Full Proposal Lifecycle ─────────────────────────────────────────────────
 *   1. createProposal(target, value, data, description)
 *        requires: USDC >= 100, trust >= 500, 24h since last proposal
 *   2. vote(proposalId, true/false)
 *        during: endTime window (6 hours)
 *        power:  USDC balance at vote time
 *   3. [wait for voting to end + 24h timelock]
 *   4. executeProposal(proposalId)
 *        requires: majority yes + quorum met + timelock elapsed
 *        executes: target.call(data) — e.g. trustForge.setPlatformFee(150)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ─── Deployment Order ────────────────────────────────────────────────────────
 *   1. Deploy TrustForge(usdcToken, adminWallet)
 *   2. Deploy TrustForgeDAO(usdcToken, initialQuorum)
 *   3. trustForge.setDAO(daoAddress)
 *   4. dao.setTrustForgeAddress(trustForgeAddress)
 *   5. trustForge.transferOwnershipToDAO(daoAddress, yourWallet)
 *   6. dao.verifyLink()  — must return all true before going live
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface ITrustForge {
    function isEligibleForDAOProposal(address user) external view returns (bool);
    function owner() external view returns (address);
}

contract TrustForgeDAO is Ownable {

    // ============ References ============

    IERC20      public immutable usdcToken;
    ITrustForge public           trustForge;

    // ============ Governance Parameters ============

    uint256 public constant MIN_PROPOSAL_TOKENS = 100 * 1e6;  // 100 USDC
    uint256 public constant VOTING_DURATION     = 6 hours;
    uint256 public constant TIMELOCK_DELAY      = 24 hours;
    uint256 public constant PROPOSAL_COOLDOWN   = 24 hours;

    // [DEPLOY-01] Set at deploy time — not hardcoded
    uint256 public quorumThreshold;

    // ============ Proposal States [DEPLOY-04] ============

    enum ProposalState {
        PENDING,      // voting not started yet (shouldn't happen in current design)
        ACTIVE,       // voting in progress
        DEFEATED,     // voting ended, failed majority or quorum
        QUEUED,       // passed, waiting for timelock
        EXECUTABLE,   // timelock elapsed, ready to execute
        EXECUTED,     // done
        CANCELLED     // cancelled by owner
    }

    // ============ Structs ============

    struct Proposal {
        address proposer;
        address target;
        uint256 value;
        bytes   data;
        string  description;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 startBlock;
        uint256 snapshotTotal;
        uint256 endTime;
        uint256 executableAfter;
        bool    executed;
        bool    cancelled;
    }

    // ============ State ============

    uint256 public proposalCount;

    mapping(uint256 => Proposal)                         public proposals;
    mapping(uint256 => mapping(address => bool))         public hasVoted;
    mapping(uint256 => mapping(address => uint256))      public voterWeight;
    mapping(address => uint256)                          public lastProposalTime;

    // ============ Events ============

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address indexed target,
        string  description,
        uint256 endTime,
        uint256 executableAfter
    );
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);
    event TrustForgeLinked(address indexed trustForge);

    // ============ Constructor ============

    /**
     * @param _usdcToken      Address of the USDC token
     * @param _quorumThreshold Minimum yes-vote USDC (6 dec) for a proposal to pass.
     *                         Set this to something realistic — e.g. 500 * 1e6 for 500 USDC.
     *                         Too high = nothing ever passes. Too low = easy to pass bad proposals.
     */
    constructor(address _usdcToken, uint256 _quorumThreshold) Ownable(msg.sender) {
        require(_usdcToken != address(0),   "Invalid USDC token");
        require(_quorumThreshold > 0,       "Quorum must be > 0");
        usdcToken        = IERC20(_usdcToken);
        quorumThreshold  = _quorumThreshold;
    }

    // ============ Setup & Linking ============

    /**
     * @dev Link this DAO to the TrustForge contract.
     *      Call this AFTER deploying TrustForge and calling trustForge.setDAO(daoAddress).
     */
    function setTrustForgeAddress(address _trustForge) external onlyOwner {
        require(_trustForge != address(0), "Invalid address");
        trustForge = ITrustForge(_trustForge);
        emit TrustForgeLinked(_trustForge);
    }

    /**
     * @dev [DEPLOY-02] Verify the full DAO ↔ TrustForge link is correctly set up.
     *      Call this after all deployment steps — ALL values must be true before going live.
     *
     *      Returns:
     *        trustForgeSet      — dao.trustForge is set
     *        daoOwnsTrustForge  — trustForge.owner() == address(this)  ← critical
     *        quorumIsSet        — quorumThreshold > 0
     *        readyForGovernance — all three are true
     */
    function verifyLink() external view returns (
        bool trustForgeSet,
        bool daoOwnsTrustForge,
        bool quorumIsSet,
        bool readyForGovernance,
        address trustForgeAddress,
        address trustForgeOwner,
        uint256 currentQuorum
    ) {
        trustForgeSet     = address(trustForge) != address(0);
        daoOwnsTrustForge = trustForgeSet && (trustForge.owner() == address(this));
        quorumIsSet       = quorumThreshold > 0;
        readyForGovernance = trustForgeSet && daoOwnsTrustForge && quorumIsSet;

        return (
            trustForgeSet,
            daoOwnsTrustForge,
            quorumIsSet,
            readyForGovernance,
            address(trustForge),
            trustForgeSet ? trustForge.owner() : address(0),
            quorumThreshold
        );
    }

    // ============ Proposal Creation ============

    /**
     * @dev Create a raw governance proposal.
     *      For calling TrustForge admin functions, use proposeTrustForgeCall() instead.
     */
    function createProposal(
        address         target,
        uint256         value,
        bytes calldata  data,
        string calldata description
    ) external {
        require(target != address(0), "Invalid target");
        require(
            usdcToken.balanceOf(msg.sender) >= MIN_PROPOSAL_TOKENS,
            "Need >= 100 USDC to propose"
        );
        if (address(trustForge) != address(0)) {
            require(
                trustForge.isEligibleForDAOProposal(msg.sender),
                "Trust score < 500 - not eligible to propose"
            );
        }
        require(
            block.timestamp >= lastProposalTime[msg.sender] + PROPOSAL_COOLDOWN,
            "Must wait 24 hours between proposals"
        );

        _createProposal(target, value, data, description);
    }

    /**
     * @dev [DEPLOY-03] Convenience function — propose a call to a TrustForge admin function.
     *      Automatically sets target = trustForge and value = 0.
     *      Pass the ABI-encoded function call as `callData`.
     *
     *      Example (Ethers.js on frontend):
     *        const callData = trustForge.interface.encodeFunctionData("setPlatformFee", [150]);
     *        await dao.proposeTrustForgeCall(callData, "Reduce fee to 1.5%");
     *
     *      Example (Solidity test):
     *        bytes memory callData = abi.encodeWithSignature("setPlatformFee(uint256)", 150);
     *        dao.proposeTrustForgeCall(callData, "Reduce fee to 1.5%");
     */
    function proposeTrustForgeCall(
        bytes calldata  callData,
        string calldata description
    ) external returns (uint256 proposalId) {
        require(address(trustForge) != address(0), "TrustForge not linked");
        require(
            usdcToken.balanceOf(msg.sender) >= MIN_PROPOSAL_TOKENS,
            "Need >= 100 USDC to propose"
        );
        require(
    trustForge.isEligibleForDAOProposal(msg.sender),
    "Trust score < 500 - not eligible to propose"
);
        require(
            block.timestamp >= lastProposalTime[msg.sender] + PROPOSAL_COOLDOWN,
            "Must wait 24 hours between proposals"
        );

        return _createProposal(address(trustForge), 0, callData, description);
    }

    function _createProposal(
        address target,
        uint256 value,
        bytes memory data,
        string memory description
    ) internal returns (uint256) {
        lastProposalTime[msg.sender] = block.timestamp;
        proposalCount++;

        uint256 endTime         = block.timestamp + VOTING_DURATION;
        uint256 executableAfter = endTime + TIMELOCK_DELAY;

        proposals[proposalCount] = Proposal({
            proposer:        msg.sender,
            target:          target,
            value:           value,
            data:            data,
            description:     description,
            yesVotes:        0,
            noVotes:         0,
            startBlock:      block.number,
            snapshotTotal:   usdcToken.totalSupply(),
            endTime:         endTime,
            executableAfter: executableAfter,
            executed:        false,
            cancelled:       false
        });

        emit ProposalCreated(proposalCount, msg.sender, target, description, endTime, executableAfter);
        return proposalCount;
    }

    // ============ Voting ============

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];

        require(!proposal.cancelled,                "Proposal cancelled");
        require(block.timestamp < proposal.endTime, "Voting ended");
        require(!hasVoted[proposalId][msg.sender],   "Already voted");

        uint256 votingPower = usdcToken.balanceOf(msg.sender);
        require(votingPower > 0, "No USDC - no voting power");

        hasVoted[proposalId][msg.sender]    = true;
        voterWeight[proposalId][msg.sender] = votingPower;

        if (support) proposal.yesVotes += votingPower;
        else         proposal.noVotes  += votingPower;

        emit Voted(proposalId, msg.sender, support, votingPower);
    }

    // ============ Execution ============

    /**
     * @dev Execute a passed proposal.
     *      [DEPLOY-05] Bubbles up the revert reason if the call fails,
     *      so you can debug what went wrong (e.g. "Caller is not owner or DAO").
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];

        require(!proposal.cancelled,                         "Proposal cancelled");
        require(block.timestamp >= proposal.endTime,         "Voting still active");
        require(block.timestamp >= proposal.executableAfter, "Timelock not elapsed yet");
        require(!proposal.executed,                          "Already executed");
        require(proposal.yesVotes > proposal.noVotes,        "Majority not reached");
        require(proposal.yesVotes >= quorumThreshold,        "Quorum not reached");

        proposal.executed = true;

        // [DEPLOY-05] Bubble up revert reason for easier debugging
        (bool success, bytes memory returnData) = proposal.target.call{value: proposal.value}(proposal.data);

        if (!success) {
            // Bubble up the revert string if there is one
            if (returnData.length > 0) {
                assembly {
                    revert(add(32, returnData), mload(returnData))
                }
            } else {
                revert("Proposal execution failed (no reason)");
            }
        }

        emit ProposalExecuted(proposalId);
    }

    // ============ Proposal State [DEPLOY-04] ============

    /**
     * @dev Returns the current state of a proposal as an enum.
     *      Use this on the frontend to show users where a proposal is in its lifecycle.
     */
    function getProposalState(uint256 proposalId) external view returns (ProposalState) {
        Proposal storage p = proposals[proposalId];

        if (p.cancelled)                                            return ProposalState.CANCELLED;
        if (p.executed)                                             return ProposalState.EXECUTED;
        if (block.timestamp < p.endTime)                            return ProposalState.ACTIVE;
        if (p.yesVotes <= p.noVotes || p.yesVotes < quorumThreshold) return ProposalState.DEFEATED;
        if (block.timestamp < p.executableAfter)                    return ProposalState.QUEUED;
        return ProposalState.EXECUTABLE;
    }

    // ============ Cancellation ============

    function cancelProposal(uint256 proposalId) external onlyOwner {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed,  "Already executed");
        require(!proposal.cancelled, "Already cancelled");
        proposal.cancelled = true;
        emit ProposalCancelled(proposalId);
    }

    // ============ Admin ============

    function setQuorumThreshold(uint256 _quorum) external onlyOwner {
        require(_quorum > 0, "Quorum must be > 0");
        emit QuorumUpdated(quorumThreshold, _quorum);
        quorumThreshold = _quorum;
    }

    // ============ View Helpers ============

    function getProposal(uint256 proposalId) external view returns (
        address proposer, address target, uint256 value,
        bytes memory data, string memory description,
        uint256 yesVotes, uint256 noVotes,
        uint256 endTime, uint256 executableAfter,
        bool executed, bool cancelled
    ) {
        Proposal storage p = proposals[proposalId];
        return (
            p.proposer, p.target, p.value, p.data, p.description,
            p.yesVotes, p.noVotes, p.endTime, p.executableAfter,
            p.executed, p.cancelled
        );
    }

    function isProposalExecutable(uint256 proposalId) external view returns (bool) {
        Proposal storage p = proposals[proposalId];
        return (
            !p.executed &&
            !p.cancelled &&
            block.timestamp >= p.executableAfter &&
            p.yesVotes > p.noVotes &&
            p.yesVotes >= quorumThreshold
        );
    }

    receive() external payable {}
}

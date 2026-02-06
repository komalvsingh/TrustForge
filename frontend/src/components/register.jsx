import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBlockchain } from "../context/BlockchainContext";
import { useUser } from "../context/usercontext";

const Register = () => {
  const navigate = useNavigate();
  const { account, connectWallet, getAddressByUsername } = useBlockchain();
  const { registerUsername, hasUsername, loading: userLoading } = useUser();

  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Validate username in real-time
  const validateUsername = (value) => {
    setUsername(value);
    setValidationError("");
    setError("");

    // Check length
    if (value.length > 0 && value.length < 3) {
      setValidationError("Username must be at least 3 characters");
      return false;
    }

    if (value.length > 20) {
      setValidationError("Username must be at most 20 characters");
      return false;
    }

    // Check valid characters (alphanumeric + underscore)
    const validPattern = /^[a-zA-Z0-9_]*$/;
    if (value.length > 0 && !validPattern.test(value)) {
      setValidationError("Username can only contain letters, numbers, and underscores");
      return false;
    }

    // Check doesn't start with number
    if (value.length > 0 && /^[0-9]/.test(value)) {
      setValidationError("Username cannot start with a number");
      return false;
    }

    return true;
  };

  // Check if username is available
  const checkAvailability = async () => {
    if (!username || validationError) return;

    try {
      setLoading(true);
      const existingAddress = await getAddressByUsername(username);
      
      if (existingAddress) {
        setError("This username is already taken");
      } else {
        setSuccess("Username is available!");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (error) {
      console.error("Error checking availability:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    if (!username || validationError) {
      setError("Please enter a valid username");
      return;
    }

    try {
      setLoading(true);

      // Check if username is available
      const existingAddress = await getAddressByUsername(username);
      if (existingAddress) {
        setError("This username is already taken");
        return;
      }

      // Register username
      await registerUsername(username);
      
      setSuccess("Username registered successfully!");
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Registration error:", error);
      
      // Parse error message
      if (error.message.includes("already registered")) {
        setError("You have already registered a username");
      } else if (error.message.includes("Invalid username")) {
        setError("Invalid username format");
      } else if (error.message.includes("Username already taken")) {
        setError("This username is already taken");
      } else {
        setError("Failed to register username. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // If user already has username, redirect
  if (hasUsername && !userLoading) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to TrustForge
            </h1>
            <p className="text-gray-600">
              Choose a unique username to get started
            </p>
          </div>

          {/* Wallet Status */}
          {!account ? (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm font-medium mb-3">
                Please connect your wallet to continue
              </p>
              <button
                onClick={connectWallet}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm font-medium">
                Wallet Connected
              </p>
              <p className="text-green-600 text-xs mt-1 font-mono truncate">
                {account}
              </p>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => validateUsername(e.target.value)}
                  onBlur={checkAvailability}
                  placeholder="Enter your username"
                  disabled={!account || loading}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                    validationError || error
                      ? "border-red-300 bg-red-50"
                      : success
                      ? "border-green-300 bg-green-50"
                      : "border-gray-300"
                  } ${!account || loading ? "bg-gray-100 cursor-not-allowed" : ""}`}
                />
                {username && !validationError && !error && (
                  <div className="absolute right-3 top-3.5">
                    {success ? (
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : null}
                  </div>
                )}
              </div>
              
              {/* Validation Message */}
              {validationError && (
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {validationError}
                </p>
              )}
              
              {/* Success Message */}
              {success && (
                <p className="text-green-600 text-sm mt-2 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {success}
                </p>
              )}

              {/* Username Requirements */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Username Requirements:
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className="flex items-center">
                    <span className={`mr-2 ${username.length >= 3 && username.length <= 20 ? "text-green-500" : "text-gray-400"}`}>
                      {username.length >= 3 && username.length <= 20 ? "✓" : "○"}
                    </span>
                    3-20 characters long
                  </li>
                  <li className="flex items-center">
                    <span className={`mr-2 ${username && /^[a-zA-Z0-9_]*$/.test(username) ? "text-green-500" : "text-gray-400"}`}>
                      {username && /^[a-zA-Z0-9_]*$/.test(username) ? "✓" : "○"}
                    </span>
                    Only letters, numbers, and underscores
                  </li>
                  <li className="flex items-center">
                    <span className={`mr-2 ${username && !/^[0-9]/.test(username) ? "text-green-500" : "text-gray-400"}`}>
                      {username && !/^[0-9]/.test(username) ? "✓" : "○"}
                    </span>
                    Cannot start with a number
                  </li>
                </ul>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm font-medium flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!account || loading || !!validationError || !username}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                !account || loading || validationError || !username
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Registering...
                </span>
              ) : (
                "Register Username"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already registered?{" "}
              <button
                onClick={() => navigate("/dashboard")}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Go to Dashboard
              </button>
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 p-4 bg-white rounded-lg shadow border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Why register a username?
          </h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Easy identification in the TrustForge network</li>
            <li>• Others can vouch for you using your username</li>
            <li>• Build your reputation and trust score</li>
            <li>• Access personalized lending and borrowing features</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Register;
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
        navigate("/home");
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
    navigate("/home");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl"></div>
      </div>

      <div className="max-w-lg w-full relative z-10">
        {/* Card */}
        <div className="bg-[#0f1629]/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-blue-500/20 relative overflow-hidden">
          {/* Glow Effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-blue-500/5 opacity-50"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

          <div className="relative">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl mb-6 border border-blue-400/20 shadow-xl relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                <svg
                  className="w-12 h-12 text-blue-400 relative z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent mb-3 tracking-tight">
                TrustForge
              </h1>
              <p className="text-gray-400 text-base">
                Choose your unique username
              </p>
            </div>

            {/* Wallet Status */}
            {!account ? (
              <div className="mb-8 p-5 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/30 rounded-2xl backdrop-blur-sm">
                <p className="text-blue-300 text-sm font-medium mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Connect your wallet to continue
                </p>
                <button
                  onClick={connectWallet}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] border border-purple-400/20"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div className="mb-8 p-5 bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/30 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center mr-3 border border-purple-400/20">
                      <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-purple-300 text-sm font-semibold">Wallet Connected</p>
                      <p className="text-purple-400/70 text-xs font-mono truncate max-w-[200px]">
                        {account}
                      </p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse shadow-lg shadow-purple-400/50"></div>
                </div>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-semibold text-gray-300 mb-3"
                >
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => validateUsername(e.target.value)}
                    onBlur={checkAvailability}
                    placeholder="Enter your username"
                    disabled={!account || loading}
                    className={`relative w-full px-5 py-4 bg-[#0a0e1a] border rounded-xl focus:ring-2 focus:outline-none transition-all text-white placeholder-gray-500 text-base ${
                      validationError || error
                        ? "border-red-500/50 focus:ring-red-500/30 focus:border-red-500"
                        : success
                        ? "border-purple-500/50 focus:ring-purple-500/30 focus:border-purple-500"
                        : "border-blue-500/20 focus:ring-blue-500/30 focus:border-blue-500/50"
                    } ${!account || loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                  {username && !validationError && !error && success && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <svg
                        className="w-6 h-6 text-purple-400 animate-pulse"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Validation Message */}
                {validationError && (
                  <p className="text-red-400 text-sm mt-3 flex items-center animate-shake">
                    <svg
                      className="w-4 h-4 mr-2 flex-shrink-0"
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
                  <p className="text-purple-400 text-sm mt-3 flex items-center animate-fade-in">
                    <svg
                      className="w-4 h-4 mr-2 flex-shrink-0"
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

                {/* Username Requirements - Compact */}
                <div className="mt-4 grid grid-cols-1 gap-2">
                  <div className={`flex items-center text-xs transition-colors ${username.length >= 3 && username.length <= 20 ? "text-purple-400" : "text-gray-500"}`}>
                    <span className="mr-2 text-base">
                      {username.length >= 3 && username.length <= 20 ? "✓" : "○"}
                    </span>
                    3-20 characters
                  </div>
                  <div className={`flex items-center text-xs transition-colors ${username && /^[a-zA-Z0-9_]*$/.test(username) ? "text-purple-400" : "text-gray-500"}`}>
                    <span className="mr-2 text-base">
                      {username && /^[a-zA-Z0-9_]*$/.test(username) ? "✓" : "○"}
                    </span>
                    Letters, numbers, underscores only
                  </div>
                  <div className={`flex items-center text-xs transition-colors ${username && !/^[0-9]/.test(username) ? "text-purple-400" : "text-gray-500"}`}>
                    <span className="mr-2 text-base">
                      {username && !/^[0-9]/.test(username) ? "✓" : "○"}
                    </span>
                    Cannot start with number
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm animate-fade-in">
                  <p className="text-red-400 text-sm font-medium flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 flex-shrink-0"
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
                className={`w-full py-4 px-6 rounded-xl font-bold text-white text-base transition-all duration-300 relative overflow-hidden group ${
                  !account || loading || validationError || !username
                    ? "bg-gray-700/50 cursor-not-allowed opacity-50 border border-gray-600/30"
                    : "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-500 hover:via-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.02] border border-purple-400/30"
                }`}
              >
                {(!account || loading || validationError || !username) ? null : (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/20 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                )}
                <span className="relative z-10">
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
                </span>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-400">
                Already have a username?{" "}
                <button
                  onClick={() => navigate("/")}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline"
                >
                  Go to Dashboard →
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Register;

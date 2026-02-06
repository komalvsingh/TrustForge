import { createContext, useContext, useState, useEffect } from "react";
import { useBlockchain } from "./BlockchainContext";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { 
    account, 
    getUserProfile, 
    hasUsernameRegistered,
    registerUsername: blockchainRegisterUsername 
  } = useBlockchain();
  
  const [userProfile, setUserProfile] = useState(null);
  const [hasUsername, setHasUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState('idle'); // idle, checking, registered, not_registered

  // Check if user has registered username when account changes
  useEffect(() => {
    const checkUserRegistration = async () => {
      if (!account) {
        setUserProfile(null);
        setHasUsername(false);
        setRegistrationStatus('idle');
        return;
      }

      try {
        setRegistrationStatus('checking');
        setLoading(true);

        // Check if user has username
        const hasUsernameResult = await hasUsernameRegistered(account);
        setHasUsername(hasUsernameResult);

        if (hasUsernameResult) {
          // Fetch full user profile
          const profile = await getUserProfile(account);
          setUserProfile(profile);
          setRegistrationStatus('registered');
        } else {
          setUserProfile(null);
          setRegistrationStatus('not_registered');
        }
      } catch (error) {
        console.error("Error checking user registration:", error);
        setRegistrationStatus('not_registered');
      } finally {
        setLoading(false);
      }
    };

    checkUserRegistration();
  }, [account, getUserProfile, hasUsernameRegistered]);

  // Register username
  const registerUsername = async (username) => {
    if (!account) {
      throw new Error("Please connect your wallet first");
    }

    try {
      setLoading(true);
      await blockchainRegisterUsername(username);
      
      // Refresh user profile after registration
      const profile = await getUserProfile(account);
      setUserProfile(profile);
      setHasUsername(true);
      setRegistrationStatus('registered');
      
      return { success: true };
    } catch (error) {
      console.error("Error registering username:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Refresh user profile manually
  const refreshUserProfile = async () => {
    if (!account) return;

    try {
      setLoading(true);
      const profile = await getUserProfile(account);
      setUserProfile(profile);
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        userProfile,
        hasUsername,
        loading,
        registrationStatus,
        registerUsername,
        refreshUserProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};
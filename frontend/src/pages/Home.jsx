import Navbar from "../components/Navbar";
import { useBlockchain } from "../context/BlockchainContext";
import { Shield, TrendingUp, Lock, Users, Zap, CheckCircle, ArrowRight, Sparkles, Award, Wifi } from "lucide-react";

const Home = () => {
  const { account } = useBlockchain();

  const features = [
    {
      icon: Shield,
      title: "Trust Over Collateral",
      description: "Borrow without assets. Your on-chain behavior is your credit score.",
      gradient: "from-blue-500 via-blue-400 to-purple-500"
    },
    {
      icon: TrendingUp,
      title: "Risk-Based Pricing",
      description: "Lower trust = slightly higher interest. Build trust, earn better rates.",
      gradient: "from-purple-500 via-purple-400 to-blue-500"
    },
    {
      icon: Lock,
      title: "Controlled Exposure",
      description: "New users start small. Defaults hurt your score, not the system.",
      gradient: "from-blue-600 via-indigo-500 to-purple-600"
    },
    {
      icon: Users,
      title: "No Gaming the System",
      description: "New wallets = low trust = tiny limits. Cheating doesn't pay.",
      gradient: "from-purple-600 via-violet-500 to-blue-600"
    },
    {
      icon: Zap,
      title: "Behavior-Driven",
      description: "We don't ask who you are. We track how you behave.",
      gradient: "from-blue-500 via-indigo-500 to-purple-500"
    },
    {
      icon: CheckCircle,
      title: "Financial Inclusion",
      description: "No KYC, no collateral, no barriers. Just fair lending for all.",
      gradient: "from-purple-500 via-fuchsia-500 to-blue-500"
    }
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-inter">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      
      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px] animate-float"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[120px] animate-float-delayed"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse-slow"></div>

      <Navbar />

      <main className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Hero Section */}
        <div className="text-center mb-32">
          {/* Top Badge */}
          <div className="inline-block mb-8 animate-fade-in-down">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative px-6 py-3 bg-black ring-1 ring-white/10 rounded-full flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Next-Gen Decentralized Lending
                </span>
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Main Title */}
          <h1 className="text-7xl md:text-9xl font-black mb-6 tracking-tight animate-fade-in-up">
            <span className="inline-block bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
              TrustForge
            </span>
          </h1>

          <div className="relative inline-block mb-8 animate-fade-in-up animation-delay-200">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-2">
              Trust-Based, Collateral-Free Lending
            </h2>
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>
          </div>

          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto mb-4 leading-relaxed animate-fade-in-up animation-delay-300 font-light">
            Revolutionizing micro-lending through on-chain trust scores, transparent smart contracts, and wallet maturity analysis.
          </p>

          <p className="text-2xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-14 animate-fade-in-up animation-delay-400">
            No Collateral • No KYC • Just Trust
          </p>

          {/* Connection Status */}
          <div className="mb-16 animate-fade-in-up animation-delay-500">
            {account ? (
              <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-500/30 rounded-2xl hover:border-blue-400/50 transition-all duration-300 group">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
                  <Wifi className="w-5 h-5 text-blue-400 relative z-10" />
                </div>
                <span className="text-blue-300 font-semibold text-lg">Connected & Ready</span>
                <CheckCircle className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
            ) : (
              <div className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-purple-500/30 transition-all duration-300 cursor-pointer group">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                <span className="text-gray-400 font-semibold text-lg group-hover:text-gray-300 transition-colors">
                  Connect Wallet to Begin
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto animate-fade-in-up animation-delay-600">
            <div className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-blue-500/50 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Award className="w-10 h-10 text-blue-400 mb-4 mx-auto group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" />
              <div className="text-5xl font-black bg-gradient-to-br from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">100%</div>
              <div className="text-gray-400 font-medium">Trust-Based</div>
            </div>

            <div className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Shield className="w-10 h-10 text-purple-400 mb-4 mx-auto group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" />
              <div className="text-5xl font-black bg-gradient-to-br from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">0%</div>
              <div className="text-gray-400 font-medium">Collateral</div>
            </div>

            <div className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-indigo-500/50 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Sparkles className="w-10 h-10 text-indigo-400 mb-4 mx-auto group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" />
              <div className="text-5xl font-black bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">∞</div>
              <div className="text-gray-400 font-medium">Transparent</div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-fade-in-up">
              How It <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Works</span>
            </h3>
            <p className="text-gray-400 text-lg font-light animate-fade-in-up animation-delay-100">
              Six revolutionary principles powering the future of lending
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all duration-500 animate-fade-in-up hover:scale-105 hover:-translate-y-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Glow Effect */}
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}></div>

                  <div className="relative">
                    {/* Animated Icon Container */}
                    <div className="mb-6 relative">
                      <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-2xl blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
                      <div className={`relative w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-500`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-2xl font-bold text-white mb-4 group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                      {feature.title}
                    </h4>

                    {/* Description */}
                    <p className="text-gray-400 leading-relaxed mb-6 font-light">
                      {feature.description}
                    </p>

                    {/* Hover Arrow */}
                    <div className="flex items-center gap-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-0 group-hover:translate-x-2">
                      <span className="text-sm font-semibold">Explore</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Corner Accent */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative animate-fade-in-up">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-3xl"></div>

          <div className="relative bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-2xl border border-white/20 rounded-3xl p-16 overflow-hidden">
            {/* Animated Gradient Border */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-20 animate-gradient-x"></div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-1000"></div>

            <div className="relative z-10 text-center">
              <h3 className="text-4xl md:text-6xl font-black text-white mb-6">
                Ready to Build Your{" "}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Trust?
                </span>
              </h3>
              
              <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-light">
                Start with small loans, build your on-chain reputation, and unlock better rates as you prove yourself trustworthy.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <button className="group relative px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:scale-105">
                  <span className="relative z-10 flex items-center gap-3">
                    Start Lending
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                <button className="px-10 py-5 bg-transparent border-2 border-white/20 text-white font-bold text-lg rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 backdrop-blur-sm">
                  View Documentation
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-24 text-center animate-fade-in-up animation-delay-800">
          <p className="text-gray-600 text-sm mb-6 font-light">
            Secured by Blockchain • Fully Transparent • Community Driven
          </p>
          <div className="flex justify-center gap-8 text-gray-500 text-sm">
            <span className="hover:text-blue-400 transition-colors cursor-pointer font-medium">Documentation</span>
            <span className="text-gray-700">•</span>
            <span className="hover:text-purple-400 transition-colors cursor-pointer font-medium">Whitepaper</span>
            <span className="text-gray-700">•</span>
            <span className="hover:text-blue-400 transition-colors cursor-pointer font-medium">Community</span>
          </div>
        </div>
      </main>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .font-inter {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(20px);
          }
        }

        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }

        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out forwards;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animation-delay-100 {
          animation-delay: 0.1s;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-300 {
          animation-delay: 0.3s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animation-delay-500 {
          animation-delay: 0.5s;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
        }

        .animation-delay-800 {
          animation-delay: 0.8s;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
};

export default Home;

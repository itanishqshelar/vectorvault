import { useState } from 'react';
import { Lock, User, ArrowRight } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Mock login delay
    setTimeout(() => {
      onLogin();
    }, 800);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-neutral-950 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-[400px] z-10 glass-input p-10 rounded-3xl border border-neutral-800/50 shadow-2xl relative">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-indigo-500/20" />
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <h2 className="text-3xl font-display font-medium text-white mb-2 tracking-tight">VectorVault</h2>
          <p className="text-neutral-400 font-body text-sm">Sign in to your intelligent workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-neutral-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-neutral-900/40 border border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-neutral-200 placeholder-neutral-600 transition-all font-body text-[15px]"
              placeholder="Username or Email"
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-neutral-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-neutral-900/40 border border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-neutral-200 placeholder-neutral-600 transition-all font-body text-[15px]"
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full relative group overflow-hidden rounded-xl bg-blue-600 pt-3.5 pb-3.5 px-4 font-medium text-white shadow-lg transition-all hover:bg-blue-500 hover:shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all group-hover:scale-105" />
            <div className="relative flex items-center justify-center gap-2 font-display">
              {isSubmitting ? (
                <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </div>
          </button>
        </form>

      </div>
    </div>
  );
}

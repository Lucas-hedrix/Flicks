import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { Home } from './Home';
import headLightLogo from '../assets/head-light_mode.PNG';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Automatically sign up new users
        }
      });
      if (error) throw error;
      setSuccessMsg(`An 8-digit code has been sent to ${email}`);
      setStep('otp');
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to send login code');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpToken,
        type: 'email',
      });
      if (error) throw error;
      navigate('/');
    } catch (error: any) {
      setErrorMsg(error.message || 'Invalid code');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setErrorMsg(error.message);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 transition-colors duration-300">
      {/* Dreamy Home Screen Background */}
      <div className="absolute top-0 left-0 right-0 bottom-0 z-0 pointer-events-none opacity-80 dark:opacity-80 transition-opacity duration-300">
        <Home />
      </div>
      <div className="absolute inset-0 z-0 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-colors duration-300" />

      {/* Glassy Login Card */}
      <motion.div 
        className="relative z-10 w-full max-w-112.5 bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/50 dark:border-white/20 shadow-2xl p-10 md:p-12 rounded-3xl text-black dark:text-white flex flex-col items-center transition-colors duration-300"
        animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col items-center mb-8 w-full">
          <img src={headLightLogo} alt="Flicks Logo" className="h-10 md:h-12 mb-6 dark:invert transition-all" />
          <h1 className="text-2xl font-semibold text-center">
            {step === 'email' ? 'Welcome to Flicks' : 'Enter Login Code'}
          </h1>
        </div>
        
        {errorMsg && (
          <div className="w-full bg-[#e87c03]/90 backdrop-blur-md border border-[#e87c03]/50 text-white p-4 rounded-xl mb-6 text-sm text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && step === 'otp' && (
          <div className="w-full bg-green-600/80 backdrop-blur-md border border-green-400/30 text-white p-4 rounded-xl mb-6 text-sm text-center">
            {successMsg}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-5 w-full">
            <input 
              type="email" 
              placeholder="Email address"
              className="w-full bg-white/50 dark:bg-black/40 text-black dark:text-white border border-black/5 dark:border-white/10 px-5 py-4 rounded-xl outline-none focus:bg-white/80 dark:focus:bg-black/60 focus:border-netflix-red/50 dark:focus:border-netflix-red/50 transition-all placeholder:text-gray-500 shadow-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button 
              type="submit" 
              disabled={loading || !email}
              className="w-full bg-netflix-red text-white font-bold text-lg py-4 rounded-xl mt-2 hover:bg-[#b80710] hover:shadow-lg hover:shadow-netflix-red/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending Code...' : 'Continue with Email'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5 w-full">
            <div className="flex justify-between items-center px-1 mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate max-w-50">{email}</span>
              <button 
                type="button" 
                onClick={() => {
                  setStep('email');
                  setOtpToken('');
                  setSuccessMsg('');
                  setErrorMsg('');
                }}
                className="text-netflix-red text-sm font-bold hover:underline"
              >
                Change Email
              </button>
            </div>
            <input 
              type="text" 
              placeholder="Enter code"
              maxLength={8}
              className="w-full bg-white/50 dark:bg-black/40 text-black dark:text-white border border-black/5 dark:border-white/10 px-5 py-4 rounded-xl outline-none focus:bg-white/80 dark:focus:bg-black/60 focus:border-netflix-red/50 dark:focus:border-netflix-red/50 transition-all placeholder:text-gray-500 placeholder:tracking-normal text-center text-xl tracking-[0.5em] font-bold shadow-sm"
              value={otpToken}
              onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
              required
            />
            <button 
              type="submit" 
              disabled={loading || otpToken.length !== 8}
              className="w-full bg-netflix-red text-white font-bold text-lg py-4 rounded-xl mt-2 hover:bg-[#b80710] hover:shadow-lg hover:shadow-netflix-red/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
          </form>
        )}

        {step === 'email' && (
          <>
            <div className="flex items-center gap-4 my-8 w-full">
              <div className="h-px bg-black/10 dark:bg-white/10 flex-1 transition-colors duration-300"></div>
              <span className="text-gray-500 dark:text-white/40 text-sm font-medium transition-colors duration-300">OR</span>
              <div className="h-px bg-black/10 dark:bg-white/10 flex-1 transition-colors duration-300"></div>
            </div>

            <button 
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 text-black dark:text-white font-semibold py-4 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all mb-4 shadow-sm"
            >
              <FcGoogle size={24} />
              Continue with Google
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

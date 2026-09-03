import { useState, FormEvent } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, CheckCircle2, Sparkles, Send, RefreshCw } from 'lucide-react';
import { login, registerWithEmail, loginWithGoogle, resendVerificationEmail } from '../lib/api.ts';
import { User as UserType } from '../types.ts';

interface AuthPageProps {
  onSuccess: (user: UserType) => void;
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function AuthPage({ onSuccess, onToast }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [verificationNotice, setVerificationNotice] = useState<{
    show: boolean;
    email: string;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!email.trim() || !password) {
          throw new Error('Please enter both email and password.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        const res = await registerWithEmail(email, password);
        setVerificationNotice({ show: true, email: res.email });
        setIsSignUp(false); // Switch to sign in view so they can log in once verified
        onToast('info', `Verification link sent to ${res.email}. Please verify your email before logging in.`);
      } else {
        if (!email.trim() || !password) {
          throw new Error('Email or password is incorrect');
        }
        const res = await login(email, password);
        onToast('success', `Welcome back, ${res.user.name}!`);
        onSuccess(res.user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setErrorMessage(msg);
      // If the error indicates email verification is needed, show notice
      if (msg.includes('verify your email')) {
        setVerificationNotice({ show: true, email: email.trim() });
      }
      onToast('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const res = await loginWithGoogle();
      onToast('success', `Welcome to ClientVault, ${res.user.name}!`);
      onSuccess(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed.';
      setErrorMessage(msg);
      onToast('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password above to resend the verification link.');
      return;
    }
    setIsResending(true);
    setErrorMessage('');
    try {
      await resendVerificationEmail(email.trim(), password);
      onToast('success', `Verification link resent to ${email.trim()}. Please check your inbox.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend verification email.';
      setErrorMessage(msg);
      onToast('error', msg);
    } finally {
      setIsResending(false);
    }
  };

  const fillDemoAccount = async (demoRole: 'freelancer' | 'client') => {
    setIsLoading(true);
    setErrorMessage('');
    setVerificationNotice(null);
    try {
      const demoEmail = demoRole === 'freelancer' ? 'alex@designer.studio' : 'sarah@acme.inc';
      const demoPass = demoRole === 'freelancer' ? 'vault123' : 'client123';
      const res = await login(demoEmail, demoPass);
      onToast('success', `Signed in as Demo ${demoRole === 'freelancer' ? 'Freelancer' : 'Client'}`);
      onSuccess(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo sign in failed.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="auth-page" className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0B1221] text-sky-400 shadow-md mb-4 border border-slate-800">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          ClientVault
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {isSignUp
            ? 'Create your account to access the private client portal.'
            : 'Welcome back. Sign in to access your secure client vault.'}
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-xl shadow-sm border border-slate-200/80">
          {/* Form Tabs */}
          <div className="flex border-b border-slate-100 mb-6 pb-2 gap-4">
            <button
              type="button"
              id="tab-sign-in"
              onClick={() => {
                setIsSignUp(false);
                setErrorMessage('');
              }}
              className={`pb-2 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
                !isSignUp
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              id="tab-sign-up"
              onClick={() => {
                setIsSignUp(true);
                setErrorMessage('');
              }}
              className={`pb-2 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
                isSignUp
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Create an Account
            </button>
          </div>

          {/* Email Verification Banner */}
          {verificationNotice?.show && (
            <div
              id="verification-sent-notice"
              className="mb-6 p-4 rounded-xl bg-sky-50 border border-sky-200/80 text-sky-950 text-xs"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-sky-100 text-sky-600 rounded-lg shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 text-sm">
                    Check your email
                  </h4>
                  <p className="mt-1 text-slate-600 leading-relaxed">
                    A verification link was sent to <strong className="text-slate-900">{verificationNotice.email}</strong>. Please click the link in your email to verify your account, then sign in.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      id="resend-verification-btn"
                      onClick={handleResend}
                      disabled={isResending}
                      className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-800 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                      <span>{isResending ? 'Resending...' : 'Resend email'}</span>
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setVerificationNotice(null)}
                      className="text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div
              id="auth-error-banner"
              className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
            >
              {errorMessage}
            </div>
          )}

          {/* Google Authentication Section */}
          <div className="mb-5">
            <button
              type="button"
              id="google-auth-btn"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSignUp ? 'Register with Google' : 'Sign in with Google'}</span>
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">Or continue with email</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="auth-password"
                  type="password"
                  required
                  placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="auth-submit-btn"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#0B1221] hover:bg-slate-900 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>{isSignUp ? 'Create an Account & Verify' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Login Helpers - Available on both Registration and Login */}
          <div id="demo-accounts-section" className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Instant Demo Accounts</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {isSignUp ? 'Or test pre-seeded roles' : '1-click sign in'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                id="quick-demo-freelancer"
                onClick={() => fillDemoAccount('freelancer')}
                disabled={isLoading}
                className="flex flex-col items-start p-2.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-900 group-hover:text-sky-700">
                  <CheckCircle2 className="w-3 h-3 text-sky-600" />
                  <span>Freelancer View</span>
                </div>
                <span className="text-[11px] text-slate-500">Alex Rivera</span>
              </button>

              <button
                type="button"
                id="quick-demo-client"
                onClick={() => fillDemoAccount('client')}
                disabled={isLoading}
                className="flex flex-col items-start p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-900 group-hover:text-indigo-700">
                  <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                  <span>Client View</span>
                </div>
                <span className="text-[11px] text-slate-500">Sarah Chen (Acme)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Assurance Badge */}
        <p className="mt-6 text-center text-xs text-slate-500">
          ClientVault secures all uploaded files with user-isolated cloud storage and row-level authorization.
        </p>
      </div>
    </div>
  );
}


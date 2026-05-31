import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Building2, ArrowRight, Shield, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { authService } from '../lib/auth.service';
import { hasSupabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'user' | 'issuer';
  organization_name?: string;
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      role: 'user',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      if (!hasSupabase) {
        // Create a local mock account for development when Supabase isn't configured
        const mockUser = {
          id: `local_${Date.now()}`,
          email: data.email,
          name: data.name || data.email.split('@')[0],
          role: data.role,
          wallet_address: '',
          organization_name: data.organization_name,
        } as any;
        useAuthStore.getState().login(mockUser, 'local-token', `did:mock:${mockUser.id}`);
        toast.success('Mock account created (Supabase not configured)');
        navigate('/dashboard');
      } else {
        await authService.register({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          organization_name: data.organization_name,
        });
        toast.success('Account created! Your DID is being generated...');
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-dark-950">
      {/* Background effects */}
      <div className="absolute inset-0 bg-mesh opacity-30" />
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-secondary-500/10 rounded-full filter blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-md w-full"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-display font-bold text-gray-100">Create Your Identity</h1>
          <p className="text-gray-400 mt-2">Generate your DID and take control</p>
          {!hasSupabase && (
            <div className="mt-3 text-sm text-yellow-300">
              Supabase not configured — creating a <strong>mock</strong> account locally for development. To enable real backend functionality, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to a `.env` file and restart the dev server.
            </div>
          )}
        </div>

        {/* Form Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {}}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedRole === 'user'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-600 hover:border-dark-500'
                  }`}
                >
                  <User className={`w-6 h-6 mx-auto mb-2 ${selectedRole === 'user' ? 'text-primary-400' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${selectedRole === 'user' ? 'text-gray-100' : 'text-gray-400'}`}>
                    User
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Hold & verify credentials</p>
                </button>
                <button
                  type="button"
                  onClick={() => {}}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedRole === 'issuer'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-600 hover:border-dark-500'
                  }`}
                >
                  <Building2 className={`w-6 h-6 mx-auto mb-2 ${selectedRole === 'issuer' ? 'text-primary-400' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${selectedRole === 'issuer' ? 'text-gray-100' : 'text-gray-400'}`}>
                    Issuer
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Issue credentials</p>
                </button>
              </div>
              <input type="hidden" {...register('role')} />
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  {...register('name', {
                    required: 'Name is required',
                    minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  })}
                  className="input-field pl-12"
                  placeholder="John Doe"
                />
              </div>
              {errors.name && (
                <p className="text-error-400 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Organization Name (for issuers) */}
            {selectedRole === 'issuer' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organization Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    {...register('organization_name', {
                      required: selectedRole === 'issuer' ? 'Organization name is required' : false,
                    })}
                    className="input-field pl-12"
                    placeholder="Acme University"
                  />
                </div>
                {errors.organization_name && (
                  <p className="text-error-400 text-sm mt-1">{errors.organization_name.message}</p>
                )}
              </motion.div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  className="input-field pl-12"
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-error-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  className="input-field pl-12 pr-12"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-error-400 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === watch('password') || 'Passwords do not match',
                  })}
                  className="input-field pl-12"
                  placeholder="Confirm your password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-error-400 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                required
                className="w-4 h-4 mt-1 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-400">
                I agree to the{' '}
                <a href="#" className="text-primary-400 hover:text-primary-300">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary-400 hover:text-primary-300">
                  Privacy Policy
                </a>
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating DID...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-dark-700" />
            <span className="text-sm text-gray-500">or</span>
            <div className="flex-1 h-px bg-dark-700" />
          </div>

          {/* Login Link */}
          <p className="text-center text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* DID Info */}
        <div className="mt-6 p-4 bg-dark-800/50 rounded-xl border border-dark-700/50">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-300 font-medium">Your DID will be generated</p>
              <p className="text-xs text-gray-500 mt-1">
                A unique decentralized identifier will be created and anchored on blockchain
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

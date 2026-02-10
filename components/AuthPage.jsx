

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase.js';
import Icon from './Icon.jsx';
import { trackEvent } from '../analytics.js';

const countries = [
    { code: 'GB', name: 'United Kingdom' }, { code: 'IE', name: 'Ireland' },
    { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' },
    { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' }, { code: 'IT', name: 'Italy' },
    { code: 'NL', name: 'Netherlands' }, { code: 'BE', name: 'Belgium' },
    { code: 'SE', name: 'Sweden' }, { code: 'NO', name: 'Norway' },
    { code: 'DK', name: 'Denmark' }, { code: 'FI', name: 'Finland' },
    { code: 'CH', name: 'Switzerland' }, { code: 'AT', name: 'Austria' },
    { code: 'PT', name: 'Portugal' }, { code: 'PL', name: 'Poland' },
    { code: 'ZA', name: 'South Africa' }, { code: 'JP', name: 'Japan' },
    { code: 'SG', name: 'Singapore' }, { code: 'AE', name: 'United Arab Emirates' },
    { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' },
    { code: 'DZ', name: 'Algeria' }, { code: 'AD', name: 'Andorra' },
    { code: 'AO', name: 'Angola' }, { code: 'AR', name: 'Argentina' },
    { code: 'AM', name: 'Armenia' }, { code: 'AW', name: 'Aruba' },
    { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' },
    { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' },
    { code: 'BB', name: 'Barbados' }, { code: 'BY', name: 'Belarus' },
    { code: 'BZ', name: 'Belize' }, { code: 'BJ', name: 'Benin' },
    { code: 'BM', name: 'Bermuda' }, { code: 'BT', name: 'Bhutan' },
    { code: 'BO', name: 'Bolivia' }, { code: 'BA', name: 'Bosnia and Herzegovina' },
    { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
    { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' },
    { code: 'BI', name: 'Burundi' }, { code: 'KH', name: 'Cambodia' },
    { code: 'CM', name: 'Cameroon' }, { code: 'CV', name: 'Cape Verde' },
    { code: 'CF', name: 'Central African Republic' }, { code: 'TD', name: 'Chad' },
    { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
    { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' },
    { code: 'CG', name: 'Congo' }, { code: 'CR', name: 'Costa Rica' },
    { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' },
    { code: 'CY', name: 'Cyprus' }, { code: 'CZ', name: 'Czech Republic' },
    { code: 'CI', name: 'Côte d\'Ivoire' }, { code: 'DJ', name: 'Djibouti' },
    { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Dominican Republic' },
    { code: 'EC', name: 'Ecuador' }, { code: 'EG', name: 'Egypt' },
    { code: 'SV', name: 'El Salvador' }, { code: 'GQ', name: 'Equatorial Guinea' },
    { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' },
    { code: 'ET', name: 'Ethiopia' }, { code: 'FJ', name: 'Fiji' },
    { code: 'GA', name: 'Gabon' }, { code: 'GM', name: 'Gambia' },
    { code: 'GE', name: 'Georgia' }, { code: 'GH', name: 'Ghana' },
    { code: 'GR', name: 'Greece' }, { code: 'GD', name: 'Grenada' },
    { code: 'GT', name: 'Guatemala' }, { code: 'GN', name: 'Guinea' },
    { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' },
    { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' },
    { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' },
    { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
    { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' },
    { code: 'IL', name: 'Israel' }, { code: 'JM', name: 'Jamaica' },
    { code: 'JO', name: 'Jordan' }, { code: 'KZ', name: 'Kazakhstan' },
    { code: 'KE', name: 'Kenya' }, { code: 'KW', name: 'Kuwait' },
    { code: 'KG', name: 'Kyrgyzstan' }, { code: 'LA', name: 'Laos' },
    { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' },
    { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' },
    { code: 'LY', name: 'Libya' }, { code: 'LI', name: 'Liechtenstein' },
    { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' },
    { code: 'MK', name: 'Macedonia' }, { code: 'MG', name: 'Madagascar' },
    { code: 'MW', name: 'Malawi' }, { code: 'MY', name: 'Malaysia' },
    { code: 'MV', name: 'Maldives' }, { code: 'ML', name: 'Mali' },
    { code: 'MT', name: 'Malta' }, { code: 'MR', name: 'Mauritania' },
    { code: 'MU', name: 'Mauritius' }, { code: 'MX', name: 'Mexico' },
    { code: 'MD', name: 'Moldova' }, { code: 'MC', name: 'Monaco' },
    { code: 'MN', name: 'Mongolia' }, { code: 'ME', name: 'Montenegro' },
    { code: 'MA', name: 'Morocco' }, { code: 'MZ', name: 'Mozambique' },
    { code: 'MM', name: 'Myanmar' }, { code: 'NA', name: 'Namibia' },
    { code: 'NP', name: 'Nepal' }, { code: 'NI', name: 'Nicaragua' },
    { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' },
    { code: 'KP', name: 'North Korea' }, { code: 'OM', name: 'Oman' },
    { code: 'PK', name: 'Pakistan' }, { code: 'PA', name: 'Panama' },
    { code: 'PG', name: 'Papua New Guinea' }, { code: 'PY', name: 'Paraguay' },
    { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' },
    { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Romania' },
    { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Rwanda' },
    { code: 'KN', name: 'Saint Kitts and Nevis' }, { code: 'LC', name: 'Saint Lucia' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines' }, { code: 'SM', name: 'San Marino' },
    { code: 'ST', name: 'Sao Tome and Principe' }, { code: 'SA', name: 'Saudi Arabia' },
    { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' },
    { code: 'SC', name: 'Seychelles' }, { code: 'SL', name: 'Sierra Leone' },
    { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' },
    { code: 'SO', name: 'Somalia' }, { code: 'KR', name: 'South Korea' },
    { code: 'SS', name: 'South Sudan' }, { code: 'LK', name: 'Sri Lanka' },
    { code: 'SD', name: 'Sudan' }, { code: 'SR', name: 'Suriname' },
    { code: 'SZ', name: 'Swaziland' }, { code: 'SY', name: 'Syria' },
    { code: 'TW', name: 'Taiwan' }, { code: 'TJ', name: 'Tajikistan' },
    { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' },
    { code: 'TL', name: 'Timor-Leste' }, { code: 'TG', name: 'Togo' },
    { code: 'TT', name: 'Trinidad and Tobago' }, { code: 'TN', name: 'Tunisia' },
    { code: 'TR', name: 'Turkey' }, { code: 'TM', name: 'Turkmenistan' },
    { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ukraine' },
    { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' },
    { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' },
    { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' },
    { code: 'ZW', name: 'Zimbabwe' },
];


const AuthPage = ({ onClose }) => {
  const [view, setView] = useState('signIn'); // 'signIn', 'signUp', 'forgotPassword'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  // New state for individual date parts
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const [countryCode, setCountryCode] = useState('');
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ageValidationError, setAgeValidationError] = useState('');
  const [message, setMessage] = useState(null);
  const [showResendLink, setShowResendLink] = useState(false);
  
  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Refs for auto-focusing DOB inputs
  const dayRef = useRef(null);
  const monthRef = useRef(null);
  const yearRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  
  const resetFormState = () => {
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
    setShowResendLink(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAgreedToTerms(false);
    // keep email and username for convenience
  };

  // This effect combines the day, month, and year into the dob string
  useEffect(() => {
    if (year && month && day && year.length === 4 && month.length >= 1 && day.length >= 1) {
      const paddedDay = day.toString().padStart(2, '0');
      const paddedMonth = month.toString().padStart(2, '0');
      setDob(`${year}-${paddedMonth}-${paddedDay}`);
    } else {
      setDob(''); // Clear DOB if any part is missing or incomplete
    }
  }, [day, month, year]);


  useEffect(() => {
    // This validation logic now runs automatically whenever 'dob' is updated
    if (view !== 'signUp' || !dob || !countryCode) {
        setAgeValidationError('');
        return;
    }

    const birthDate = new Date(dob);
    const today = new Date();
    
    // Set hours to 0 to avoid timezone issues affecting age calculation
    birthDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (isNaN(birthDate.getTime()) || birthDate >= today) {
        setAgeValidationError('Please enter a valid date of birth.');
        return;
    }
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    const requiredAge = countryCode === 'US' ? 21 : 18;

    if (age < requiredAge) {
        setAgeValidationError(`You must be at least ${requiredAge} to sign up.`);
    } else {
        setAgeValidationError('');
    }
}, [dob, countryCode, view]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetFormState();

    try {
      if (view === 'signUp') {
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match.');
        }
        if (!username || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
            throw new Error('Username must be 3-20 characters and contain only letters, numbers, or underscores.');
        }
        if (ageValidationError) {
            throw new Error(ageValidationError);
        }
        
        const signupUtmSource = sessionStorage.getItem('stoutly-utm-source');

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              accepts_marketing: acceptsMarketing,
              signup_utm_source: signupUtmSource,
              dob,
              country_code: countryCode,
            },
          },
        });

        if (signUpError) {
          console.error("Supabase SignUp Error:", signUpError);
          throw signUpError;
        }

        // CRITICAL CHECK: Ensure Supabase returns user data, otherwise something is wrong with the project config.
        if (!data || (!data.user && !data.session)) {
            console.error("Inconsistent Supabase Response: SignUp returned no error, but also no user or session data. This could indicate a configuration issue in your Supabase project (e.g., email provider limits, disabled signups).", data);
            throw new Error("An unexpected issue occurred during signup. Please check your browser's developer console and your Supabase project's auth logs for more details.");
        }

        trackEvent('sign_up', { method: 'email', marketing_consent: acceptsMarketing });

        if (data.user && !data.session) {
          setMessage("We've sent a confirmation link to your email. Please click it to complete your registration.");
        } else {
          // This case can happen if "Confirm email" is disabled in Supabase settings.
          // The onAuthStateChange listener in App.jsx will handle closing the modal.
          console.log("Signup successful and session created immediately.");
        }
      } else { // 'signIn'
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // onAuthStateChange in App.jsx will handle closing modal on success
      }
    } catch (err) {
      console.error("Full Auth Error Object:", err);
      const errorMessage = err.error_description || err.message;
      setError(errorMessage);

      if (errorMessage.toLowerCase().includes('email not confirmed')) {
        setShowResendLink(true);
      }

      if (view === 'signIn') {
        trackEvent('login_failed', { error_message: err.message });
      } else if (view === 'signUp') {
        trackEvent('sign_up_failed', { error_message: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    setShowResendLink(false);
    trackEvent('resend_verification_request');

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (resendError) {
      setError(resendError.message);
      setShowResendLink(true); // Allow user to try again
    } else {
      setMessage("A new verification link has been sent to your email.");
    }
    setLoading(false);
  };


  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetFormState();
    trackEvent('password_reset_request');
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });
    
    if (resetError) {
        setError(resetError.message);
    } else {
        setMessage('Check your email for a password reset link.');
    }
    setLoading(false);
  };

  const handleClose = () => {
    // Only track this event if the user is actively closing the modal,
    // not when it's closed automatically after success or on a message screen.
    if (!message && !loading) { 
      trackEvent('auth_modal_closed', { on_view: view });
    }
    onClose();
  };

  const handleDobChange = (field, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (field === 'day') {
        setDay(numericValue);
        if (numericValue.length === 2 && monthRef.current) {
            monthRef.current.focus();
        }
    } else if (field === 'month') {
        setMonth(numericValue);
        if (numericValue.length === 2 && yearRef.current) {
            yearRef.current.focus();
        }
    } else if (field === 'year') {
        setYear(numericValue);
    }
  };
  
  const isSignupButtonDisabled = useMemo(() => {
    if (loading) return true;
    if (view !== 'signUp') return false;
    return !username || !email || !password || !confirmPassword || !dob || !countryCode || !!ageValidationError || !agreedToTerms;
  }, [loading, view, username, email, password, confirmPassword, dob, countryCode, ageValidationError, agreedToTerms]);

  const renderContent = () => {
    if (message) {
      return (
        <div className="text-center">
            <i className="fas fa-paper-plane text-amber-500 text-4xl mb-4"></i>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Check your email</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-6 bg-yellow-50 dark:bg-yellow-900/50 p-3 rounded-md border border-yellow-200 dark:border-yellow-700">
                <i className="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
                If you don't see the email within a few minutes, please check your spam or junk folder.
            </p>
            <button
                onClick={() => { resetFormState(); setView('signIn'); }}
                className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors"
            >
                Back to Sign In
            </button>
        </div>
      );
    }
    
    if (view === 'forgotPassword') {
        return (
            <>
                <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">Reset Password</h2>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-6">Enter your email to get a reset link.</p>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="email-reset">Email</label>
                        <input id="email-reset" className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 flex items-center justify-center">
                        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div> : 'Send Instructions'}
                    </button>
                </form>
                 <div className="mt-6 text-center">
                    <button onClick={() => { resetFormState(); setView('signIn'); }} className="text-sm text-amber-600 dark:text-amber-400 hover:underline">
                        Back to Sign In
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">{view === 'signUp' ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6">{view === 'signUp' ? 'Join the community!' : 'Sign in to continue'}</p>
            <form onSubmit={handleAuth} className="space-y-4">
                {view === 'signUp' && (
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="username">Username</label>
                        <div className="absolute left-3 top-9 text-gray-400"><i className="fas fa-user"></i></div>
                        <input id="username" className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" type="text" placeholder="YourUsername" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </div>
                )}
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">Email</label>
                     <div className="absolute left-3 top-9 text-gray-400"><i className="fas fa-envelope"></i></div>
                    <input id="email" className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">Password</label>
                     <div className="absolute left-3 top-9 text-gray-400"><i className="fas fa-lock"></i></div>
                    <input 
                        id="password" 
                        className="w-full pl-9 pr-10 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                </div>
                {view === 'signUp' && (
                    <>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="confirm-password">Confirm Password</label>
                            <div className="absolute left-3 top-9 text-gray-400"><i className="fas fa-lock"></i></div>
                            <input 
                                id="confirm-password" 
                                className="w-full pl-9 pr-10 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" 
                                type={showConfirmPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                required 
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 focus:outline-none"
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                <i className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="country">Country</label>
                            <div className="relative">
                                <div className="absolute left-3 top-3 text-gray-400"><i className="fas fa-globe-americas"></i></div>
                                <select id="country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} required className="w-full appearance-none pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500">
                                    <option value="" disabled>Select your country...</option>
                                    {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-400">
                                    <i className="fas fa-chevron-down text-xs"></i>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                             <div className="flex items-center gap-2">
                                <input
                                    ref={dayRef}
                                    type="tel"
                                    value={day}
                                    onChange={(e) => handleDobChange('day', e.target.value)}
                                    placeholder="DD"
                                    maxLength="2"
                                    required
                                    className="w-full px-3 py-2 text-center bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="text-gray-400 dark:text-gray-500">/</span>
                                <input
                                    ref={monthRef}
                                    type="tel"
                                    value={month}
                                    onChange={(e) => handleDobChange('month', e.target.value)}
                                    placeholder="MM"
                                    maxLength="2"
                                    required
                                    className="w-full px-3 py-2 text-center bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="text-gray-400 dark:text-gray-500">/</span>
                                <input
                                    ref={yearRef}
                                    type="tel"
                                    value={year}
                                    onChange={(e) => handleDobChange('year', e.target.value)}
                                    placeholder="YYYY"
                                    maxLength="4"
                                    required
                                    className="w-full px-3 py-2 text-center bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>

                        {ageValidationError && <p className="text-red-500 text-sm text-center -mt-2">{ageValidationError}</p>}
                        
                        <div className="pt-2">
                            <label htmlFor="accepts-marketing" className="flex items-start space-x-3 cursor-pointer">
                                <input
                                id="accepts-marketing"
                                type="checkbox"
                                checked={acceptsMarketing}
                                onChange={(e) => setAcceptsMarketing(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-amber-600 focus:ring-amber-500"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                Be the first to know! Notify me about new features, community events, and exclusive Stoutly news.
                                </span>
                            </label>
                        </div>
                        <div className="pt-2">
                            <label htmlFor="agreed-to-terms" className="flex items-start space-x-3 cursor-pointer">
                                <input
                                id="agreed-to-terms"
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-amber-600 focus:ring-amber-500"
                                required
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                I agree to the <a href="/?page=terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-600 dark:text-amber-400 hover:underline">Terms of Use</a> and <a href="/?page=privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-600 dark:text-amber-400 hover:underline">Privacy Policy</a>.
                                </span>
                            </label>
                        </div>
                    </>
                )}
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                {showResendLink && (
                    <p className="text-center text-sm -mt-2">
                        <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={loading}
                            className="text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
                        >
                            Resend verification email
                        </button>
                    </p>
                )}
                <button type="submit" disabled={view === 'signUp' ? isSignupButtonDisabled : loading} className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center">
                    {loading && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>}
                    {loading ? 'Please wait...' : view === 'signUp' ? 'Sign Up' : 'Sign In'}
                </button>
            </form>
            <div className="mt-4 text-center">
                {view === 'signIn' && (
                    <button onClick={() => { resetFormState(); setView('forgotPassword'); }} className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
                        Forgot Password?
                    </button>
                )}
            </div>
            <div className="mt-6 text-center">
                <button onClick={() => { resetFormState(); setView(view === 'signIn' ? 'signUp' : 'signIn'); }} className="text-sm text-amber-600 dark:text-amber-400 hover:underline">
                    {view === 'signIn' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                </button>
            </div>
        </>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 z-[1200] flex items-center justify-center p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-t-4 border-amber-400 flex flex-col max-h-[90vh]">
          <button
              onClick={handleClose}
              className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full z-10"
              aria-label="Close authentication"
          >
              <i className="fas fa-times fa-lg"></i>
          </button>
          
          <div className="p-8 pb-4 flex-shrink-0">
            <div className="mb-6 h-20 w-20 mx-auto">
                <Icon className="w-full h-full" />
            </div>
          </div>
          <div className="px-8 pb-8 overflow-y-auto" style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}>
             {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
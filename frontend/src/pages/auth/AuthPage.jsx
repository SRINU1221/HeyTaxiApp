import { useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { sendOtp, verifyOtp, registerUser, setStep, clearError } from '../../store/slices/authSlice'
import { useNavigate, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'RIDER', label: 'Rider', icon: '🧑', desc: 'Book rides instantly' },
  { value: 'DRIVER', label: 'Driver', icon: '🚖', desc: 'Earn on your terms' },
]

const ADMIN_EMAIL = 'srinuchauhan2025@gmail.com'

const VEHICLES = [
  { icon: '🏍️', label: 'Bike', desc: 'Quick & affordable' },
  { icon: '🛺', label: 'Auto', desc: 'Comfortable & fast' },
  { icon: '🚗', label: 'Car', desc: 'Premium rides' },
]

export default function AuthPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error, step, user } = useSelector(s => s.auth)

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isNewUser, setIsNewUser] = useState(false)
  const [registerData, setRegisterData] = useState({ name: '', phoneNumber: '', role: 'RIDER' })
  const otpRefs = useRef([])

  if (user) {
    const path =
      user.role === 'RIDER' ? '/rider' :
      user.role === 'DRIVER' ? '/driver' : '/admin'
    return <Navigate to={path} replace />
  }

  const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!email) return

    const result = await dispatch(sendOtp(email))

    if (sendOtp.fulfilled.match(result)) {
      if (result.payload.success) {
        toast.success('OTP sent to your email! 📧')
      } else {
        setIsNewUser(true)
        // ✅ Auto-set ADMIN role for admin email, RIDER for everyone else
        if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setRegisterData(p => ({ ...p, role: 'ADMIN' }))
        } else {
          setRegisterData(p => ({ ...p, role: 'RIDER' }))
        }
        dispatch(setStep('register'))
        toast("No account found — let's create one! ✨", { icon: '🎉' })
      }
    } else {
      toast.error(result.payload || 'Something went wrong')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!registerData.name.trim()) { toast.error('Please enter your name'); return }
    if (registerData.phoneNumber && registerData.phoneNumber.length !== 10) {
      toast.error('Phone number must be 10 digits'); return
    }
    const result = await dispatch(registerUser({ ...registerData, email }))
    if (registerUser.fulfilled.match(result)) {
      toast.success(`Account created! OTP sent to ${email} 🎉`)
    } else {
      toast.error(result.payload || 'Registration failed')
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtp = [...otp]
    pasted.split('').forEach((d, i) => { if (i < 6) newOtp[i] = d })
    setOtp(newOtp)
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    const otpString = otp.join('')
    if (otpString.length !== 6) { toast.error('Enter complete 6-digit OTP'); return }
    const result = await dispatch(verifyOtp({ email, otp: otpString }))
    if (verifyOtp.fulfilled.match(result) && result.payload.success) {
      toast.success('Welcome to HeyTaxi! 🚖')
      const role = result.payload.data.user.role
      navigate(role === 'RIDER' ? '/rider' : role === 'DRIVER' ? '/driver' : '/admin', { replace: true })
    } else {
      const message = result.payload?.message || result.payload || 'Invalid OTP'
      toast.error(typeof message === 'string' ? message : 'Invalid OTP')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    }
  }

  const handleResendOtp = async () => {
    setOtp(['', '', '', '', '', ''])
    const result = await dispatch(sendOtp(email))
    if (sendOtp.fulfilled.match(result) && result.payload.success) {
      toast.success('OTP resent! 📧')
    } else {
      toast.error('Failed to resend OTP')
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-400/10 to-transparent" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-400/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary-400/5 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-primary-400 rounded-xl flex items-center justify-center text-xl">🚖</div>
            <span className="text-2xl font-display font-bold">HeyTaxi</span>
          </div>
          <h1 className="text-5xl font-display font-bold leading-tight mb-6">
            Your ride,<br />
            <span className="gradient-text">your way.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md">
            Book bikes, autos & cars in seconds. Transparent pricing, ₹2 platform fee — no surprises.
          </p>
        </div>
        <div className="relative space-y-4">
          {VEHICLES.map((v) => (
            <div key={v.label} className="flex items-center gap-4 bg-white/3 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
              <span className="text-3xl">{v.icon}</span>
              <div>
                <div className="font-semibold text-white">{v.label}</div>
                <div className="text-sm text-gray-400">{v.desc}</div>
              </div>
            </div>
          ))}
          <div className="bg-dark-700/50 rounded-2xl p-4 border border-primary-400/20">
            <div className="text-xs text-primary-400 font-semibold mb-1">💰 TRANSPARENT PRICING</div>
            <div className="text-white font-medium">₹2 platform commission per ride</div>
            <div className="text-gray-400 text-sm">Drivers keep the rest</div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary-400 rounded-lg flex items-center justify-center">🚖</div>
            <span className="text-xl font-display font-bold">HeyTaxi</span>
          </div>

          {/* ── Step: Email ── */}
          {step === 'email' && (
            <div className="animate-slide-up">
              <h2 className="text-3xl font-display font-bold mb-2">Welcome</h2>
              <p className="text-gray-400 mb-8">Enter your email to sign in or create an account</p>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email address</label>
                  <input
                    type="email" value={email}
                    onChange={e => { setEmail(e.target.value); dispatch(clearError()) }}
                    placeholder="you@example.com" required className="input-field text-lg"
                    autoFocus disabled={loading}
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full text-base">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Checking...
                    </span>
                  ) : 'Continue →'}
                </button>
                <p className="text-center text-gray-500 text-sm">
                  New here? We'll set up your account automatically.
                </p>
              </form>
            </div>
          )}

          {/* ── Step: Register ── */}
          {step === 'register' && (
            <div className="animate-slide-up">
              <button
                onClick={() => { dispatch(setStep('email')); setIsNewUser(false); dispatch(clearError()) }}
                className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1"
              >
                ← Back
              </button>
              <h2 className="text-3xl font-display font-bold mb-1">Create account</h2>
              <p className="text-gray-400 text-sm mb-1">
                Registering for: <span className="text-white font-medium">{email}</span>
              </p>
              <p className="text-gray-500 text-sm mb-6">
                {isAdminEmail ? 'Admin account setup' : 'Choose your role — this determines what you see in the app'}
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text" value={registerData.name}
                    onChange={e => setRegisterData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your full name" required className="input-field"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel" value={registerData.phoneNumber}
                    onChange={e => setRegisterData(p => ({ ...p, phoneNumber: e.target.value.replace(/\D/g, '') }))}
                    placeholder="10-digit phone number" maxLength={10} className="input-field"
                  />
                </div>

                {/* ✅ Hide role selector for admin email */}
                {!isAdminEmail && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">I want to join as</label>
                    <div className="grid grid-cols-2 gap-3">
                      {ROLES.map(r => (
                        <button
                          key={r.value} type="button"
                          onClick={() => setRegisterData(p => ({ ...p, role: r.value }))}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${
                            registerData.role === r.value
                              ? 'border-primary-400 bg-primary-400/10'
                              : 'border-white/10 bg-dark-700 hover:border-white/20'
                          }`}
                        >
                          <div className="text-2xl mb-1">{r.icon}</div>
                          <div className="font-semibold text-sm">{r.label}</div>
                          <div className="text-xs text-gray-400 leading-tight mt-0.5">{r.desc}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {registerData.role === 'RIDER' && "🧑 You'll book rides and track trips."}
                      {registerData.role === 'DRIVER' && "🚖 You'll accept rides and earn money."}
                    </p>
                  </div>
                )}

                {/* ✅ Show admin badge for admin email */}
                {isAdminEmail && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
                    <div className="text-3xl mb-2">🛡️</div>
                    <div className="font-semibold text-blue-400">Admin Account</div>
                    <div className="text-xs text-gray-400 mt-1">Full platform access</div>
                  </div>
                )}

                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : `Create Account ${isAdminEmail ? 'as Admin' : `as ${registerData.role}`} →`}
                </button>
              </form>
            </div>
          )}

          {/* ── Step: OTP ── */}
          {step === 'otp' && (
            <div className="animate-slide-up">
              <button
                onClick={() => dispatch(setStep(isNewUser ? 'register' : 'email'))}
                className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1"
              >
                ← Back
              </button>
              <h2 className="text-3xl font-display font-bold mb-2">Check your email</h2>
              <p className="text-gray-400 mb-1">We sent a 6-digit code to</p>
              <p className="text-white font-semibold mb-8">{email}</p>
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="flex gap-3 justify-between" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text" inputMode="numeric" maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="otp-input"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : 'Verify & Sign In →'}
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="w-full text-gray-400 hover:text-primary-400 text-sm transition-colors disabled:opacity-50"
                >
                  Didn't receive? Resend OTP
                </button>
              </form>
              <div className="mt-8 bg-dark-700 rounded-2xl p-4 border border-white/5">
                <p className="text-xs text-gray-400 text-center">
                  ⏱️ OTP expires in 10 minutes • 🔒 One-time use only
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
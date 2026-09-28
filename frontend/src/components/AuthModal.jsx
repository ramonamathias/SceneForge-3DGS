import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export default function AuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      let res;
      if (mode === 'signup') {
        res = await api.signup({
          name: name.trim(),
          email: email.trim(),
          password,
        });
      } else {
        res = await api.login({
          email: email.trim(),
          password,
        });
      }

      if (res && res.user) {
        onSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content auth-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="auth-header">
          <div className="auth-icon-badge">
            <Lock size={20} />
          </div>
          <h2 className="auth-title">
            {mode === 'signup' ? 'Create SceneForge Account' : 'Welcome Back'}
          </h2>
          <p className="auth-sub">
            {mode === 'signup'
              ? 'Register to save your 3D Gaussian Splats to your personal workspace.'
              : 'Sign in to access your reconstructed 3D scenes and upload new video.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError(null);
            }}
          >
            Log In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="auth-name">Full Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="auth-name"
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="auth-email"
                type="email"
                placeholder="name@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={mode === 'login'}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {mode === 'signup' && (
              <small className="form-hint">At least 6 characters</small>
            )}
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="auth-confirm">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="auth-confirm"
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-auth-submit"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-inline" />
            ) : (
              <>
                <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer-notice">
          <p>
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                >
                  Log In
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                >
                  Sign Up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

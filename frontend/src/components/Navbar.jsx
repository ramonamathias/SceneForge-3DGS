import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Layers,
  Sparkles,
  User as UserIcon,
  LogOut,
  FolderKanban,
  Menu,
  X,
  ChevronDown,
  Compass,
  FileText,
  Mail,
  PlusCircle,
} from 'lucide-react';

export default function Navbar({
  page,
  setPage,
  user,
  onOpenAuth,
  onLogout,
  onStartUpload,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const dropdownRef = useRef(null);

  // Dynamic light/dark theme tracking for scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 380) {
        setIsScrolledDown(true);
      } else {
        setIsScrolledDown(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (targetPage, sectionId = null) => {
    setMenuOpen(false);
    setProfileDropdownOpen(false);
    setPage(targetPage);
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const isLightNav = page === 'home' && !isScrolledDown;

  return (
    <header className={`navbar ${isLightNav ? 'navbar-light' : 'navbar-dark'}`}>
      <div className="navbar-container">
        {/* Brand */}
        <button
          type="button"
          className="navbar-brand"
          onClick={() => handleNavClick('home')}
        >
          <div className="brand-icon-wrapper">
            <Box className="brand-icon" size={22} />
            <span className="brand-dot" />
          </div>
          <div className="brand-text">
            <span className="brand-title">SceneForge</span>
            <span className="brand-badge">3DGS</span>
          </div>
        </button>

        {/* Desktop Nav Links */}
        <nav className="navbar-links">
          <button
            type="button"
            className={`nav-item ${page === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            Home
          </button>
          <button
            type="button"
            className="nav-item"
            onClick={() => handleNavClick('home', 'how-it-works')}
          >
            How It Works
          </button>
          <button
            type="button"
            className={`nav-item ${page === 'projects' ? 'active' : ''}`}
            onClick={() => handleNavClick('projects')}
          >
            Projects
          </button>
          <button
            type="button"
            className={`nav-item ${page === 'about' ? 'active' : ''}`}
            onClick={() => handleNavClick('about')}
          >
            About
          </button>
          <button
            type="button"
            className={`nav-item ${page === 'contact' ? 'active' : ''}`}
            onClick={() => handleNavClick('contact')}
          >
            Contact
          </button>
        </nav>

        {/* Right Actions */}
        <div className="navbar-actions">
          {user ? (
            <div className="auth-profile-group" ref={dropdownRef}>
              <button
                type="button"
                className="btn-create-cta"
                onClick={onStartUpload}
              >
                <PlusCircle size={16} />
                <span>Create 3D Scene</span>
              </button>

              <button
                type="button"
                className="profile-trigger"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                aria-expanded={profileDropdownOpen}
              >
                <div className="avatar-circle">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="user-short-name">{user.name.split(' ')[0]}</span>
                <ChevronDown size={14} className={`chevron ${profileDropdownOpen ? 'rotated' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div className="profile-dropdown-menu">
                  <div className="dropdown-user-header">
                    <strong className="user-full-name">{user.name}</strong>
                    <span className="user-email-text">{user.email}</span>
                  </div>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => handleNavClick('projects')}
                  >
                    <FolderKanban size={16} />
                    <span>My Projects</span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => handleNavClick('profile')}
                  >
                    <UserIcon size={16} />
                    <span>Account Profile</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item logout"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="unauth-actions">
              <button
                type="button"
                className="btn-link"
                onClick={() => onOpenAuth('login')}
              >
                Log In
              </button>
              <button
                type="button"
                className="btn-secondary-pill"
                onClick={() => onOpenAuth('signup')}
              >
                Sign Up
              </button>
              <button
                type="button"
                className="btn-primary-glow"
                onClick={onStartUpload}
              >
                <Sparkles size={15} />
                <span>Create 3D Scene</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-hamburger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="mobile-drawer">
          <nav className="mobile-nav-links">
            <button
              type="button"
              className={`mobile-link ${page === 'home' ? 'active' : ''}`}
              onClick={() => handleNavClick('home')}
            >
              Home
            </button>
            <button
              type="button"
              className="mobile-link"
              onClick={() => handleNavClick('home', 'how-it-works')}
            >
              How It Works
            </button>
            <button
              type="button"
              className={`mobile-link ${page === 'projects' ? 'active' : ''}`}
              onClick={() => handleNavClick('projects')}
            >
              Projects
            </button>
            <button
              type="button"
              className={`mobile-link ${page === 'about' ? 'active' : ''}`}
              onClick={() => handleNavClick('about')}
            >
              About
            </button>
            <button
              type="button"
              className={`mobile-link ${page === 'contact' ? 'active' : ''}`}
              onClick={() => handleNavClick('contact')}
            >
              Contact
            </button>
          </nav>

          <div className="mobile-drawer-footer">
            {user ? (
              <div className="mobile-user-box">
                <div className="mobile-user-details">
                  <div className="avatar-circle">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </div>
                </div>
                <div className="mobile-user-buttons">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleNavClick('profile')}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                  >
                    Log Out
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => {
                    setMenuOpen(false);
                    onStartUpload();
                  }}
                >
                  <PlusCircle size={16} />
                  <span>Create 3D Scene</span>
                </button>
              </div>
            ) : (
              <div className="mobile-auth-buttons">
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAuth('login');
                  }}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => {
                    setMenuOpen(false);
                    onStartUpload();
                  }}
                >
                  <Sparkles size={16} />
                  <span>Create 3D Scene</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

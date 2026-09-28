import React, { useEffect, useState } from 'react';
import {
  User as UserIcon,
  Mail,
  Calendar,
  Layers,
  Camera,
  Box,
  LogOut,
  FolderKanban,
  PlusCircle,
  ShieldCheck,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';

export default function ProfilePage({
  user,
  setPage,
  onLogout,
  onStartUpload,
}) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const res = await api.getProfile();
        if (mounted && res) {
          setProfileData(res);
        }
      } catch (err) {
        console.warn('Could not load profile stats:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = profileData?.stats || {
    total_reconstructions: 0,
    completed: 0,
    failed: 0,
    in_progress: 0,
    total_frames_extracted: 0,
    total_sparse_points: 0,
    total_registered_cameras: 0,
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="profile-page-root">
      <div className="profile-container">
        {/* Profile Header Card */}
        <div className="profile-header-card">
          <div className="profile-identity-row">
            <div className="profile-avatar-large">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <div className="profile-identity-info">
              <div className="badge-row">
                <span className="profile-role-badge">Researcher Account</span>
                <span className="verified-badge">
                  <ShieldCheck size={14} />
                  <span>Verified</span>
                </span>
              </div>
              <h1 className="profile-name">{user?.name}</h1>
              <div className="profile-meta-row">
                <span className="profile-meta-item">
                  <Mail size={15} />
                  <span>{user?.email}</span>
                </span>
                <span className="profile-meta-item">
                  <Calendar size={15} />
                  <span>Joined {formatDate(user?.created_at)}</span>
                </span>
              </div>
            </div>

            <div className="profile-header-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onLogout}
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real Computed Statistics */}
        <div className="profile-stats-section">
          <h3 className="section-block-title">Your Reconstruction Telemetry</h3>
          <div className="profile-stats-grid">
            <div className="profile-stat-box">
              <span className="stat-label">Total Reconstructions</span>
              <strong className="stat-number">{stats.total_reconstructions}</strong>
              <small className="stat-caption">Video jobs submitted</small>
            </div>

            <div className="profile-stat-box">
              <span className="stat-label">Completed 3D Scenes</span>
              <strong className="stat-number text-emerald">{stats.completed}</strong>
              <small className="stat-caption">Gaussian Splats ready</small>
            </div>

            <div className="profile-stat-box">
              <span className="stat-label">Frames Processed</span>
              <strong className="stat-number text-cyan">
                {stats.total_frames_extracted.toLocaleString()}
              </strong>
              <small className="stat-caption">Sampled OpenCV frames</small>
            </div>

            <div className="profile-stat-box">
              <span className="stat-label">Sparse 3D Points</span>
              <strong className="stat-number text-sky">
                {stats.total_sparse_points.toLocaleString()}
              </strong>
              <small className="stat-caption">COLMAP geometric seeds</small>
            </div>
          </div>
        </div>

        {/* Quick Shortcuts */}
        <div className="profile-actions-grid">
          <div className="profile-action-card">
            <FolderKanban size={24} className="text-cyan" />
            <h4>Browse Your Models</h4>
            <p>View, inspect in SIBR, and download all your completed 3D Gaussian models.</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage('projects')}
            >
              Go to Projects Dashboard
            </button>
          </div>

          <div className="profile-action-card">
            <Sparkles size={24} className="text-emerald" />
            <h4>Start New Reconstruction</h4>
            <p>Upload a new smartphone video to begin COLMAP feature matching and 3DGS training.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={onStartUpload}
            >
              Upload Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

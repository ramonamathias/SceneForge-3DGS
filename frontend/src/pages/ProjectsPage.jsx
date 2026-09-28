import React, { useEffect, useState } from 'react';
import {
  FolderKanban,
  Box,
  Eye,
  Download,
  Trash2,
  AlertCircle,
  PlusCircle,
  Calendar,
  Layers,
  Camera,
  CheckCircle2,
  Clock,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { api } from '../api';

export default function ProjectsPage({
  user,
  onOpenAuth,
  onStartUpload,
  onSelectProject,
}) {
  const [userProjects, setUserProjects] = useState([]);
  const [legacyProjects, setLegacyProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [openingId, setOpeningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProjects();
      setUserProjects(res.user_projects || (user ? res.projects : []));
      setLegacyProjects(res.legacy_projects || []);
    } catch (err) {
      setError(err.message || 'Could not retrieve project history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleOpenViewer = async (project) => {
    if (openingId) return;
    setOpeningId(project.id);
    try {
      await api.viewProject(project.id);
      alert(`SIBR 3D Viewer launched on host workstation for "${project.name}".`);
    } catch (err) {
      alert(err.message || 'Could not launch SIBR viewer.');
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`Are you sure you want to delete project "${project.name}"? This removes stored intermediate files.`)) {
      return;
    }
    setDeletingId(project.id);
    try {
      await api.deleteProject(project.id);
      setUserProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      alert(err.message || 'Failed to delete project.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter logic
  let activeList = userProjects;
  if (filter === 'completed') {
    activeList = userProjects.filter((p) => p.status === 'COMPLETE');
  } else if (filter === 'processing') {
    activeList = userProjects.filter((p) => p.status !== 'COMPLETE' && p.status !== 'FAILED');
  } else if (filter === 'failed') {
    activeList = userProjects.filter((p) => p.status === 'FAILED');
  } else if (filter === 'reference') {
    activeList = legacyProjects;
  }

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="projects-page-root">
      <div className="projects-container">
        {/* Header */}
        <div className="projects-header-row">
          <div>
            <span className="section-pill">WORKSPACE</span>
            <h1 className="projects-title">Reconstruction Projects</h1>
            <p className="projects-sub">
              Manage your personal 3D Gaussian Splatting models, inspect camera geometries, and export results.
            </p>
          </div>

          <div className="projects-top-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={fetchProjects}
              disabled={loading}
              title="Refresh project list"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={onStartUpload}
            >
              <PlusCircle size={16} />
              <span>New Reconstruction</span>
            </button>
          </div>
        </div>

        {/* Unauthenticated notice */}
        {!user && (
          <div className="auth-alert-card mb-6">
            <Lock className="auth-alert-icon" size={20} />
            <div className="auth-alert-content">
              <strong>Viewing in Guest Mode</strong>
              <p>
                Sign in to create, organize, and view your private reconstructed scenes.
                Verified reference scenes are displayed below.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => onOpenAuth('login')}
            >
              Sign In
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="projects-tabs-bar">
          <button
            type="button"
            className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            My Projects ({userProjects.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({userProjects.filter((p) => p.status === 'COMPLETE').length})
          </button>
          <button
            type="button"
            className={`tab-btn ${filter === 'processing' ? 'active' : ''}`}
            onClick={() => setFilter('processing')}
          >
            In Progress ({userProjects.filter((p) => p.status !== 'COMPLETE' && p.status !== 'FAILED').length})
          </button>
          <button
            type="button"
            className={`tab-btn ${filter === 'failed' ? 'active' : ''}`}
            onClick={() => setFilter('failed')}
          >
            Failed ({userProjects.filter((p) => p.status === 'FAILED').length})
          </button>
          <button
            type="button"
            className={`tab-btn ${filter === 'reference' ? 'active' : ''}`}
            onClick={() => setFilter('reference')}
          >
            Reference Scenes ({legacyProjects.length})
          </button>
        </div>

        {/* Project Cards List */}
        {loading ? (
          <div className="projects-loading-state">
            <span className="spinner-inline" />
            <span>Loading projects from database...</span>
          </div>
        ) : activeList.length === 0 ? (
          <div className="projects-empty-state">
            <div className="empty-icon-wrap">
              <FolderKanban size={36} />
            </div>
            <h3>No projects found in this view</h3>
            <p>
              {filter === 'reference'
                ? 'No reference scenes currently loaded.'
                : 'Upload your first smartphone video to generate an interactive 3D scene.'}
            </p>
            {filter !== 'reference' && (
              <button
                type="button"
                className="btn-primary"
                onClick={onStartUpload}
              >
                <PlusCircle size={16} />
                <span>Create 3D Scene</span>
              </button>
            )}
          </div>
        ) : (
          <div className="projects-cards-grid">
            {activeList.map((project) => (
              <div className="project-dashboard-card" key={project.id}>
                <div className="card-header-bar">
                  <div className="badge-row">
                    <span className={`status-pill ${project.status.toLowerCase()}`}>
                      {project.status === 'COMPLETE' ? 'Complete' : project.status}
                    </span>
                    {project.is_legacy && (
                      <span className="reference-pill">Reference</span>
                    )}
                  </div>
                  <span className="project-date">
                    <Calendar size={13} />
                    <span>{formatDate(project.created_at)}</span>
                  </span>
                </div>

                <div className="card-info-section">
                  <h3 className="project-card-title">{project.name}</h3>
                  {project.video_filename && (
                    <small className="project-filename">Source: {project.video_filename}</small>
                  )}

                  <div className="project-stats-cells">
                    <div className="stat-cell">
                      <span className="stat-key">Cameras</span>
                      <strong className="stat-num">{project.registered_images || '—'}</strong>
                    </div>

                    <div className="stat-cell">
                      <span className="stat-key">Points</span>
                      <strong className="stat-num">
                        {project.sparse_points ? project.sparse_points.toLocaleString() : '—'}
                      </strong>
                    </div>

                    <div className="stat-cell">
                      <span className="stat-key">Iterations</span>
                      <strong className="stat-num">{project.iteration ? project.iteration.toLocaleString() : '30k'}</strong>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="card-actions-bar">
                  {project.status === 'COMPLETE' ? (
                    <>
                      <button
                        type="button"
                        className="btn-card-action primary"
                        onClick={() => handleOpenViewer(project)}
                        disabled={openingId === project.id}
                        title="Launch real SIBR 3D viewer on workstation"
                      >
                        <Eye size={15} />
                        <span>{openingId === project.id ? 'Opening...' : 'View Scene'}</span>
                      </button>

                      <a
                        href={api.getDownloadUrl(project.id, 'ply')}
                        download
                        className="btn-card-action secondary"
                        title="Download point_cloud.ply"
                      >
                        <Download size={15} />
                        <span>PLY</span>
                      </a>
                    </>
                  ) : project.status === 'FAILED' ? (
                    <div className="failed-notice">
                      <AlertCircle size={15} />
                      <span>Reconstruction stopped</span>
                    </div>
                  ) : (
                    <div className="processing-notice">
                      <Clock size={15} />
                      <span>Processing on GPU...</span>
                    </div>
                  )}

                  {/* Delete button (only for owned user projects) */}
                  {!project.is_legacy && user && (
                    <button
                      type="button"
                      className="btn-delete-icon"
                      onClick={() => handleDelete(project)}
                      disabled={deletingId === project.id}
                      title="Delete project"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

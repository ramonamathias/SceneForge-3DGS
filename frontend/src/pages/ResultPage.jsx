import React, { useState } from 'react';
import {
  CheckCircle2,
  Box,
  Eye,
  Download,
  FileText,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Layers,
  Camera,
  FolderKanban,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api';

export default function ResultPage({
  job,
  setPage,
  onReset,
}) {
  const [openingViewer, setOpeningViewer] = useState(false);

  const handleLaunchSIBR = async () => {
    if (!job?.id) return;
    setOpeningViewer(true);
    try {
      await api.viewJob(job.id);
      alert('SIBR 3D Viewer launched successfully on host system. Check your taskbar.');
    } catch (err) {
      alert(err.message || 'Could not launch SIBR viewer. Ensure SIBR is configured in settings.json.');
    } finally {
      setOpeningViewer(false);
    }
  };

  const details = job?.details || {};
  const frames = details.frames || '—';
  const cameras = details.registered_images || '—';
  const points = details.sparse_points ? details.sparse_points.toLocaleString() : '—';
  const iterations = details.iteration ? details.iteration.toLocaleString() : '30,000';

  return (
    <div className="result-page-root">
      <div className="result-container">
        {/* Banner */}
        <div className="result-hero-card">
          <div className="result-badge-row">
            <span className="success-pill">
              <CheckCircle2 size={16} />
              <span>RECONSTRUCTION COMPLETE</span>
            </span>
            <span className="job-id-text">Job ID: {job?.id}</span>
          </div>

          <h1 className="result-title">Your 3D Gaussian Splat is Ready</h1>
          <p className="result-subtitle">
            The monocular video was decomposed, camera poses were resolved via COLMAP,
            and the 3D Gaussian radiance field converged to high geometric fidelity.
          </p>

          <div className="result-primary-actions">
            <button
              type="button"
              className="btn-primary-large"
              onClick={handleLaunchSIBR}
              disabled={openingViewer}
            >
              <Eye size={18} />
              <span>{openingViewer ? 'Launching SIBR...' : 'View 3D Scene in SIBR'}</span>
            </button>

            <a
              href={api.getDownloadUrl(job?.id, 'ply')}
              download
              className="btn-secondary-large"
            >
              <Download size={18} />
              <span>Download .PLY File</span>
            </a>
          </div>

          <div className="viewer-disclaimer">
            <span>ℹ️ <strong>Workstation Viewer:</strong> SceneForge launches the native Inria SIBR GPU application configured on this workstation for full 60+ FPS hardware rasterization.</span>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="result-stats-section">
          <h3 className="stats-heading">Reconstruction Geometry Telemetry</h3>
          <div className="stats-metric-cards-grid">
            <div className="stats-metric-card">
              <span className="card-key">Extracted Frames</span>
              <strong className="card-val">{frames}</strong>
              <small className="card-caption">Sampled at 5 FPS</small>
            </div>

            <div className="stats-metric-card">
              <span className="card-key">Registered Cameras</span>
              <strong className="card-val">{cameras}</strong>
              <small className="card-caption">COLMAP 6-DoF poses</small>
            </div>

            <div className="stats-metric-card">
              <span className="card-key">Sparse 3D Points</span>
              <strong className="card-val">{points}</strong>
              <small className="card-caption">SfM seed geometry</small>
            </div>

            <div className="stats-metric-card">
              <span className="card-key">Training Iterations</span>
              <strong className="card-val">{iterations}</strong>
              <small className="card-caption">CUDA gradient descent</small>
            </div>
          </div>
        </div>

        {/* Next Steps & Project Shortcuts */}
        <div className="result-footer-navigation">
          <div className="footer-nav-card">
            <h4>Export & Metadata</h4>
            <p>Download structured report with complete COLMAP and 3DGS parameters.</p>
            <div className="footer-nav-buttons">
              <a
                href={api.getDownloadUrl(job?.id, 'metadata')}
                download
                className="btn-secondary"
              >
                <FileText size={16} />
                <span>Export Metadata JSON</span>
              </a>

              <a
                href={api.getDownloadUrl(job?.id, 'sparse')}
                download
                className="btn-secondary"
              >
                <FileText size={16} />
                <span>Download COLMAP Log</span>
              </a>
            </div>
          </div>

          <div className="footer-nav-card">
            <h4>Workspace Navigation</h4>
            <p>Return to your dashboard or initiate another video reconstruction.</p>
            <div className="footer-nav-buttons">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPage('projects')}
              >
                <FolderKanban size={16} />
                <span>My Projects Dashboard</span>
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={onReset}
              >
                <Sparkles size={16} />
                <span>Reconstruct Another Video</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

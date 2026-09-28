import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  Layers,
  Camera,
  Eye,
  ArrowRight,
  RotateCcw,
  Terminal,
  Box,
  FileCheck,
  Check,
} from 'lucide-react';
import { api } from '../api';

const PIPELINE_STAGES = [
  { key: 'UPLOADED', label: 'Video Uploaded', description: 'Uploaded video saved and validated' },
  { key: 'EXTRACTING_FRAMES', label: 'Extracting Frames', description: 'OpenCV smart sampling at 5 FPS' },
  { key: 'FRAMES_EXTRACTED', label: 'Frames Extracted', description: 'Keyframe sequence ready for feature matching' },
  { key: 'COLMAP_RUNNING', label: 'COLMAP Camera Reconstruction', description: 'SIFT feature extraction & sequential matching' },
  { key: 'COLMAP_COMPLETE', label: 'Camera Reconstruction Complete', description: 'Camera intrinsics & sparse geometry estimated' },
  { key: 'PREPARING_DATASET', label: 'Preparing 3DGS Dataset', description: 'Synthesizing dataset sparse structure' },
  { key: 'DATASET_READY', label: '3DGS Dataset Ready', description: 'Gaussian Splatting dataset prepared' },
  { key: 'GAUSSIAN_TRAINING', label: 'Gaussian Splatting Training', description: 'Optimizing 3D ellipsoids on RTX GPU' },
  { key: 'GAUSSIAN_COMPLETE', label: '3D Model Generated', description: 'Point cloud PLY exported successfully' },
  { key: 'PREPARING_VIEWER', label: 'Preparing SIBR Viewer', description: 'Configuring host real-time 3D viewer' },
  { key: 'COMPLETE', label: 'Reconstruction Complete', description: '3D scene ready for interactive exploration' },
];

export default function ProgressPage({
  jobId,
  projectId,
  videoFilename,
  onComplete,
  onReset,
}) {
  const [job, setJob] = useState({
    id: jobId,
    status: 'QUEUED',
    message: 'Connecting to reconstruction engine...',
    progress: 0,
    details: {},
    error: null,
  });
  const [launchingViewer, setLaunchingViewer] = useState(false);
  const [logMessages, setLogMessages] = useState([]);

  useEffect(() => {
    if (!jobId) return;

    let eventSource;
    try {
      eventSource = new EventSource(api.getJobEventsUrl(jobId));

      eventSource.onmessage = (event) => {
        try {
          const currentJob = JSON.parse(event.data);
          setJob(currentJob);

          if (currentJob.message) {
            setLogMessages((prev) => {
              if (prev.length === 0 || prev[prev.length - 1] !== currentJob.message) {
                return [...prev.slice(-15), currentJob.message];
              }
              return prev;
            });
          }

          if (currentJob.status === 'COMPLETE' || currentJob.status === 'FAILED') {
            eventSource.close();
          }
        } catch (e) {
          console.error('SSE JSON parse error:', e);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('SSE connection closed or interrupted:', err);
        eventSource.close();
      };
    } catch (err) {
      console.error('Could not connect to SSE events:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [jobId]);

  const getStageStatus = (stageKey) => {
    const stageKeys = PIPELINE_STAGES.map((s) => s.key);
    const currentIndex = stageKeys.indexOf(job.status);
    const targetIndex = stageKeys.indexOf(stageKey);

    if (job.status === 'COMPLETE') return 'completed';
    if (job.status === 'FAILED') {
      if (stageKey === job.status) return 'failed';
      return targetIndex < currentIndex ? 'completed' : 'pending';
    }
    if (stageKey === job.status) return 'active';
    return targetIndex < currentIndex ? 'completed' : 'pending';
  };

  const handleLaunchSIBR = async () => {
    setLaunchingViewer(true);
    try {
      await api.viewJob(job.id);
      alert('SIBR Viewer has been launched on host system. Check your desktop/taskbar for the window.');
    } catch (err) {
      alert(err.message || 'Could not launch SIBR viewer.');
    } finally {
      setLaunchingViewer(false);
    }
  };

  return (
    <div className="progress-page-root">
      <div className="progress-container">
        {/* Progress Header */}
        <div className="progress-header-row">
          <div>
            <div className="job-id-pill">
              <span>JOB ID:</span>
              <code>{job.id}</code>
            </div>
            <h1 className="progress-main-title">
              {job.status === 'COMPLETE'
                ? '3D Scene Reconstructed Successfully'
                : job.status === 'FAILED'
                ? 'Reconstruction Stopped'
                : 'Reconstructing 3D Scene'}
            </h1>
            <p className="progress-sub">
              {job.message || 'Processing video frames and calculating camera geometry...'}
            </p>
          </div>

          <div className="progress-percentage-display">
            <span className="pct-num">{Math.round(job.progress)}%</span>
            <span className="pct-label">Pipeline Progress</span>
          </div>
        </div>

        {/* Real Progress Bar */}
        <div className="progress-track-wrapper">
          <div
            className={`progress-bar-fill ${job.status === 'FAILED' ? 'failed' : ''}`}
            style={{ width: `${Math.max(3, job.progress)}%` }}
          />
        </div>

        {/* Live Metrics Grid */}
        <div className="telemetry-metrics-grid">
          <div className="telemetry-card">
            <span className="telemetry-label">Frames Extracted</span>
            <strong className="telemetry-val">
              {job.details?.frames || (job.progress >= 22 ? '✓ Sampled' : 'Pending')}
            </strong>
          </div>

          <div className="telemetry-card">
            <span className="telemetry-label">Registered Cameras</span>
            <strong className="telemetry-val">
              {job.details?.registered_images ? `${job.details.registered_images}` : 'Computing...'}
            </strong>
          </div>

          <div className="telemetry-card">
            <span className="telemetry-label">Sparse 3D Points</span>
            <strong className="telemetry-val">
              {job.details?.sparse_points ? job.details.sparse_points.toLocaleString() : 'Computing...'}
            </strong>
          </div>

          <div className="telemetry-card">
            <span className="telemetry-label">Training Iterations</span>
            <strong className="telemetry-val">
              {job.details?.iteration ? `${job.details.iteration.toLocaleString()}` : '30,000 baseline'}
            </strong>
          </div>
        </div>

        {/* Main Section: Pipeline Stages List */}
        <div className="progress-content-grid">
          <div className="stages-timeline-card">
            <h3 className="card-section-title">Reconstruction Stages</h3>
            <div className="stages-timeline-list">
              {PIPELINE_STAGES.map((stage, idx) => {
                const status = getStageStatus(stage.key);

                return (
                  <div className={`stage-step-item ${status}`} key={stage.key}>
                    <div className="step-marker">
                      {status === 'completed' ? (
                        <Check size={14} className="marker-icon completed" />
                      ) : status === 'active' ? (
                        <span className="marker-pulse" />
                      ) : status === 'failed' ? (
                        <AlertCircle size={14} className="marker-icon failed" />
                      ) : (
                        <span className="marker-dot" />
                      )}
                    </div>

                    <div className="step-content">
                      <div className="step-content-head">
                        <strong className="step-name">{stage.label}</strong>
                        {status === 'active' && (
                          <span className="status-chip active">IN PROGRESS</span>
                        )}
                        {status === 'completed' && (
                          <span className="status-chip completed">DONE</span>
                        )}
                      </div>
                      <p className="step-description">{stage.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: GPU Status & Logs */}
          <div className="progress-side-panel">
            {job.status === 'GAUSSIAN_TRAINING' && (
              <div className="gpu-active-card">
                <div className="gpu-card-head">
                  <Cpu size={22} className="text-emerald" />
                  <div>
                    <strong>CUDA 3DGS Training Active</strong>
                    <small>NVIDIA RTX Hardware Acceleration</small>
                  </div>
                </div>
                <p className="gpu-card-text">
                  The model is currently optimizing 3D Gaussian position, covariance, opacity,
                  and spherical harmonic coefficients. SIBR will be prepared once training reaches iteration target.
                </p>
              </div>
            )}

            {/* Error Card */}
            {job.status === 'FAILED' && (
              <div className="pipeline-error-card">
                <div className="error-card-head">
                  <AlertCircle size={22} className="text-red" />
                  <div>
                    <strong>Reconstruction Error</strong>
                    <small>Real Technical Exception</small>
                  </div>
                </div>
                <div className="error-message-body">
                  <code>{job.error || job.message}</code>
                </div>
                <p className="error-troubleshoot-hint">
                  Troubleshooting tip: COLMAP requires sufficient visual overlap and stationary illumination.
                  Ensure your video moves steadily without fast motions or motion blur.
                </p>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={onReset}
                >
                  <RotateCcw size={16} />
                  <span>Try Another Video</span>
                </button>
              </div>
            )}

            {/* Success Card */}
            {job.status === 'COMPLETE' && (
              <div className="pipeline-success-card">
                <div className="success-card-head">
                  <CheckCircle2 size={24} className="text-emerald" />
                  <div>
                    <strong>3D Scene Ready</strong>
                    <small>Model generated successfully</small>
                  </div>
                </div>
                <p className="success-card-text">
                  Your 3D Gaussian Splat model has been created and saved to your project repository.
                </p>
                <div className="success-action-buttons">
                  <button
                    type="button"
                    className="btn-primary w-full"
                    onClick={handleLaunchSIBR}
                    disabled={launchingViewer}
                  >
                    <Eye size={16} />
                    <span>{launchingViewer ? 'Launching...' : 'Open SIBR 3D Viewer'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary w-full"
                    onClick={() => onComplete(job)}
                  >
                    <span>View Project Summary</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Live Terminal / Execution Log */}
            <div className="live-log-card">
              <div className="live-log-head">
                <Terminal size={16} className="text-cyan" />
                <span>Backend Event Feed</span>
              </div>
              <div className="live-log-console">
                {logMessages.map((msg, i) => (
                  <div className="log-line" key={i}>
                    <span className="log-prefix">&gt;</span>
                    <span className="log-text">{msg}</span>
                  </div>
                ))}
                {logMessages.length === 0 && (
                  <div className="log-line text-muted">Awaiting pipeline messages...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

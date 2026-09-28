import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Film,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Cpu,
  Lock,
  Layers,
  Camera,
  Sliders,
} from 'lucide-react';
import { api } from '../api';

export default function UploadPage({
  user,
  onOpenAuth,
  onReconstructionStarted,
}) {
  const [file, setFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoMeta, setVideoMeta] = useState({ duration: 0, width: 0, height: 0 });
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileSelection = (selectedFile) => {
    setError(null);
    if (!selectedFile) return;

    const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError(`Invalid file format '${ext}'. Please upload an MP4, MOV, AVI, MKV, or WebM video.`);
      return;
    }

    const maxBytes = 1024 * 1024 * 1024; // 1GB
    if (selectedFile.size > maxBytes) {
      setError('File exceeds the 1024 MB maximum upload limit.');
      return;
    }

    setFile(selectedFile);

    // Create preview and inspect duration/dimensions
    const url = URL.createObjectURL(selectedFile);
    setVideoPreview(url);

    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      setVideoMeta({
        duration: tempVideo.duration || 0,
        width: tempVideo.videoWidth || 0,
        height: tempVideo.videoHeight || 0,
      });
    };
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setFile(null);
    setVideoPreview(null);
    setVideoMeta({ duration: 0, width: 0, height: 0 });
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartReconstruction = async () => {
    if (!file || uploading) return;

    if (!user) {
      onOpenAuth('login');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const data = await api.reconstruct(file);
      onReconstructionStarted({
        jobId: data.job_id,
        projectId: data.project_id || data.job_id,
        filename: file.name,
      });
    } catch (err) {
      setError(err.message || 'Failed to upload video to reconstruction engine.');
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb < 1024 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Estimate extracted frames (target_fps = 5, capped at 180)
  const estimatedFrames = videoMeta.duration
    ? Math.min(180, Math.max(20, Math.round(videoMeta.duration * 5)))
    : null;

  return (
    <div className="upload-page-root">
      <div className="upload-container">
        {/* Page Header */}
        <div className="upload-header text-center">
          <span className="section-pill">CREATE 3D SCENE</span>
          <h1 className="upload-title">Video Reconstruction Pipeline</h1>
          <p className="upload-subtitle">
            Upload your continuous smartphone video capture. SceneForge will extract frames,
            reconstruct camera poses via COLMAP, and train a 3D Gaussian Splat model.
          </p>
        </div>

        {/* Auth Required Notice if not logged in */}
        {!user && (
          <div className="auth-alert-card">
            <Lock className="auth-alert-icon" size={20} />
            <div className="auth-alert-content">
              <strong>Account Authentication Required</strong>
              <p>
                To preserve project ownership and save your 3D scenes to your personal dashboard,
                please sign in before starting a reconstruction.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => onOpenAuth('login')}
            >
              Sign In to Continue
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="upload-error-box">
            <AlertCircle size={20} className="shrink-0" />
            <div>
              <strong>Reconstruction Upload Error</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={() => setError(null)} className="error-close-btn">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="upload-grid">
          {/* Left Column: Dropzone & File Details */}
          <div className="upload-main-card">
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.avi,.mkv,.webm,video/*"
              className="hidden-file-input"
              onChange={(e) => handleFileSelection(e.target.files?.[0])}
            />

            {!file ? (
              <div
                className={`dropzone-box ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="dropzone-icon-circle">
                  <UploadCloud size={36} className="dropzone-icon" />
                </div>
                <h3 className="dropzone-title">Choose a video or drag & drop</h3>
                <p className="dropzone-desc">
                  Accepted formats: MP4, MOV, AVI, MKV, or WebM (up to 1,024 MB)
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Film size={16} />
                  <span>Browse Video File</span>
                </button>
                <div className="dropzone-hint">
                  <span>💡 Tip: Continuous orbital 360° motion around an object yields the highest visual quality.</span>
                </div>
              </div>
            ) : (
              <div className="selected-file-view">
                <div className="selected-file-header">
                  <div className="file-title-wrap">
                    <FileVideo size={22} className="text-cyan" />
                    <div>
                      <h4 className="file-name">{file.name}</h4>
                      <div className="file-tags">
                        <span className="file-tag">{formatFileSize(file.size)}</span>
                        {videoMeta.duration > 0 && (
                          <span className="file-tag">{formatDuration(videoMeta.duration)}</span>
                        )}
                        {videoMeta.width > 0 && (
                          <span className="file-tag">{videoMeta.width} × {videoMeta.height} px</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-remove-file"
                    onClick={handleRemoveFile}
                    title="Remove and choose another video"
                  >
                    <X size={18} />
                    <span>Change Video</span>
                  </button>
                </div>

                {/* Video Playback Preview */}
                {videoPreview && (
                  <div className="video-player-wrapper">
                    <video
                      src={videoPreview}
                      controls
                      playsInline
                      className="preview-video-player"
                    />
                  </div>
                )}

                {/* Launch Action */}
                <div className="upload-action-row">
                  <button
                    type="button"
                    className="btn-primary-large w-full"
                    disabled={uploading}
                    onClick={handleStartReconstruction}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner-inline" />
                        <span>Uploading Video to Pipeline...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Start Reconstruction</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pipeline Configuration & Telemetry */}
          <div className="upload-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-card-header">
                <Sliders size={18} className="text-cyan" />
                <h4>Pipeline Profile</h4>
              </div>

              <div className="spec-rows-list">
                <div className="spec-row">
                  <span className="spec-name">Target Sampling Rate</span>
                  <strong className="spec-val">5 FPS</strong>
                </div>

                <div className="spec-row">
                  <span className="spec-name">Estimated Keyframes</span>
                  <strong className="spec-val">
                    {estimatedFrames ? `~${estimatedFrames} frames` : 'Calculated on upload'}
                  </strong>
                </div>

                <div className="spec-row">
                  <span className="spec-name">Resolution Limit</span>
                  <strong className="spec-val">1,600 px (Downsampled)</strong>
                </div>

                <div className="spec-row">
                  <span className="spec-name">Camera Calibration Model</span>
                  <strong className="spec-val">OPENCV (Single Camera)</strong>
                </div>

                <div className="spec-row">
                  <span className="spec-name">Feature Detection</span>
                  <strong className="spec-val">CPU SIFT Sequential Matching</strong>
                </div>

                <div className="spec-row">
                  <span className="spec-name">Gaussian Splat Training</span>
                  <strong className="spec-val">30,000 Iterations</strong>
                </div>

                <div className="spec-row">
                  <span className="spec-name">Hardware Acceleration</span>
                  <strong className="spec-val text-emerald">NVIDIA RTX CUDA</strong>
                </div>
              </div>
            </div>

            <div className="sidebar-card safety-card">
              <div className="sidebar-card-header">
                <ShieldAlert size={18} className="text-amber" />
                <h4>Laptop & GPU Protection</h4>
              </div>
              <ul className="safety-notes-list">
                <li>Strict limit of <strong>1 active reconstruction job</strong> at a time.</li>
                <li>COLMAP validates minimum <strong>20 registered cameras</strong> and <strong>1,000 sparse points</strong> before training starts.</li>
                <li>Temporary intermediate caches are verified and preserved for debugging.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

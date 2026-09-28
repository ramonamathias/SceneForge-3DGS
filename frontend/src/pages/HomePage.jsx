import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Video,
  Camera,
  Layers,
  Box,
  Eye,
  Download,
  Cpu,
  CheckCircle2,
  Clock,
  Compass,
  Zap,
  ChevronRight,
  Database,
  ExternalLink,
} from 'lucide-react';
import HeroCanvas from '../components/HeroCanvas';
import { api } from '../api';

export default function HomePage({
  setPage,
  onStartUpload,
  onSelectProject,
}) {
  const [showcaseProjects, setShowcaseProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [openingProject, setOpeningProject] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchShowcase() {
      try {
        const res = await api.getShowcaseProjects();
        if (mounted && res && res.projects) {
          setShowcaseProjects(res.projects);
        }
      } catch (err) {
        console.warn('Could not load showcase projects:', err);
      } finally {
        if (mounted) setLoadingProjects(false);
      }
    }
    fetchShowcase();
    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenViewer = async (project) => {
    if (openingProject) return;
    setOpeningProject(project.id);
    try {
      await api.viewProject(project.id);
      alert(`SIBR 3D Viewer launched on host for "${project.name}". Check your taskbar for the window.`);
    } catch (err) {
      alert(err.message || 'Could not launch SIBR viewer.');
    } finally {
      setOpeningProject(null);
    }
  };

  return (
    <div className="homepage-root">
      {/* ======================================================== */}
      {/* 1. HERO SECTION (White Background, Black & Grey Text)    */}
      {/* ======================================================== */}
      <div className="hero-section-wrapper">
        <section className="hero-section">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="eyebrow-pill">
                <span className="eyebrow-dot" />
                <span>3D GAUSSIAN SPLATTING</span>
              </div>

              <h1 className="hero-headline">
                Turn smartphone video into an{' '}
                <span className="headline-gradient">interactive 3D scene.</span>
              </h1>

              <p className="hero-subtext">
                SceneForge transforms a captured video into a 3D Gaussian Splat
                using camera reconstruction, COLMAP and Gaussian Splatting. Upload
                your scene and explore the reconstructed result.
              </p>

              <div className="hero-cta-group">
                <button
                  type="button"
                  className="btn-primary-large"
                  onClick={onStartUpload}
                >
                  <Sparkles size={18} />
                  <span>Create 3D Scene</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  type="button"
                  className="btn-secondary-large"
                  onClick={() => {
                    const el = document.getElementById('showcase-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    else setPage('projects');
                  }}
                >
                  <Compass size={18} />
                  <span>Explore Projects</span>
                </button>
              </div>

              {/* Live Pipeline Telemetry Badges */}
              <div className="hero-tech-badges">
                <div className="tech-badge-item">
                  <span className="tech-badge-key">Structure-from-Motion:</span>
                  <span className="tech-badge-val">COLMAP SIFT</span>
                </div>
                <div className="tech-badge-divider">•</div>
                <div className="tech-badge-item">
                  <span className="tech-badge-key">Representation:</span>
                  <span className="tech-badge-val">3D Gaussians</span>
                </div>
                <div className="tech-badge-divider">•</div>
                <div className="tech-badge-item">
                  <span className="tech-badge-key">Viewer:</span>
                  <span className="tech-badge-val">Inria SIBR</span>
                </div>
              </div>
            </div>

            {/* Interactive 3D Splat Canvas */}
            <div className="hero-visual-wrapper">
              <HeroCanvas />
            </div>
          </div>
        </section>
      </div>

      {/* ======================================================== */}
      {/* AESTHETIC TRANSITION: WHITE HERO TO DEEP BLACK NOIR      */}
      {/* ======================================================== */}
      <div className="hero-to-dark-transition">
        <div className="transition-seam-line" />
      </div>

      {/* ======================================================== */}
      {/* 2. DOWNSTREAM SECTIONS (Black Background, White Text)     */}
      {/* ======================================================== */}
      <div className="homepage-dark-sections">
        {/* ======================================================== */}
        {/* 2. WHAT IS SCENEFORGE?                                   */}
        {/* ======================================================== */}
        <section className="section-container" id="what-is-sceneforge">
        <div className="section-head text-center">
          <span className="section-pill">RESEARCH & CAPABILITIES</span>
          <h2 className="section-title">
            Monocular Video to Dense Radiance Fields
          </h2>
          <p className="section-subtitle">
            Traditional photogrammetry requires complex multi-camera arrays or costly LiDAR sensors.
            SceneForge bridges this gap by turning casual mobile video orbits into millimeter-accurate 3D Gaussian Splats.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper cyan">
              <Video size={24} />
            </div>
            <h3 className="feature-title">Uncalibrated Monocular Video</h3>
            <p className="feature-desc">
              Record a 360-degree orbit around any object, room, or sculpture. SceneForge automatically
              samples keyframes, resolves camera intrinsics, and handles variable mobile phone focal lengths.
            </p>
            <div className="feature-footer-tag">
              <span>Automatic OpenCV Frame Sampling</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper emerald">
              <Camera size={24} />
            </div>
            <h3 className="feature-title">COLMAP Camera Reconstruction</h3>
            <p className="feature-desc">
              Robust SIFT feature detection and sequential temporal matching recover exact 6-DoF camera poses
              and initialize a high-confidence sparse point cloud without requiring external tracking hardware.
            </p>
            <div className="feature-footer-tag">
              <span>Bundle Adjustment & Pose Estimation</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper purple">
              <Layers size={24} />
            </div>
            <h3 className="feature-title">3D Gaussian Optimization</h3>
            <p className="feature-desc">
              Optimizes continuous 3D ellipsoidal Gaussians with anisotropic covariance and spherical harmonic
              color coefficients, delivering photorealistic view-dependent lighting effects and reflections.
            </p>
            <div className="feature-footer-tag">
              <span>30,000 Iteration Convergence</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper sky">
              <Cpu size={24} />
            </div>
            <h3 className="feature-title">Hardware-Accelerated Rasterizer</h3>
            <p className="feature-desc">
              Unlike Neural Radiance Fields (NeRF) that require expensive volumetric raymarching, 3DGS utilizes
              tile-based CUDA sorting to achieve real-time 60+ FPS navigation inside the SIBR viewer.
            </p>
            <div className="feature-footer-tag">
              <span>RTX CUDA Acceleration</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. HOW IT WORKS (PIPELINE)                                */}
      {/* ======================================================== */}
      <section className="section-container bg-subtle" id="how-it-works">
        <div className="section-head text-center">
          <span className="section-pill">END-TO-END PIPELINE</span>
          <h2 className="section-title">How SceneForge Reconstructs 3D Scenes</h2>
          <p className="section-subtitle">
            An automated computer-vision workflow that processes your smartphone video from raw pixels to an explorable 3D model.
          </p>
        </div>

        <div className="pipeline-steps-wrapper">
          <div className="pipeline-step-card">
            <div className="step-header">
              <span className="step-number">01</span>
              <div className="step-badge">INPUT</div>
            </div>
            <h3 className="step-title">Upload Video</h3>
            <p className="step-desc">
              User uploads a continuous smartphone video walking or orbiting around a subject.
              Accepted formats include MP4, MOV, AVI, MKV, and WebM.
            </p>
            <div className="step-metric">Handheld Monocular Video</div>
          </div>

          <div className="pipeline-step-arrow">→</div>

          <div className="pipeline-step-card">
            <div className="step-header">
              <span className="step-number">02</span>
              <div className="step-badge">OPENCV</div>
            </div>
            <h3 className="step-title">Frame Extraction</h3>
            <p className="step-desc">
              OpenCV smart-samples frames at the configured target rate (5 FPS), resizes high-resolution
              frames, and ensures adequate parallax baseline between adjacent views.
            </p>
            <div className="step-metric">Smart FPS Downsampling</div>
          </div>

          <div className="pipeline-step-arrow">→</div>

          <div className="pipeline-step-card">
            <div className="step-header">
              <span className="step-number">03</span>
              <div className="step-badge">COLMAP</div>
            </div>
            <h3 className="step-title">Camera Reconstruction</h3>
            <p className="step-desc">
              COLMAP extracts SIFT features, performs sequential matching along the video trajectory,
              estimates OPENCV radial distortion parameters, and triangulates sparse points.
            </p>
            <div className="step-metric">Structure-from-Motion (SfM)</div>
          </div>

          <div className="pipeline-step-arrow">→</div>

          <div className="pipeline-step-card">
            <div className="step-header">
              <span className="step-number">04</span>
              <div className="step-badge">CUDA</div>
            </div>
            <h3 className="step-title">Gaussian Splatting</h3>
            <p className="step-desc">
              The sparse point cloud is initialized into 3D Gaussians. PyTorch optimizes position,
              rotation, scaling, opacity, and spherical harmonics over 30,000 iterations.
            </p>
            <div className="step-metric">3D Anisotropic Splats</div>
          </div>

          <div className="pipeline-step-arrow">→</div>

          <div className="pipeline-step-card">
            <div className="step-header">
              <span className="step-number">05</span>
              <div className="step-badge">SIBR</div>
            </div>
            <h3 className="step-title">Explore 3D Scene</h3>
            <p className="step-desc">
              The generated Gaussian model (`point_cloud.ply`) is exported and can be opened
              directly in the Inria SIBR real-time desktop viewer or downloaded for external tools.
            </p>
            <div className="step-metric">Real-time Host Viewer</div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. GAUSSIAN SPLATTING TECHNOLOGY DEEP DIVE               */}
      {/* ======================================================== */}
      <section className="section-container" id="technology">
        <div className="tech-deepdive-grid">
          <div className="tech-deepdive-text">
            <span className="section-pill">MATHEMATICAL PRINCIPLE</span>
            <h2 className="section-title">The Power of 3D Gaussian Primitives</h2>
            <p className="section-text">
              Traditional 3D reconstruction forces continuous geometry into rigid polygonal meshes
              with flat UV textures. In contrast, 3D Gaussian Splatting models the scene as millions of
              differentiable, anisotropic volumetric ellipsoids:
            </p>

            <div className="equation-box">
              <code>G(x) = exp(-0.5 * (x - μ)ᵀ Σ⁻¹ (x - μ))</code>
              <small>where μ is the Gaussian center and Σ is the 3D Covariance Matrix</small>
            </div>

            <div className="tech-benefits-list">
              <div className="benefit-item">
                <CheckCircle2 size={18} className="benefit-icon" />
                <div>
                  <strong>View-Dependent Radiance (Spherical Harmonics)</strong>
                  <p>Accurately renders reflections, specular highlights, and ambient illumination shifts as camera angle moves.</p>
                </div>
              </div>

              <div className="benefit-item">
                <CheckCircle2 size={18} className="benefit-icon" />
                <div>
                  <strong>Adaptive Density Control</strong>
                  <p>Automatically clones Gaussians in under-reconstructed areas and splits oversized splats in high-variance geometry.</p>
                </div>
              </div>

              <div className="benefit-item">
                <CheckCircle2 size={18} className="benefit-icon" />
                <div>
                  <strong>Order of Magnitude Faster than NeRF</strong>
                  <p>Eliminates expensive neural network queries per pixel; renders directly via fast GPU tile sorting.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="tech-deepdive-cards">
            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Frame Baseline</span>
                <span className="stat-pill">Smart Sampling</span>
              </div>
              <div className="stat-value">5 FPS</div>
              <p className="stat-caption">Avoids redundant motion blur while ensuring 70%+ visual overlap between frames.</p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Camera Intrinsics</span>
                <span className="stat-pill">OPENCV</span>
              </div>
              <div className="stat-value">f, cx, cy, k1, k2</div>
              <p className="stat-caption">Solves lens distortion parameters directly from mobile video frame parallax.</p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Optimization Epochs</span>
                <span className="stat-pill">Convergence</span>
              </div>
              <div className="stat-value">30,000</div>
              <p className="stat-caption">Proven baseline iterations achieving sharp geometric edges and smooth radiance falloff.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. EXPLORE RECONSTRUCTED SCENES (REAL DATA)              */}
      {/* ======================================================== */}
      <section className="section-container bg-subtle" id="showcase-section">
        <div className="section-head text-center">
          <span className="section-pill">COMPLETED RECONSTRUCTIONS</span>
          <h2 className="section-title">Explore Reconstructed 3D Scenes</h2>
          <p className="section-subtitle">
            These are real reconstruction outputs generated by SceneForge and tested on the COLMAP + 3DGS pipeline.
          </p>
        </div>

        {loadingProjects ? (
          <div className="showcase-loading">
            <span className="spinner-inline" />
            <span>Loading verified reconstructions from backend...</span>
          </div>
        ) : showcaseProjects.length === 0 ? (
          <div className="showcase-empty">
            <Box size={32} />
            <p>No completed reconstructions found yet on this installation.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={onStartUpload}
            >
              Start First Reconstruction
            </button>
          </div>
        ) : (
          <div className="showcase-grid">
            {showcaseProjects.map((project) => (
              <div className="showcase-card" key={project.id}>
                <div className="card-top-header">
                  <div className="card-badge-wrap">
                    <span className="card-badge complete">COMPLETE</span>
                    {project.is_legacy && (
                      <span className="card-badge reference">REFERENCE</span>
                    )}
                  </div>
                  <span className="card-iteration">
                    {project.iteration?.toLocaleString()} iters
                  </span>
                </div>

                <div className="card-preview-area">
                  <div className="card-preview-art">
                    <Box size={36} className="preview-cube-icon" />
                    <span className="preview-label">3D Gaussian Model</span>
                  </div>
                </div>

                <div className="card-body">
                  <h3 className="card-title">{project.name}</h3>
                  <div className="card-metrics-grid">
                    <div className="metric-cell">
                      <small>Cameras</small>
                      <strong>{project.registered_images || '—'}</strong>
                    </div>
                    <div className="metric-cell">
                      <small>Sparse Points</small>
                      <strong>{project.sparse_points ? project.sparse_points.toLocaleString() : '—'}</strong>
                    </div>
                    <div className="metric-cell">
                      <small>Frames</small>
                      <strong>{project.frames_count || '—'}</strong>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    type="button"
                    className="btn-card-action primary"
                    onClick={() => handleOpenViewer(project)}
                    disabled={openingProject === project.id}
                  >
                    <Eye size={15} />
                    <span>
                      {openingProject === project.id ? 'Opening...' : 'View Scene (SIBR)'}
                    </span>
                  </button>

                  <a
                    href={api.getDownloadUrl(project.id, 'ply')}
                    download
                    className="btn-card-action secondary"
                    title="Download Gaussian Splat PLY"
                  >
                    <Download size={15} />
                    <span>PLY</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="showcase-footer-cta text-center">
          <button
            type="button"
            className="btn-link-styled"
            onClick={() => setPage('projects')}
          >
            <span>View All Projects in Dashboard</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. WHY SMARTPHONE VIDEO? (CAPTURE GUIDE)                 */}
      {/* ======================================================== */}
      <section className="section-container" id="capture-guide">
        <div className="section-head text-center">
          <span className="section-pill">BEST PRACTICES</span>
          <h2 className="section-title">Capturing Optimal Video for 3DGS</h2>
          <p className="section-subtitle">
            Gaussian Splatting relies on high feature parallax. Follow these field guidelines to maximize camera registration.
          </p>
        </div>

        <div className="guidelines-grid">
          <div className="guide-card">
            <span className="guide-step">01</span>
            <h4>Continuous Orbital Motion</h4>
            <p>Walk slowly in a smooth circle around the subject. Avoid abrupt pan turns or sudden camera shakes.</p>
          </div>

          <div className="guide-card">
            <span className="guide-step">02</span>
            <h4>Consistent Diffuse Lighting</h4>
            <p>Overcast daylight or uniform indoor lighting produces the best color consistency without moving shadows.</p>
          </div>

          <div className="guide-card">
            <span className="guide-step">03</span>
            <h4>Multiple Elevation Angles</h4>
            <p>Capture at eye level first, then an elevated downward orbit, and a low upward pass to cover all occluded faces.</p>
          </div>

          <div className="guide-card">
            <span className="guide-step">04</span>
            <h4>Static Scene Environment</h4>
            <p>Ensure the subject and background remain completely stationary throughout the capture duration.</p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. BOTTOM CTA BANNER                                     */}
      {/* ======================================================== */}
      <section className="cta-banner-section">
        <div className="cta-banner-card">
          <div className="cta-glow-bg" />
          <div className="cta-banner-content">
            <h2 className="cta-banner-title">
              Ready to turn your video into an explorable 3D scene?
            </h2>
            <p className="cta-banner-subtitle">
              Upload your video now. SceneForge will automatically extract frames,
              reconstruct camera geometry with COLMAP, and train your 3D Gaussian Splat.
            </p>
            <div className="cta-banner-buttons">
              <button
                type="button"
                className="btn-primary-large"
                onClick={onStartUpload}
              >
                <Sparkles size={18} />
                <span>Launch Reconstruction Engine</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}

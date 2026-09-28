import React from 'react';
import {
  Box,
  Layers,
  Camera,
  Cpu,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Sparkles,
  GitBranch,
} from 'lucide-react';

export default function AboutPage({ onStartUpload }) {
  return (
    <div className="about-page-root">
      <div className="about-container">
        {/* Header */}
        <div className="about-header text-center">
          <span className="section-pill">ACADEMIC RESEARCH & ARCHITECTURE</span>
          <h1 className="about-title">About SceneForge</h1>
          <p className="about-subtitle">
            A comprehensive computer-vision and graphics research application demonstrating
            end-to-end 3D reconstruction from casual smartphone video using 3D Gaussian Splatting.
          </p>
        </div>

        {/* Section 1: Research Objectives */}
        <div className="about-section-card">
          <h2 className="card-heading">Project Scope & Academic Motivation</h2>
          <p className="card-paragraph">
            Traditional Multi-View Stereo (MVS) pipelines rely on dense point cloud generation and Poisson surface meshing,
            which frequently struggle with thin geometry, specular reflections, and fine foliage. Conversely, Neural Radiance Fields
            (NeRF) achieve photorealistic novel view synthesis but require volumetric ray-marching that is prohibitively slow for real-time interaction.
          </p>
          <p className="card-paragraph">
            <strong>SceneForge</strong> implements 3D Gaussian Splatting (3DGS) to reconstruct explorable 3D scenes directly from
            uncalibrated monocular smartphone video. By combining classic Structure-from-Motion (SfM) with continuous anisotropic 3D Gaussians,
            the system delivers state-of-the-art visual quality with real-time 60+ FPS rasterization on standard consumer GPU hardware.
          </p>
        </div>

        {/* Section 2: Pipeline Breakdown */}
        <div className="about-section-card">
          <h2 className="card-heading">The 5-Stage Reconstruction Pipeline</h2>

          <div className="architecture-diagram">
            <div className="arch-step">
              <span className="arch-num">01</span>
              <h4>Video Capture</h4>
              <p>Handheld mobile video recording smooth continuous orbital trajectory.</p>
            </div>
            <span className="arch-arrow">→</span>

            <div className="arch-step">
              <span className="arch-num">02</span>
              <h4>Frame Extraction</h4>
              <p>OpenCV smart-sampling at 5 FPS with resolution bounding.</p>
            </div>
            <span className="arch-arrow">→</span>

            <div className="arch-step">
              <span className="arch-num">03</span>
              <h4>COLMAP SfM</h4>
              <p>SIFT feature extraction, sequential matching, camera pose estimation.</p>
            </div>
            <span className="arch-arrow">→</span>

            <div className="arch-step">
              <span className="arch-num">04</span>
              <h4>Gaussian Splatting</h4>
              <p>Differentiable optimization of 3D ellipsoids and spherical harmonics.</p>
            </div>
            <span className="arch-arrow">→</span>

            <div className="arch-step">
              <span className="arch-num">05</span>
              <h4>SIBR 3D Viewer</h4>
              <p>Real-time novel-view exploration on host CUDA rasterizer.</p>
            </div>
          </div>
        </div>

        {/* Section 3: Mathematical Formulation */}
        <div className="about-section-card">
          <h2 className="card-heading">Mathematical Principles of 3DGS</h2>
          <p className="card-paragraph">
            Each 3D Gaussian primitive is defined by its center position <code>μ ∈ ℝ³</code> and a full 3D covariance matrix <code>Σ ∈ ℝ³ˣ³</code>:
          </p>
          <div className="equation-callout">
            <code>G(x) = exp(-½ · (x - μ)ᵀ Σ⁻¹ (x - μ))</code>
          </div>
          <p className="card-paragraph">
            To ensure that the covariance matrix <code>Σ</code> remains positive semi-definite throughout gradient descent, it is factorized into a 3D scaling vector <code>S</code> and a rotation quaternion <code>R</code>:
          </p>
          <div className="equation-callout">
            <code>Σ = R S Sᵀ Rᵀ</code>
          </div>
          <p className="card-paragraph">
            During training, each Gaussian's view-dependent color is represented via Spherical Harmonics (SH) coefficients up to degree 3, allowing the model to accurately capture directional lighting, reflections, and sheen without baking them into static texture maps.
          </p>
        </div>

        {/* Section 4: Hardware & Environment Specifications */}
        <div className="about-section-card">
          <h2 className="card-heading">Hardware & Workstation Configuration</h2>
          <div className="specs-table-wrapper">
            <table className="specs-table">
              <tbody>
                <tr>
                  <td><strong>Operating System</strong></td>
                  <td>Windows 11 (64-bit)</td>
                </tr>
                <tr>
                  <td><strong>Graphics Hardware</strong></td>
                  <td>NVIDIA GeForce RTX Series (CUDA Accelerated)</td>
                </tr>
                <tr>
                  <td><strong>SfM Engine</strong></td>
                  <td>COLMAP 4.x (CPU SIFT feature matching for numerical stability)</td>
                </tr>
                <tr>
                  <td><strong>Optimization Backend</strong></td>
                  <td>PyTorch with custom CUDA rasterization kernels</td>
                </tr>
                <tr>
                  <td><strong>Target Iterations</strong></td>
                  <td>30,000 iterations (conservative baseline profile)</td>
                </tr>
                <tr>
                  <td><strong>Interactive Viewer</strong></td>
                  <td>Inria SIBR real-time desktop viewer</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Academic Acknowledgments */}
        <div className="about-section-card">
          <h2 className="card-heading">Academic References</h2>
          <ul className="citations-list">
            <li>
              <strong>3D Gaussian Splatting for Real-Time Radiance Field Rendering</strong><br />
              Bernhard Kerbl, Georgios Kopanas, Thomas Leimkühler, George Drettakis.<br />
              <em>ACM Transactions on Graphics (SIGGRAPH 2023)</em>.
            </li>
            <li>
              <strong>Structure-from-Motion Revisited</strong><br />
              Johannes L. Schönberger, Jan-Michael Frahm.<br />
              <em>IEEE Conference on Computer Vision and Pattern Recognition (CVPR 2016)</em>.
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="about-cta-card text-center">
          <h3>Experience SceneForge in Action</h3>
          <p>Test the full pipeline with a captured smartphone video.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={onStartUpload}
          >
            <Sparkles size={16} />
            <span>Create 3D Scene</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

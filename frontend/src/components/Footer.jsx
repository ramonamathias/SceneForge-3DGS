import React from 'react';
import { Box, Layers, Cpu, ExternalLink, ShieldCheck } from 'lucide-react';

export default function Footer({ setPage }) {
  const handleNav = (targetPage, sectionId = null) => {
    setPage(targetPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand-col">
            <div className="footer-logo">
              <Box size={24} className="footer-logo-icon" />
              <span className="footer-logo-title">SceneForge</span>
            </div>
            <p className="footer-desc">
              Turn smartphone video into an explorable 3D scene using camera reconstruction,
              COLMAP Structure-from-Motion, and 3D Gaussian Splatting.
            </p>
            <div className="footer-pill">
              <span className="footer-pill-dot" />
              <span>Academic Capstone • Computer Vision & Graphics</span>
            </div>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-heading">Navigation</h4>
            <ul className="footer-links-list">
              <li>
                <button type="button" onClick={() => handleNav('home')}>
                  Home
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('home', 'how-it-works')}>
                  How It Works
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('projects')}>
                  Reconstructed Projects
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('about')}>
                  About & Methodology
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('contact')}>
                  Contact
                </button>
              </li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-heading">Architecture</h4>
            <ul className="footer-links-list">
              <li>
                <span>COLMAP SfM Feature Matcher</span>
              </li>
              <li>
                <span>Sequential Frame Sampling</span>
              </li>
              <li>
                <span>3D Gaussian Covariance Optimization</span>
              </li>
              <li>
                <span>Differentiable Tile Rasterizer</span>
              </li>
              <li>
                <span>SIBR Interactive Viewer</span>
              </li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-heading">Technical Specs</h4>
            <div className="footer-specs">
              <div className="spec-item">
                <small>Capture Device</small>
                <strong>Handheld Smartphone Video</strong>
              </div>
              <div className="spec-item">
                <small>Training Resolution</small>
                <strong>Half / Full Intrinsics</strong>
              </div>
              <div className="spec-item">
                <small>Primitives</small>
                <strong>3D Anisotropic Gaussians</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="copyright-text">
            © 2026 SceneForge. All rights reserved.
          </p>
          <div className="footer-bottom-tags">
            <span>Real-time Novel View Synthesis</span>
            <span className="dot-divider">•</span>
            <span>Uncalibrated Monocular Video</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

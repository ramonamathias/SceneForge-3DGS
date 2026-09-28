import React, { useState } from 'react';
import {
  Mail,
  User,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  FileText,
} from 'lucide-react';
import { api } from '../api';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.submitContact({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });

      if (res && res.ok) {
        setTicketId(res.ticket_id || 'SF-RECORDED');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      }
    } catch (err) {
      setError(err.message || 'Could not record message. Please verify network connectivity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page-root">
      <div className="contact-container">
        {/* Header */}
        <div className="contact-header text-center">
          <span className="section-pill">RESEARCH INQUIRIES</span>
          <h1 className="contact-title">Contact & Academic Inquiries</h1>
          <p className="contact-subtitle">
            Have questions regarding the SceneForge 3DGS pipeline, smartphone video datasets,
            or evaluation metrics? Submit your inquiry directly to our research database.
          </p>
        </div>

        <div className="contact-grid">
          {/* Left: Contact Form */}
          <div className="contact-form-card">
            {ticketId ? (
              <div className="contact-success-box text-center">
                <CheckCircle2 size={48} className="text-emerald mx-auto mb-4" />
                <h3>Inquiry Successfully Recorded</h3>
                <p>
                  Your message has been stored in the SceneForge database.
                </p>
                <div className="ticket-id-pill">
                  <span>Reference ID:</span>
                  <strong>#{ticketId}</strong>
                </div>
                <button
                  type="button"
                  className="btn-secondary mt-6"
                  onClick={() => setTicketId(null)}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                {error && (
                  <div className="contact-error-banner">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="contact-name">Full Name</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input
                      id="contact-name"
                      type="text"
                      placeholder="Dr. Jordan Hayes"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="contact-email">Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="contact-email"
                      type="email"
                      placeholder="jordan.hayes@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="contact-subject">Inquiry Subject</label>
                  <div className="input-wrapper">
                    <FileText size={18} className="input-icon" />
                    <input
                      id="contact-subject"
                      type="text"
                      placeholder="e.g. Academic demonstration / dataset inquiry"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="contact-message">Message</label>
                  <div className="textarea-wrapper">
                    <textarea
                      id="contact-message"
                      rows={5}
                      placeholder="Describe your inquiry, evaluation parameters, or technical questions..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-inline" />
                      <span>Recording Message...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Submit Inquiry</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right: Technical Notes & FAQs */}
          <div className="contact-sidebar">
            <div className="sidebar-card">
              <h4 className="card-subheading">Inquiry Persistence</h4>
              <p className="card-subtext">
                Messages submitted through this interface are directly saved to the local SQLite database
                (<code>sceneforge.db</code>) with full audit timestamps.
              </p>
            </div>

            <div className="sidebar-card">
              <h4 className="card-subheading">Frequently Asked Questions</h4>
              <div className="faq-list">
                <div className="faq-item">
                  <strong>Does SceneForge support 4K 60fps video?</strong>
                  <p>Yes. OpenCV automatically downsamples frame dimensions to 1600px to maintain VRAM limits during COLMAP feature extraction.</p>
                </div>

                <div className="faq-item">
                  <strong>Can I export models to Blender or Unity?</strong>
                  <p>Yes. The generated <code>point_cloud.ply</code> file contains all Gaussian means, scales, and colors compatible with standard 3DGS plugins.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

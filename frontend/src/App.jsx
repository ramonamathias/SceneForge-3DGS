import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';

import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import ProgressPage from './pages/ProgressPage';
import ResultPage from './pages/ResultPage';
import ProjectsPage from './pages/ProjectsPage';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';

import { api, getUser, getToken, clearAuth } from './api';

export default function App() {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(getUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [postAuthTarget, setPostAuthTarget] = useState(null);

  // Active reconstruction job state
  const [activeJob, setActiveJob] = useState(null);

  // Verify auth session on initial load
  useEffect(() => {
    async function verifySession() {
      const token = getToken();
      if (!token) {
        setUser(null);
        return;
      }
      try {
        const res = await api.getMe();
        if (res && res.user) {
          setUser(res.user);
        }
      } catch (err) {
        console.warn('Session verification failed, clearing auth:', err.message);
        clearAuth();
        setUser(null);
      }
    }
    verifySession();
  }, []);

  const handleOpenAuth = (mode = 'login', targetPageAfterAuth = null) => {
    setAuthModalMode(mode);
    setPostAuthTarget(targetPageAfterAuth);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setAuthModalOpen(false);
    if (postAuthTarget) {
      setPage(postAuthTarget);
      setPostAuthTarget(null);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    if (page === 'profile' || page === 'upload' || page === 'progress') {
      setPage('home');
    }
  };

  const handleStartUpload = () => {
    if (!user) {
      handleOpenAuth('login', 'upload');
    } else {
      setPage('upload');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReconstructionStarted = ({ jobId, projectId, filename }) => {
    setActiveJob({
      id: jobId,
      projectId: projectId || jobId,
      filename,
      status: 'UPLOADED',
      progress: 5,
    });
    setPage('progress');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReconstructionCompleted = (job) => {
    setActiveJob(job);
    setPage('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetReconstruction = () => {
    setActiveJob(null);
    setPage('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="sceneforge-app">
      <Navbar
        page={page}
        setPage={setPage}
        user={user}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onStartUpload={handleStartUpload}
      />

      <main className="app-main-content">
        {page === 'home' && (
          <HomePage
            setPage={setPage}
            onStartUpload={handleStartUpload}
            onSelectProject={(project) => {
              setPage('projects');
            }}
          />
        )}

        {page === 'upload' && (
          <UploadPage
            user={user}
            onOpenAuth={handleOpenAuth}
            onReconstructionStarted={handleReconstructionStarted}
          />
        )}

        {page === 'progress' && (
          <ProgressPage
            jobId={activeJob?.id}
            projectId={activeJob?.projectId}
            videoFilename={activeJob?.filename}
            onComplete={handleReconstructionCompleted}
            onReset={handleResetReconstruction}
          />
        )}

        {page === 'result' && (
          <ResultPage
            job={activeJob}
            setPage={setPage}
            onReset={handleResetReconstruction}
          />
        )}

        {page === 'projects' && (
          <ProjectsPage
            user={user}
            onOpenAuth={handleOpenAuth}
            onStartUpload={handleStartUpload}
            onSelectProject={(project) => {
              // select project
            }}
          />
        )}

        {page === 'profile' && (
          <ProfilePage
            user={user}
            setPage={setPage}
            onLogout={handleLogout}
            onStartUpload={handleStartUpload}
          />
        )}

        {page === 'about' && (
          <AboutPage onStartUpload={handleStartUpload} />
        )}

        {page === 'contact' && (
          <ContactPage />
        )}
      </main>

      <Footer setPage={setPage} />

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

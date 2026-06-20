import React from 'react';
import { Mail, Lock, UserPlus, Key, User, Activity, Zap, Sparkles } from 'lucide-react';

export default function LoginPage({ authMode, setAuthMode, loginEmail, setLoginEmail, loginPassword, setLoginPassword, handleAuth, authError, authMessage }) {
  return (
    <div className="auth-container">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          {/* Logo Container */}
          <div className="relative flex items-center justify-center w-20 h-20 mb-6 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl shadow-blue-600/40 transform transition-all hover:scale-105" style={{ margin: '0 auto 1.5rem', width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #2563eb, #4f46e5)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.15)', borderRadius: '24px', filter: 'blur(1px)' }}></div>
            <Zap size={40} className="text-white relative z-10" fill="currentColor" style={{ color: '#ffffff', position: 'relative', zIndex: 10 }} />
            <Sparkles size={16} className="absolute text-yellow-400 animate-pulse" style={{ color: '#facc15', position: 'absolute', top: '8px', right: '8px', zIndex: 10 }} />
          </div>
          
          <div className="flex flex-col items-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '2.2rem', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.05em', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                NEXUS <span style={{ color: '#2563eb' }}>AI</span>
              </h1>
              <span style={{ fontSize: '10px', padding: '0.15rem 0.6rem', borderRadius: '999px', border: '1px solid rgba(59, 130, 246, 0.4)', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontWeight: 'bold', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '0.05em' }}>
                V1.3.4
              </span>
            </div>
            <span style={{ color: '#3b82f6', fontWeight: 950, fontSize: '0.9rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontStyle: 'italic', marginTop: '0.4rem' }}>
              REGIONAL
            </span>
            <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.2em', fontStyle: 'italic', marginTop: '0.2rem' }}>
              ROYA AI WEBDESIGN
            </span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          <div className="input-group">
            <Mail size={18} />
            <input type="email" placeholder="Seu e-mail" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <Lock size={18} />
            <input type="password" placeholder="Sua senha" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
          </div>

          {authError && <div className="auth-error">{authError}</div>}
          {authMessage && <div className="auth-message">{authMessage}</div>}

          <button type="submit" className="btn primary-btn" style={{width:'100%', marginTop:'1rem'}}>
            {authMode === 'LOGIN' ? 'Entrar no Sistema' : 'Criar Conta'}
          </button>
        </form>

        <div className="auth-footer">
          {authMode === 'LOGIN' ? (
            <>
              <button onClick={() => setAuthMode('REGISTER')} className="text-btn"><UserPlus size={14}/> Criar Conta</button>
              <button onClick={() => alert('Entre em contato com o suporte')} className="text-btn"><Key size={14}/> Esqueci a senha</button>
            </>
          ) : (
            <button onClick={() => setAuthMode('LOGIN')} className="text-btn"><User size={14}/> Já tenho conta</button>
          )}
        </div>
      </div>
    </div>
  );
}

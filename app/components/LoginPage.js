import React from 'react';
import { Mail, Lock, UserPlus, Key, User, Activity } from 'lucide-react';

export default function LoginPage({ authMode, setAuthMode, loginEmail, setLoginEmail, loginPassword, setLoginPassword, handleAuth, authError, authMessage }) {
  return (
    <div className="auth-container">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="auth-logo">
            <Activity size={32} color="var(--accent-primary)" />
          </div>
          <h2>{authMode === 'LOGIN' ? 'Área 02 Sul POA' : 'Criar Nova Conta'}</h2>
          <p>{authMode === 'LOGIN' ? 'Acesse o dashboard regional' : 'Registre-se para acessar o sistema'}</p>
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

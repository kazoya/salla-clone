import React, { useState } from 'react';
import { t } from '../i18n';

const AuthForm = ({ mode, onRegister, onLogin, error, onToggleMode }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'register') {
      onRegister(name, email, password);
    } else {
      onLogin(email, password);
    }
  };

  return (
    <div>
      {error && <div data-testid="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('اسم المستخدم')}
            data-testid="auth-name"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('البريد الإلكتروني')}
          data-testid="auth-email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('كلمة المرور')}
          data-testid="auth-password"
        />
        <button type="submit" data-testid="auth-submit">
          {mode === 'register' ? t('إنشاء حساب') : t('تسجيل الدخول')}
        </button>
        <button type="button" onClick={() => { onToggleMode(); }} data-testid="auth-toggle">
          {mode === 'register' ? t('تسجيل الدخول') : t('إنشاء حساب')}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;

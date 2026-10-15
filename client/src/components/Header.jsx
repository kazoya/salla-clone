import React from 'react';
import { t } from '../i18n';
import Toggles from './Toggles';

const Header = ({ user, onLogout, onDashboard, onAdmin, onHome }) => {
  return (
    <header className="site-header">
      <button type="button" className="brand" onClick={onHome} data-testid="brand">
        <span className="brand-mark" aria-hidden="true">س</span>
        <span>{t('سلة')}</span>
      </button>
      <nav className="nav">
        {user ? (
          <>
            <span className="user-chip" data-testid="user-name">{user.name}</span>
            {user.role === 'admin' && (
              <button className="btn-ghost" onClick={onAdmin} data-testid="nav-admin">{t('لوحة المدير')}</button>
            )}
            <button className="btn-ghost" onClick={onDashboard} data-testid="nav-dashboard">{t('لوحة التحكم')}</button>
            <button className="btn-ghost" onClick={onLogout} data-testid="logout">{t('تسجيل خروج')}</button>
          </>
        ) : (
          <button className="btn-ghost" data-testid="nav-login">{t('تسجيل الدخول')}</button>
        )}
        <Toggles />
      </nav>
    </header>
  );
};

export default Header;

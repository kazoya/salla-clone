import React from 'react';

const Header = ({ user, onLogout, onDashboard }) => {
  return (
    <header>
      {user ? (
        <div>
          <span data-testid="user-name">{user.name}</span>
          <button onClick={onDashboard} data-testid="nav-dashboard">لوحة التحكم</button>
          <button onClick={onLogout} data-testid="logout">تسجيل خروج</button>
        </div>
      ) : (
        <button data-testid="nav-login">تسجيل الدخول</button>
      )}
    </header>
  );
};

export default Header;

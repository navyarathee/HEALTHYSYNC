import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const AuthenticatedLayout = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main
          style={{
            flex: 1,
            padding: '32px',
            overflowY: 'auto',
            background: `
              radial-gradient(ellipse at 80% 20%, rgba(99, 102, 241, 0.04) 0%, transparent 50%),
              var(--bg-dark)
            `,
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AuthenticatedLayout;

import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

function Layout() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-dark-950">
      <Navbar />
      <main className={`flex-1 ${isLandingPage ? '' : 'pt-20'}`}>
        <Outlet />
      </main>
      {(isLandingPage || isAuthPage) && <Footer />}
    </div>
  );
}

export default Layout;

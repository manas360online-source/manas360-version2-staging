import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * 
 * Automatically scrolls the page to the top whenever the route changes.
 * This prevents the "jittery" double-loading effect where pages load
 * at their previous scroll position and then jump to the top.
 * 
 * Usage: Place inside <BrowserRouter> but outside <Routes>
 * <BrowserRouter>
 *   <ScrollToTop />
 *   <Routes>...</Routes>
 * </BrowserRouter>
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
    
    // Optional: Also scroll any custom scrollable containers to top
    // This is useful if you have nested scrollable areas
    const scrollableContainers = document.querySelectorAll('[data-scroll-to-top]');
    scrollableContainers.forEach((container) => {
      if (container instanceof HTMLElement) {
        container.scrollTop = 0;
      }
    });
  }, [pathname]);

  // This component doesn't render anything
  return null;
}

export default ScrollToTop;

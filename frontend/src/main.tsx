import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider } from 'react-redux'
import App from './App'
import './index.css'
import { store } from './store'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { VideoSessionProvider } from './context/VideoSessionContext'
import { ErrorProvider } from './components/ErrorProvider'
import { applyThemePreference, getStoredThemePreference } from './lib/themePreference'

const initialPreference = getStoredThemePreference()
applyThemePreference(initialPreference)

if (typeof window !== 'undefined' && window.location.hash === '' && window.location.pathname !== '/') {
  const hashTarget = `#${window.location.pathname}${window.location.search}${window.location.hash || ''}`
  window.location.replace(`${window.location.origin}/${hashTarget}`)
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleSystemThemeChange = () => {
    if (getStoredThemePreference() === null) {
      applyThemePreference(null)
    }
  }

  if (typeof darkModeQuery.addEventListener === 'function') {
    darkModeQuery.addEventListener('change', handleSystemThemeChange)
  } else if (typeof darkModeQuery.addListener === 'function') {
    darkModeQuery.addListener(handleSystemThemeChange)
  }
}

if (!(typeof window !== 'undefined' && window.location.hash === '' && window.location.pathname !== '/')) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient()}>
        <Provider store={store}>
          <ErrorProvider>
            <ErrorBoundary>
              <VideoSessionProvider>
                <RouterProvider
                    router={createHashRouter([
                      // Parent route must accept nested routes — use a trailing /*
                      { path: '/*', element: <App /> },
                    ])}
                    // Opt into v7 behavior to avoid future warnings
                    future={{ v7_startTransition: true }}
                  />
                </VideoSessionProvider>
            </ErrorBoundary>
          </ErrorProvider>
        </Provider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

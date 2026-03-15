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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <QueryClientProvider client={new QueryClient()}>
      <Provider store={store}>
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
        </Provider>
      </QueryClientProvider>
    </HelmetProvider>
);

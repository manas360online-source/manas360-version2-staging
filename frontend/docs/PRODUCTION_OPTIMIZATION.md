# Production Optimization Guide - MANAS360 Landing Page

## 🚀 Performance Goals

- **Lighthouse Score**: 90+
- **Core Web Vitals**:
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1
- **Bundle Size**: < 100KB gzipped
- **First Paint**: < 1s
- **Time to Interactive**: < 3s

---

## 📊 Measurement Tools

### 1. **Lighthouse CLI**

```bash
npm install -g lighthouse

# Run audit
lighthouse https://manas360.com --output-path=./report.html --view

# Configuration
lighthouse https://manas360.com --preset=mobile
```

### 2. **Web Vitals Monitoring**

```bash
npm install web-vitals

# In src/main.tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### 3. **Bundle Analysis**

```bash
npm install --save-dev vite-plugin-visualizer
```

In `vite.config.ts`:
```typescript
import { visualizer } from "vite-plugin-visualizer";

export default {
  plugins: [
    visualizer({
      template: 'flamegraph',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ]
}
```

---

## ✅ Optimization Checklist

### **Code Splitting**

```jsx
// Dynamic imports for routes
import { lazy, Suspense } from 'react';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AssessmentPage = lazy(() => import('./pages/AssessmentPage'));

export const App = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/assessment" element={<AssessmentPage />} />
    </Routes>
  </Suspense>
);
```

### **Lazy Loading Components**

```jsx
// Use Intersection Observer for component rendering
const LazyComponent = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(ref.current);
      }
    });
    if (ref.current) observer.observe(ref.current);
  }, []);

  return <div ref={ref}>{isVisible ? children : null}</div>;
};
```

### **Font Optimization**

Already implemented but optimize further:

```html
<!-- In index.html -->
<link
  rel="preconnect"
  href="https://fonts.googleapis.com"
  crossOrigin="anonymous"
/>
<link
  rel="preload"
  as="style"
  href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=DM+Sans:wght@400;500;700&display=swap"
/>
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=DM+Sans:wght@400;500;700&display=swap"
/>
```

Or use self-hosted fonts:

```bash
# Download fonts locally
# Place in public/fonts/

# In index.css
@font-face {
  font-family: 'Crimson Pro';
  src: url('/fonts/crimson-pro.woff2') format('woff2');
  font-weight: 300;
  font-display: swap;
}
```

### **CSS Optimization**

Already handled by Tailwind in production, but verify:

```bash
# Ensure CSS purging is enabled in tailwind.config.ts
content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}',
]
```

### **JavaScript Optimization**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['@babel/plugin-transform-runtime'],
      },
    }),
    compression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotli',
      ext: '.br',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['react-helmet-async'],
        },
      },
    },
    minify: 'terser',
    cssCodeSplit: true,
  },
});
```

### **Image Optimization**

For any images added:

```jsx
// Use Next.js Image or equivalent
import { useWebP } from './hooks/useWebP';

const OptimizedImage = ({ src, alt }) => {
  const supportsWebP = useWebP();
  return (
    <img
      src={supportsWebP ? src.replace('.jpg', '.webp') : src}
      alt={alt}
      loading="lazy"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
      srcSet={`
        ${src}?w=640 640w,
        ${src}?w=1280 1280w,
        ${src}?w=1920 1920w
      `}
    />
  );
};
```

### **Caching Strategy**

```typescript
// vite.config.ts
build: {
  assetsDir: 'assets',
  rollupOptions: {
    output: {
      entryFileNames: 'js/[name].[hash].js',
      chunkFileNames: 'js/[name].[hash].js',
      assetFileNames: (assetInfo) => {
        const info = assetInfo.name.split('.');
        const ext = info[info.length - 1];
        if (/png|jpe?g|gif|svg|webp|ico/.test(ext)) {
          return `images/[name].[hash][extname]`;
        } else if (/woff|woff2|ttf|otf|eot/.test(ext)) {
          return `fonts/[name].[hash][extname]`;
        } else if (ext === 'css') {
          return `css/[name].[hash][extname]`;
        } else {
          return `[name].[hash][extname]`;
        }
      },
    },
  },
}
```

### **Service Worker (Optional)**

```bash
npm install --save-dev workbox-cli
npx workbox injectManifest workbox-config.js
```

```javascript
// workbox-config.js
export default {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{html,js,css,woff2}'],
  globIgnores: ['**/node_modules/**/*'],
  swDest: 'dist/sw.js',
  clientsClaim: true,
  skipWaiting: true,
  // Only cache assets, not HTML
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
  ],
};
```

---

## 🎨 Animation Performance

### **GPU Acceleration**

Use `transform` and `opacity` only:

```css
/* Good - GPU accelerated */
.good {
  animation: slideIn 0.5s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(-100px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Bad - Layout shifts, CPU intensive */
.bad {
  animation: slideIn 0.5s ease;
}

@keyframes slideIn {
  from {
    left: -100px;
    opacity: 0;
  }
  to {
    left: 0;
    opacity: 1;
  }
}
```

### **Reduce Animation Complexity**

```css
/* Keep animations simple */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* Use CSS over JavaScript */
.smooth-transition {
  transition: all 0.3s ease;
}

/* Avoid simultaneous animations on many elements */
/* Instead of animating 50 particles, animate 5-8 */
.particle {
  animation: float 20s infinite ease-in-out;
}
```

---

## 🔐 Security Optimizations

### **Content Security Policy**

```html
<!-- In index.html -->
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' https://cdn.jsdelivr.net;
    style-src 'self' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https:;
    connect-src 'self' https://api.manas360.com;
  "
/>
```

### **X-Content-Type-Options**

Handled by server. Verify in response headers:
```
X-Content-Type-Options: nosniff
```

### **X-Frame-Options**

```
X-Frame-Options: SAMEORIGIN
```

---

## 📱 Mobile Optimization

### **Default Font Size**

Ensure 16px base font (prevents zoom on iOS):

```css
html {
  font-size: 16px; /* Keep at 16px for iOS */
}
```

### **Viewport Meta Tag**

Already included but verify:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### **Touch Target Size**

All buttons should be 44px minimum:

```css
button, a[role="button"] {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 20px; /* meets 44px requirement */
}
```

### **Safe Area Padding**

Already implemented with `safe-pb` class for notched devices.

---

## 🌐 Network Optimization

### **HTTP2/3 Support**

Verify with your hosting provider (Vercel, Netlify support by default).

### **Brotli Compression**

```typescript
// vite.config.ts
import compression from 'vite-plugin-compression';

export default {
  plugins: [
    compression({
      algorithm: 'brotli',
      ext: '.br',
    }),
  ],
}
```

### **Resource Hints**

```html
<!-- In index.html -->
<!-- DNS prefetch -->
<link rel="dns-prefetch" href="https://api.manas360.com">

<!-- Preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com">

<!-- Prefetch -->
<link rel="prefetch" href="/assessment">

<!-- Preload critical assets -->
<link rel="preload" as="font" href="/fonts/crimson-pro.woff2">
```

---

## ✅ Deployment Checklist

Before production deployment:

- [ ] Run Lighthouse audit (target: 90+)
- [ ] Check Core Web Vitals
- [ ] Test on real mobile devices
- [ ] Verify accessibility (axe DevTools)
- [ ] Test crisis banner on all devices
- [ ] Verify navigation works (tel: link, assessment route)
- [ ] Check SEO meta tags
- [ ] Test 404 and error pages
- [ ] Set up error tracking (Sentry)
- [ ] Enable analytics (Google Analytics)
- [ ] Configure CDN caching headers
- [ ] Set up monitoring and alerting
- [ ] Load test with tools like k6 or Artillery

---

## 📈 Monitoring in Production

### **Google Analytics 4**

```bash
npm install react-ga4
```

```jsx
// In App.tsx or main.tsx
import ReactGA from "react-ga4";

ReactGA.initialize("G-XXXXXXXXXX");
ReactGA.send({
  hitType: "pageview",
  page: "/",
  title: "MANAS360",
});
```

### **Error Tracking (Sentry)**

```bash
npm install @sentry/react @sentry/tracing
```

```jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://key@sentry.io/projectid",
  integrations: [
    new Sentry.Replay(),
    new Sentry.Profiler(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### **Real User Monitoring**

```jsx
import { useEffect } from 'react';

export const usePerformanceMetrics = () => {
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('Performance:', entry);
          // Send to analytics
        }
      });

      observer.observe({
        entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'],
      });
    }
  }, []);
};
```

---

## 🔍 Performance Testing

### **Lighthouse CI**

```yaml
# lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["https://manas360.com"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### **k6 Load Testing**

```bash
npm install -g k6

# Create script.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m30s', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  let res = http.get('https://manas360.com');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'page renders quickly': (r) => r.timings.duration < 2000,
  });
}

# Run test
k6 run script.js
```

---

## 📝 Continuous Optimization

### **Monthly Tasks**

- [ ] Review Lighthouse scores
- [ ] Check Core Web Vitals trends
- [ ] Update dependencies
- [ ] Review error logs
- [ ] Analyze user feedback
- [ ] Test on latest devices

### **Quarterly Tasks**

- [ ] Full performance audit
- [ ] SEO audit
- [ ] Accessibility audit
- [ ] Security scan
- [ ] Load testing
- [ ] Competitive analysis

---

## 🎯 Performance Goals by Metric

| Metric | Target | Current |
|--------|--------|---------|
| LCP | < 2.5s | - |
| FID | < 100ms | - |
| CLS | < 0.1 | - |
| Lighthouse | 90+ | - |
| Bundle (gzipped) | < 100KB | - |
| First Paint | < 1s | - |
| TTI | < 3s | - |

---

**Remember: Performance is a feature, not a luxury. Small improvements compound over time!** ⚡

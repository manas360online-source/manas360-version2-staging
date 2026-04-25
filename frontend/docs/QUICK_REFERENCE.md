# MANAS360 Landing Page - Developer Quick Reference

**Print this guide or keep open while developing!**

---

## 🚀 Get Started in 3 Steps

```bash
# 1. Install dependencies
npm install react-router-dom react-helmet-async

# 2. Copy files to your project
cp -r src/components/LandingPage frontend/src/components/
cp src/pages/LandingPage.tsx frontend/src/pages/
cp tailwind.config.ts frontend/
cp src/index.css frontend/src/

# 3. Start development
npm run dev
```

---

## 📁 File Locations

```
src/
├── pages/LandingPage.tsx                     # Main page
└── components/LandingPage/
    ├── Header.tsx
    ├── HeroSection.tsx
    ├── TrustBar.tsx
    ├── HowItWorks.tsx
    ├── Testimonial.tsx
    ├── CtaSection.tsx
    ├── BackgroundParticles.tsx
    ├── CrisisBanner.tsx
    └── index.ts

Config:
├── tailwind.config.ts                        # Colors, animations
├── src/index.css                             # Fonts, root styles
```

---

## 🎨 Color Reference

```css
--calm-sage: #A8B5A0;           /* Primary */
--soft-lavender: #C4B5D9;       /* Secondary */
--warm-terracotta: #D4A89E;     /* Tertiary */
--gentle-blue: #9DADBE;         /* Accent */
--cream: #F5F3EE;               /* Background */
--charcoal: #2C3333;            /* Text */
--accent-coral: #E88B7A;        /* Crisis */
```

## 🔤 Font Usage

```css
/* Headlines */
<h1 className="font-serif font-light text-5xl">

/* Body text */
<p className="font-sans font-normal text-base">

/* Bold text */
<span className="font-semibold">
```

---

## 🎯 Common Tailwind Classes

```jsx
/* Spacing */
p-4, py-8, px-6, gap-4

/* Sizing */
w-full, h-auto, max-w-4xl

/* Typography */
text-lg, font-semibold, text-charcoal, opacity-70

/* Colors */
bg-calm-sage, text-gentle-blue, border-cream

/* Responsive */
md:text-lg, lg:px-8, sm:gap-2

/* Animations */
animate-breathe, animate-fade-in, animate-float

/* Effects */
rounded-3xl, shadow-soft-lg, glass, backdrop-blur-md
```

---

## 🔧 Common Customizations

### Change Headline Text
```jsx
// In LandingPage.tsx
<h1>Your new headline</h1>
```

### Change Button Color
```jsx
// In HeroSection.tsx
className="bg-calm-sage hover:bg-gentle-blue"
```

### Add New Section
```jsx
// 1. Create: src/components/LandingPage/NewSection.tsx
export const NewSection: React.FC = () => (
  <section>Content</section>
);

// 2. Export from: src/components/LandingPage/index.ts
export { NewSection }

// 3. Import in: src/pages/LandingPage.tsx
import { NewSection } from './';

// 4. Add to page:
<NewSection />
```

### Change Crisis Number
```jsx
// In CrisisBanner.tsx
const crisisNumber = '1800-599-0019';
```

### Modify Testimonial
```jsx
// In LandingPage.tsx
<Testimonial
  quote="Your quote here"
  author="Name"
  location="City"
/>
```

---

## 🎬 Animation Classes

```css
/* Built-in animations */
animate-breathe      /* 6s breathing effect */
animate-float        /* 20s floating effect */
animate-fade-in      /* Fade in 1s */
animate-fade-in-up   /* Slide up and fade 1s */
animate-fade-in-down /* Slide down and fade 1s */

/* Custom utilities */
transition-smooth    /* 300ms all ease */
transition-smooth-lg /* 500ms all ease */
```

---

## ♿ Accessibility Checklist

- [ ] All buttons have `aria-label`
- [ ] Semantic HTML used (`<section>`, `<header>`, `<main>`)
- [ ] Color contrast checked (4.5:1 minimum)
- [ ] Keyboard navigation tested
- [ ] Screen reader tested
- [ ] Focus visible on all interactive elements
- [ ] Alt text on images

```jsx
// Template
<button
  aria-label="Descriptive label"
  className="focus-ring rounded px-4"
>
  Click me
</button>
```

---

## 🔍 Testing Checklist

```bash
# Type checking
tsc --noEmit

# Build production
npm run build

# Check bundle size
npm run build --analyze

# Test on mobile
npm run dev
# Then open on mobile device or use DevTools

# Lighthouse audit
lighthouse http://localhost:5173

# Accessibility
# Open in browser, run: axe DevTools browser extension
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Animations not working | Check `prefers-reduced-motion` in browser settings |
| Colors look wrong | Verify `tailwind.config.ts` colors extended |
| Text not visible | Check contrast, might be opacity issue |
| Layout broken on mobile | Check responsive classes (sm:, md:) |
| Button not navigating | Verify React Router route exists |
| Crisis banner cut off | Check `safe-pb` class and bottom padding |

---

## 📱 Responsive Breakpoints

```jsx
/* Mobile first approach */
<div className="text-sm md:text-base lg:text-lg">
  Responsive text sizing
</div>

/* Common breakpoints */
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

---

## 🚀 Deployment Quick Commands

### Vercel
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### Docker
```bash
docker build -t manas360-landing .
docker run -p 80:80 manas360-landing
```

---

## 📊 Performance Tips

1. **Images**: Always use `loading="lazy"` and `alt` text
2. **Animations**: Use `transform` and `opacity` only
3. **CSS**: TailwindCSS auto-purges unused styles
4. **JavaScript**: Lazy load heavy components
5. **Fonts**: Already preloaded, use Google Fonts

---

## 🔗 Important URLs

```
Homepage:    http://localhost:5173
Assessment:  http://localhost:5173/assessment
Lighthouse: https://developers.google.com/speed/pagespeed/insights
Colors:      https://manas360.design/colors
Typography: https://fonts.google.com (DM Sans, Crimson Pro)
```

---

## 📚 Documentation Map

| Document | Use When |
|----------|----------|
| **README.md** | Need overview of project |
| **LANDING_PAGE_SETUP.md** | Integrating into project |
| **PRODUCTION_OPTIMIZATION.md** | Deploying to production |
| **ADVANCED_ANIMATIONS.md** | Adding Framer Motion |
| **DELIVERY_SUMMARY.md** | Want full feature list |
| **This file** | Need quick lookup |

---

## 💸 Bundle Size

```
React:           40KB
React Router:    10KB
React Helmet:    5KB
TailwindCSS:     30KB (already in project)
──────────────────
Total:           ~85KB (gzipped ~30KB)
```

---

## 🎯 Component Props

### HeroSection
```typescript
// No props, uses hardcoded content
<HeroSection />
```

### TrustBar
```typescript
// No props, displays 4 items
<TrustBar />
```

### HowItWorks
```typescript
// No props, displays 3 steps
<HowItWorks />
```

### Testimonial
```typescript
interface TestimonialProps {
  quote?: string;
  author?: string;
  location?: string;
}
<Testimonial
  quote="My quote"
  author="Name"
  location="City"
/>
```

### CrisisBanner
```typescript
// No props, uses hardcoded number
<CrisisBanner />
```

---

## 🎨 Customization Examples

### Change Primary Color
```typescript
// In tailwind.config.ts
colors: {
  'calm-sage': '#NEW_HEX'
}
```

### Add Custom Font
```css
/* In index.css */
@import url('https://fonts.googleapis.com/css2?family=YourFont');

/* In tailwind.config.ts */
fontFamily: {
  serif: ['Your Font', 'serif']
}
```

### Modify Hero Text
```jsx
// In HeroSection.tsx
<h1>Your custom headline</h1>
```

---

## 🔐 Security Reminders

- ✅ No API keys in frontend code
- ✅ Use environment variables for secrets
- ✅ Validate all user input
- ✅ Use HTTPS in production
- ✅ CSP headers configured on server

---

## 🎓 Learning Resources

- [React Docs](https://react.dev)
- [TailwindCSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [Web Accessibility](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Vitals](https://web.dev/vitals/)

---

## 🔄 Common Workflows

### Add New Step to HowItWorks
```jsx
// Edit HowItWorks.tsx steps array
const steps: Step[] = [
  { number: 1, title: '...', description: '...' },
  { number: 2, title: '...', description: '...' },
  { number: 3, title: '...', description: '...' },
  // ADD HERE:
  { number: 4, title: 'New Step', description: 'Description' },
];
```

### Change Colors Globally
```typescript
// tailwind.config.ts colors object
colors: {
  'calm-sage': '#NEW',
  'soft-lavender': '#NEW',
  // ... update all
}
```

### Make Component Full Width
```jsx
// Add to parent container
<div className="w-full max-w-none">
  {/* Content spans full screen */}
</div>
```

---

## ✅ Pre-Launch Checklist

- [ ] All text finalized
- [ ] Colors verified
- [ ] Images optimized
- [ ] Crisis number correct
- [ ] Assessment route exists
- [ ] Lighthouse score 90+
- [ ] Mobile tested
- [ ] Accessibility checked
- [ ] SEO meta tags present
- [ ] Analytics configured

---

## 📞 Quick Troubleshooting

**Styles not applying?**
```bash
# Restart dev server
npm run dev
```

**Components not importing?**
```bash
# Check imports in index.ts
# Verify TypeScript compilation: tsc
```

**Build failing?**
```bash
# Clear cache and rebuild
rm -rf dist/ node_modules/
npm install
npm run build
```

---

## 🎁 Pro Tips

1. Use `npm run build --analyze` to see what's in bundle
2. Use DevTools Lighthouse for performance metrics
3. Use `prefers-reduced-motion` media query for accessibility
4. Keep animations under 3 seconds for best UX
5. Test on real devices, not just browser emulation

---

**Bookmark this page for quick reference!** 🔖

Print-friendly: [Right-click → Print](javascript:window.print())

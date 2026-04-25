# Advanced Animations Guide - Framer Motion Integration

## 🎬 Overview

This guide covers optional advanced animation patterns using **Framer Motion** to enhance the MANAS360 landing page with sophisticated, performant animations.

**Decision**: Framer Motion is **optional**. The current TailwindCSS animations provide excellent UX. Use Framer Motion only if you need:
- Complex sequenced animations
- Gesture-based interactions (swipe, drag)
- Advanced morphing and layout animations
- Stagger effects across multiple elements

---

## 📦 Installation

```bash
npm install framer-motion

# For TypeScript support
npm install --save-dev @types/framer-motion
```

---

## 🎯 Animation Opportunities

### 1. **Staggered Children Animations**

Current: Elements fade in individually with CSS delays
Enhanced: Smooth orchestrated animations with Framer Motion

```jsx
// Before: CSS-based
// After: Framer Motion

import { motion } from 'framer-motion';

export const HowItWorks = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
    >
      {steps.map((step) => (
        <motion.div key={step.id} variants={itemVariants}>
          {/* Content */}
        </motion.div>
      ))}
    </motion.div>
  );
};
```

### 2. **Scroll-Triggered Animations**

```jsx
import { useScroll, useTransform, motion } from 'framer-motion';

export const ScrollParallax = () => {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);

  return (
    <motion.div style={{ opacity, scale }}>
      {/* Content that responds to scroll */}
    </motion.div>
  );
};
```

### 3. **Gesture-Based Animations**

```jsx
import { motion } from 'framer-motion';

export const InteractiveButton = () => {
  return (
    <motion.button
      whileHover={{
        scale: 1.05,
        boxShadow: '0 15px 50px rgba(168, 181, 160, 0.4)',
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      Start Assessment
    </motion.button>
  );
};
```

### 4. **Page Transition Animations**

```jsx
// Create exit animations when navigating
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const LandingPageWithTransition = () => {
  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {/* Content */}
    </motion.main>
  );
};

// In App.tsx
export const App = () => (
  <AnimatePresence mode="wait">
    <Routes>
      <Route path="/" element={<LandingPageWithTransition />} />
    </Routes>
  </AnimatePresence>
);
```

---

## 🌊 Enhanced Component Examples

### **Animated Hero Section**

```jsx
import { motion } from 'framer-motion';

const headlineVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.23, 1, 0.320, 1], // Custom easing
    },
  }),
};

export const AnimatedHeroSection = () => {
  const words = ["You're", "not alone", "Let's take", "this together"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Animated headline */}
      <motion.h1 className="text-5xl font-serif">
        {words.map((word, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={headlineVariants}
            initial="hidden"
            animate="visible"
          >
            {word}{' '}
          </motion.span>
        ))}
      </motion.h1>

      {/* Animated CTA with hover effect */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        Start Assessment
      </motion.button>
    </motion.div>
  );
};
```

### **Animated Trust Bar**

```jsx
import { motion } from 'framer-motion';

const trustItemVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5 },
  },
  hover: {
    y: -5,
    transition: { duration: 0.2 },
  },
};

export const AnimatedTrustBar = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {trustItems.map((item) => (
        <motion.div
          key={item.id}
          variants={trustItemVariants}
          whileHover="hover"
        >
          {/* Trust item content */}
        </motion.div>
      ))}
    </motion.div>
  );
};
```

### **Animated Steps Counter**

```jsx
import { motion } from 'framer-motion';

const circleVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

const countVariants = {
  initial: { scale: 0.5, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      delay: 0.2,
      duration: 0.4,
    },
  },
};

export const AnimatedStepNumber = ({ number }) => {
  return (
    <div className="flex justify-center">
      <motion.div
        className="w-16 h-16 bg-gradient-calm rounded-full flex items-center justify-center"
        variants={circleVariants}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
      >
        <motion.div
          className="text-white text-2xl font-semibold"
          variants={countVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {number}
        </motion.div>
      </motion.div>
    </div>
  );
};
```

### **Animated Particles Background**

```jsx
import { motion } from 'framer-motion';

const particleVariants = {
  animate: (custom) => ({
    y: [0, -100, -50, 0],
    x: [0, 50, -30, 0],
    opacity: [0.2, 0.5, 0.3, 0.2],
    transition: {
      duration: 20 + custom * 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  }),
};

export const AnimatedParticlesBackgroundFM = () => {
  return (
    <div className="fixed inset-0 pointer-events-none">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-calm-sage rounded-full"
          custom={i}
          animate="animate"
          variants={particleVariants}
          style={{
            left: positions[i]?.left,
            top: positions[i]?.top,
          }}
        />
      ))}
    </div>
  );
};
```

---

## 🎨 Advanced Animation Patterns

### **1. Shared Layout Animation**

Animate elements that change layout with smooth transitions:

```jsx
import { motion, layoutId } from 'framer-motion';

export const LayoutAnimationExample = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      onClick={() => setIsExpanded(!isExpanded)}
      className="cursor-pointer"
    >
      <motion.div layoutId="highlight" className="bg-calm-sage" />
      {isExpanded && (
        <motion.div
          layoutId="expandedContent"
          className="expanded-content"
        >
          {/* Smooth expansion animation */}
        </motion.div>
      )}
    </motion.div>
  );
};
```

### **2. SVG Path Animations**

Animate SVG paths for custom shapes:

```jsx
import { motion, SVG } from 'framer-motion';

export const AnimatedSVG = () => {
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 2, ease: 'easeInOut' },
    },
  };

  return (
    <motion.svg width="200" height="200">
      <motion.path
        d="M50 50 L150 150"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        variants={pathVariants}
        initial="hidden"
        animate="visible"
      />
    </motion.svg>
  );
};
```

### **3. Scroll-Based Progress Bar**

```jsx
import { useScroll, useTransform, motion } from 'framer-motion';

export const ScrollProgressBar = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      style={{ scaleX, transformOrigin: '0%' }}
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-calm"
    />
  );
};
```

---

## ⚡ Performance Considerations

### **GPU Acceleration**

Framer Motion automatically uses GPU acceleration for:
- `transform` (translate, rotate, scale)
- `opacity`
- `filter`

```jsx
// ✅ GPU accelerated (use these)
<motion.div
  animate={{
    x: 100,           // translateX
    y: 100,           // translateY
    opacity: 0.5,
    filter: 'blur(5px)',
  }}
/>

// ❌ Avoid (causes repaints)
<motion.div
  animate={{
    width: 200,       // Layout change
    height: 200,      // Layout change
    left: 100,        // Position change
  }}
/>
```

### **Optimize for Mobile**

```jsx
import { useMediaQuery } from './hooks/useMediaQuery';

export const OptimizedAnimation = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <motion.div
      animate={{
        x: isMobile ? 10 : 20, // Smaller movement on mobile
      }}
      transition={{
        duration: isMobile ? 0.2 : 0.5, // Shorter duration on mobile
      }}
    >
      {/* Content */}
    </motion.div>
  );
};
```

### **Reducing Motion on Preference**

```jsx
import { useReducedMotionPreference } from './hooks/useReducedMotionPreference';

export const AccessibleAnimation = () => {
  const prefersReducedMotion = useReducedMotionPreference();

  return (
    <motion.div
      animate={{
        opacity: 1,
        y: prefersReducedMotion ? 0 : 20,
      }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.5,
      }}
    >
      {/* Content */}
    </motion.div>
  );
};
```

---

## 🧪 Animation Testing

### **Test Animation Frame Rate**

```jsx
// In development
useEffect(() => {
  let lastTime = performance.now();
  let frames = 0;

  const checkFPS = () => {
    const now = performance.now();
    frames++;

    if (now - lastTime >= 1000) {
      console.log('FPS:', frames);
      frames = 0;
      lastTime = now;
    }

    requestAnimationFrame(checkFPS);
  };

  requestAnimationFrame(checkFPS);
}, []);
```

### **Test on Throttled Devices**

```bash
# Chrome DevTools
# 1. Open DevTools
# 2. Rendering tab
# 3. Rendering settings
# 4. Slow down animations (4x)
# 5. Check for jank
```

---

## 📊 Animation Complexity Matrix

| Animation | Complexity | Performance | Recommendation |
|-----------|-----------|-------------|-----------------|
| CSS transitions | Low | Excellent | Use for simple effects |
| Tailwind animations | Low | Excellent | Current approach |
| Framer Motion (transforms) | Medium | Excellent | Optional upgrade |
| Framer Motion (layout) | High | Good | Use sparingly |
| Gesture animations | Medium | Good | For interactive elements |
| SVG path animations | High | Fair | Complex animations only |

---

## 🚀 When to Use Framer Motion

### **Use Framer Motion when you need:**

✅ Complex orchestrated animations across multiple elements
✅ Gesture-based interactions (swipe, drag, hover effects)
✅ Page transition animations
✅ Advanced scroll-triggered animations
✅ Shared layout animations between elements
✅ Animated state transitions

### **Skip Framer Motion if:**

❌ Simple fade-in/slide animations (use CSS)
❌ Reducing bundle size is critical
❌ Team not familiar with motion libraries
❌ Animation is non-critical to core UX

---

## 📦 Bundle Size Impact

```bash
# Without Framer Motion
gzip size: 45KB

# With Framer Motion
gzip size: 65KB (+20KB)

# Verdict: Only add if advanced animations justify 20KB increase
```

---

## 🎓 Learning Resources

- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Animation Principles](https://www.framer.com/courses/animation/)
- [Performance Guide](https://www.framer.com/docs/guide-reduce-bundle-size/)
- [Common Patterns](https://www.framer.com/docs/examples/)

---

## 💡 Recommendation

### **For MANAS360 v1.0:**

✅ **Stick with TailwindCSS animations**:
- Excellent performance
- Fast load times
- Sufficient for professional UX
- Lower bundle size
- Easier to maintain

### **For MANAS360 v2.0+:**

Consider Framer Motion if:
- Gesture interactions become important
- Page transitions need polish
- More interactive features added
- Bundle size budget allows

---

**Current animations are production-ready and performant. Framer Motion is an optional enhancement for future iterations.** 🚀

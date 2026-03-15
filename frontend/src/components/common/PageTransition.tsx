import { ReactNode } from 'react';
import { motion, Variants } from 'framer-motion';

/**
 * PageTransition Component
 * 
 * Wraps page content to provide consistent, professional entry motion.
 * Uses a subtle "Slide-up + Fade" effect with a smooth easing curve.
 * 
 * Features:
 * - Unified timing across all pages (no inconsistent animations)
 * - Smooth "Out-Expo" easing for a premium feel
 * - Optional staggered children animation for card-based layouts
 * - Accessible and doesn't interfere with form inputs or interactions
 * 
 * Usage:
 * <PageTransition>
 *   <main>Your page content</main>
 * </PageTransition>
 * 
 * Or with staggered children:
 * <PageTransition stagger>
 *   <Card />
 *   <Card />
 *   <Card />
 * </PageTransition>
 */

interface PageTransitionProps {
  children: ReactNode;
  stagger?: boolean;
  duration?: number;
  delay?: number;
}

/**
 * Cubic-Bezier easing that creates a smooth "Out-Expo" feel
 * Using Framer Motion's easing presets
 */
const EASING = 'easeOut'; // Smooth deceleration

/**
 * Container variants for the page wrapper
 */
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10, // Subtle upward slide
  },
  enter: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -10, // Slight downward slide on exit
  },
};

/**
 * Container variants for staggered children animation
 */
const containerVariants: Variants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // 50ms delay between children
      delayChildren: 0.1, // Initial delay before first child
    },
  },
};

/**
 * Individual child variants for staggered animation
 */
const childVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: EASING,
    },
  },
};

export function PageTransition({
  children,
  stagger = false,
  duration = 0.2,
  delay = 0,
}: PageTransitionProps) {
  const variants = stagger ? containerVariants : pageVariants;

  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={variants}
      transition={{
        duration,
        ease: EASING,
        delay,
      }}
      className="w-full"
    >
      {stagger ? (
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="enter"
          className="space-y-6"
        >
          {/* If children is an array, wrap each in a child motion.div */}
          {Array.isArray(children) ? (
            children.map((child, index) => (
              <motion.div
                key={index}
                variants={childVariants}
              >
                {child}
              </motion.div>
            ))
          ) : (
            children
          )}
        </motion.div>
      ) : (
        children
      )}
    </motion.div>
  );
}

export default PageTransition;

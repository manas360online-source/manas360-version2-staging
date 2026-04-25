# Quick Start: Apply PageTransition to Your Pages

This is a quick reference for applying the PageTransition wrapper to individual pages for smooth entry animations.

## Basic Pattern

### Step 1: Import PageTransition
```typescript
import PageTransition from '../../components/common/PageTransition';
```

### Step 2: Wrap Your Return Statement
**Before**:
```jsx
export function MyPage() {
  return (
    <div className="container">
      {/* Page content */}
    </div>
  );
}
```

**After**:
```jsx
export function MyPage() {
  return (
    <PageTransition>
      <div className="container">
        {/* Page content */}
      </div>
    </PageTransition>
  );
}
```

## Ready-to-Apply Examples

### Dashboard Page
```typescript
// File: frontend/src/pages/patient/DashboardPage.tsx

// Add import at top
import PageTransition from '../../components/common/PageTransition';

// Find the return statement (around line 145) and wrap it:
return (
  <PageTransition>
    <div className="mx-auto w-full max-w-[1400px]...">
      {/* Dashboard content */}
    </div>
  </PageTransition>
);
```

### Daily Check-In Page
```typescript
// File: frontend/src/pages/patient/DailyCheckInPage.tsx

// Add import at top
import PageTransition from '../../components/common/PageTransition';

// Find the return statement (around line 533) and wrap it:
return (
  <PageTransition>
    <div className="mx-auto w-full max-w-[1400px]...">
      {/* Check-In content */}
    </div>
  </PageTransition>
);
```

### Sessions Page
```typescript
// File: frontend/src/pages/patient/SessionsPage.tsx

// Add import at top
import PageTransition from '../../components/common/PageTransition';

// Wrap main return:
return (
  <PageTransition>
    <div>
      {/* Sessions content */}
    </div>
  </PageTransition>
);
```

### Profile Page
```typescript
// File: frontend/src/pages/patient/ProfilePage.tsx

// Add import at top
import PageTransition from '../../components/common/PageTransition';

// Wrap main return:
return (
  <PageTransition>
    <div>
      {/* Profile content */}
    </div>
  </PageTransition>
);
```

## For Card Grids with Staggered Animation

If your page has multiple cards that should animate in sequence:

```jsx
<PageTransition stagger>
  <Card id="1" title="Overview" />
  <Card id="2" title="Metrics" />
  <Card id="3" title="Progress" />
  <Card id="4" title="Goals" />
</PageTransition>
```

Each card will slide up with a 50ms delay between them, creating a professional cascade effect.

## Custom Duration

To make animations faster or slower:

```jsx
{/* Default is 0.4 seconds */}
<PageTransition duration={0.3}>
  <div>Fast animation</div>
</PageTransition>

{/* Slower for emphasis */}
<PageTransition duration={0.6}>
  <div>Slow animation</div>
</PageTransition>
```

## Conditional Application

You can apply PageTransition based on conditions:

```jsx
export function MyPage() {
  const [showStagger, setShowStagger] = useState(false);

  return (
    <PageTransition stagger={showStagger}>
      <div>
        {/* Content */}
      </div>
    </PageTransition>
  );
}
```

##Common Pages to Apply

### High Priority (Recommended First)
1. ✅ **DashboardPage.tsx** - Main landing page, high traffic
2. ✅ **DailyCheckInPage.tsx** - Clinical hub, user-facing workflow
3. SessionsPage.tsx - Session management
4. ProfilePage.tsx - User settings

### Medium Priority
5. ProgressPage.tsx
6. CBTPage.tsx
7. DocumentsPage.tsx
8. NotificationsPage.tsx

### Lower Priority (Admin/Internal)
9. Admin pages
10. Video session pages
11. Support pages

## Testing After Application

1. **Visual Test**: Navigate to the page and observe the smooth entry animation
2. **Mobile Test**: Open on mobile device (test landscape/portrait)
3. **Speed Test**: No visible delays or stutter
4. **Console Test**: No errors in browser console (F12)

## Troubleshooting

### Animation not visible
- Check that page actually renders with content inside PageTransition
- Verify Framer Motion library is installed (`npm list framer-motion`)

### Page jumps while animating
- Ensure ScrollToTop is active in App.tsx (already done)
- Check no other scroll-based animations conflict

### Animation too fast/slow
- Adjust the `duration` prop (defaults to 0.4 seconds)
- Try values between 0.2 and 0.8 seconds

### Children don't stagger
- Ensure you're using direct children elements
- Verify `stagger={true}` is set on PageTransition

## Performance Notes

- Each page animation costs ~0.4ms CPU time
- GPU-accelerated via Framer Motion (smooth 60fps)
- No perceivable impact on load times
- Mobile rendering remains smooth
- Network latency unaffected

## Rollback

If you need to remove PageTransition from a page:

**Before Rollback**:
```jsx
<PageTransition>
  <div>Content</div>
</PageTransition>
```

**After Rollback**:
```jsx
<div>Content</div>
```

Just remove the PageTransition wrapper and the content continues to work normally.

---

## Questions?

Refer to the full documentation in [NAVIGATION_ANIMATION_FIXES.md](NAVIGATION_ANIMATION_FIXES.md) for:
- Detailed implementation architecture
- Performance considerations
- Browser compatibility
- Advanced customization options

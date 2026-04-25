# RBAC Middleware Usage Examples

## Quick Start

### Single Role Protection
```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { adminGetUsers } from '../controllers/admin.controller';

const router = Router();

// Only admin users can access
router.get('/admin/users', 
  requireAuth,
  requireRole('admin'),
  adminGetUsers
);
```

### Multiple Roles Protection
```typescript
// Admin or superadmin can access
router.get('/system/settings',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  getSystemSettings
);
```

### Backward Compatibility
```typescript
import { requireAdminRole } from '../middleware/rbac.middleware';

// Old code still works (deprecated)
router.get('/admin/users',
  requireAuth,
  requireAdminRole,
  adminGetUsers
);
```

---

## Complete Route Setup Examples

### Admin Routes
```typescript
// backend/src/routes/admin.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole, requireMinimumRole } from '../middleware/rbac.middleware';
import { validateAdminInputs } from '../middleware/validate.middleware';
import * as adminController from '../controllers/admin.controller';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

/**
 * Admin-only endpoints
 */

// List all users
router.get(
  '/users',
  requireAuth,
  requireRole('admin'),
  validateAdminInputs,
  asyncHandler(adminController.adminGetUsers)
);

// Get specific user
router.get(
  '/users/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(adminController.adminGetUser)
);

// Verify therapist
router.patch(
  '/therapists/:id/verify',
  requireAuth,
  requireRole('admin'),
  validateAdminInputs,
  asyncHandler(adminController.verifyTherapist)
);

// Get analytics
router.get(
  '/metrics',
  requireAuth,
  requireRole('admin'),
  asyncHandler(adminController.getMetrics)
);

// List subscriptions
router.get(
  '/subscriptions',
  requireAuth,
  requireRole('admin'),
  validateAdminInputs,
  asyncHandler(adminController.getSubscriptions)
);

/**
 * Admin and superadmin endpoints
 */

// System settings (admin level or higher)
router.get(
  '/settings',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  asyncHandler(adminController.getSettings)
);

// Update settings (superadmin only)
router.patch(
  '/settings',
  requireAuth,
  requireRole('superadmin'),
  asyncHandler(adminController.updateSettings)
);

/**
 * Minimum role endpoints
 */

// Therapist and above can view analytics
router.get(
  '/analytics/therapist',
  requireAuth,
  requireMinimumRole('therapist'),
  asyncHandler(adminController.getTherapistAnalytics)
);

export default router;
```

### Therapist Routes
```typescript
// backend/src/routes/therapist.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import * as therapistController from '../controllers/therapist.controller';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// Only therapists can access these endpoints
router.get(
  '/profile',
  requireAuth,
  requireRole('therapist'),
  asyncHandler(therapistController.getProfile)
);

router.patch(
  '/profile',
  requireAuth,
  requireRole('therapist'),
  asyncHandler(therapistController.updateProfile)
);

router.get(
  '/sessions',
  requireAuth,
  requireRole('therapist'),
  asyncHandler(therapistController.getSessions)
);

router.get(
  '/earnings',
  requireAuth,
  requireRole('therapist'),
  asyncHandler(therapistController.getEarnings)
);

export default router;
```

### Patient Routes
```typescript
// backend/src/routes/patient.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import * as patientController from '../controllers/patient.controller';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// Only patients can access these endpoints
router.get(
  '/profile',
  requireAuth,
  requireRole('patient'),
  asyncHandler(patientController.getProfile)
);

router.post(
  '/sessions/book',
  requireAuth,
  requireRole('patient'),
  asyncHandler(patientController.bookSession)
);

router.get(
  '/sessions',
  requireAuth,
  requireRole('patient'),
  asyncHandler(patientController.getSessionHistory)
);

export default router;
```

---

## Cross-Role Scenarios

### Admin Proxy Access
```typescript
// Allow admin to view any user's profile
router.get(
  '/users/:id/profile',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  asyncHandler(async (req, res) => {
    // Admin can access any user's data
    const profile = await getUserProfile(req.params.id);
    res.json(profile);
  })
);
```

### Self-Access Pattern
```typescript
import { requireRole } from '../middleware/rbac.middleware';

// Allow any authenticated user to access their own profile
router.get(
  '/profile',
  requireAuth,
  // No role check - any authenticated user
  asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const profile = await getUserProfile(userId);
    res.json(profile);
  })
);

// But only therapists can update their profile
router.patch(
  '/profile',
  requireAuth,
  requireRole('therapist'),
  asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const updated = await updateTherapistProfile(userId, req.body);
    res.json(updated);
  })
);
```

---

## Controller Implementation with Role Access

```typescript
// backend/src/controllers/admin.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';

/**
 * Safely access authenticated user info
 * Role already validated by middleware
 */
export const adminGetUsers = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  // Role is guaranteed to be 'admin' at this point
  const userRole = req.auth?.role; // 'admin'
  const userId = req.auth?.userId;

  const users = await UserModel.find({})
    .select('-password')
    .lean();

  // Log audit trail
  console.log(`[AUDIT] Admin ${userId} accessed user list at ${new Date().toISOString()}`);

  res.json({
    success: true,
    data: users,
    _meta: {
      accessedBy: userId,
      accessedAt: new Date().toISOString(),
      requiredRole: 'admin'
    }
  });
};

/**
 * Role-aware error handling
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.auth?.userId;

    // Check if trying to delete self
    if (id === adminId) {
      return next(
        new AppError('Cannot delete yourself. Ask another admin to delete your account.', 403)
      );
    }

    const deleted = await UserModel.findByIdAndDelete(id);
    if (!deleted) {
      return next(new AppError('User not found', 404));
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
```

---

## Advanced Patterns

### Hierarchical Access
```typescript
import { requireMinimumRole } from '../middleware/rbac.middleware';

// Any role at therapist level or above
// (therapist, admin, superadmin)
router.get(
  '/advanced-analytics',
  requireAuth,
  requireMinimumRole('therapist'),
  asyncHandler(getAdvancedAnalytics)
);
```

### Role-Based Response Formatting
```typescript
export const getMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userRole = req.auth?.role;
  
  let metricsData;

  switch (userRole) {
    case 'admin':
      // Full metrics with financial data
      metricsData = await getFullMetrics();
      break;
    case 'superadmin':
      // Extended metrics with system health
      metricsData = await getFullMetrics();
      metricsData.systemHealth = await getSystemHealth();
      break;
    default:
      metricsData = await getPublicMetrics();
  }

  res.json({
    success: true,
    data: metricsData,
    _meta: { requestedBy: userRole }
  });
};
```

### Conditional Endpoints
```typescript
// Endpoint available to multiple roles
router.post(
  '/report',
  requireAuth,
  requireRole(['admin', 'therapist', 'patient']),
  asyncHandler(async (req, res) => {
    const userRole = req.auth?.role;
    
    if (userRole === 'admin') {
      // Admin can report any user
      await createReport(req.body.userId, req.body.reason);
    } else {
      // Others can only report issues with the system
      await createSystemReport(req.body.reason);
    }
    
    res.json({ success: true });
  })
);
```

---

## Testing Examples

### Unit Test
```typescript
import { requireRole } from '../middleware/rbac.middleware';
import UserModel from '../models/user.model';

jest.mock('../models/user.model');

describe('requireRole', () => {
  let req: any, res: any, next: jest.Mock;

  beforeEach(() => {
    req = {
      auth: { userId: 'user123' }
    };
    res = {};
    next = jest.fn();
  });

  it('should allow admin access', async () => {
    UserModel.findById.mockResolvedValue({
      _id: 'user123',
      role: 'admin',
      isDeleted: false
    });

    const middleware = requireRole('admin');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.auth.role).toBe('admin');
  });

  it('should reject non-admin access', async () => {
    UserModel.findById.mockResolvedValue({
      _id: 'user123',
      role: 'patient',
      isDeleted: false
    });

    const middleware = requireRole('admin');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403
    }));
  });

  it('should reject deleted users', async () => {
    UserModel.findById.mockResolvedValue({
      _id: 'user123',
      role: 'admin',
      isDeleted: true
    });

    const middleware = requireRole('admin');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 410
    }));
  });

  it('should support multiple roles', async () => {
    UserModel.findById.mockResolvedValue({
      _id: 'user123',
      role: 'superadmin',
      isDeleted: false
    });

    const middleware = requireRole(['admin', 'superadmin']);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.auth.role).toBe('superadmin');
  });
});
```

### Integration Test
```typescript
describe('Admin Routes with RBAC', () => {
  let app: Express;
  let adminToken: string;
  let patientToken: string;

  beforeAll(async () => {
    // Create test users
    const admin = await UserModel.create({
      email: 'admin@test.com',
      password: 'hash',
      role: 'admin'
    });
    
    const patient = await UserModel.create({
      email: 'patient@test.com',
      password: 'hash',
      role: 'patient'
    });

    // Generate tokens
    adminToken = generateToken(admin._id);
    patientToken = generateToken(patient._id);
  });

  it('should allow admin to access /users', async () => {
    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should deny patient access to /users', async () => {
    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Access denied');
  });
});
```

---

## Cache Management

### Clear Cache After Role Update
```typescript
import { clearRoleCache } from '../middleware/rbac.middleware';

export const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId, newRole } = req.body;

    const updated = await UserModel.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true }
    );

    // Invalidate cache so next request gets new role
    clearRoleCache(userId);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};
```

### Clear All Cache on Deployment
```typescript
import { clearRoleCache } from '../middleware/rbac.middleware';

export const postDeploymentSetup = (): void => {
  // Clear role cache after deployment
  // Ensures fresh data from database
  clearRoleCache();
  
  console.log('[DEPLOY] Role cache cleared for fresh startup');
};
```

---

## Response Examples

### Success Response (Admin Access)
```json
{
  "success": true,
  "data": [
    {
      "_id": "user1",
      "email": "patient@example.com",
      "role": "patient",
      "createdAt": "2024-01-01"
    }
  ]
}
```

### Failure Response (Insufficient Role)
```json
{
  "success": false,
  "message": "Access denied. Required role(s): admin. Your role: patient",
  "statusCode": 403
}
```

### Failure Response (Account Deleted)
```json
{
  "success": false,
  "message": "User account is deleted. Please contact support.",
  "statusCode": 410
}
```

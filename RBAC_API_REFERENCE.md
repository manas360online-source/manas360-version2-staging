# RBAC Middleware API Reference

## Table of Contents
1. [Core Functions](#core-functions)
2. [Type Definitions](#type-definitions)
3. [Configuration Objects](#configuration-objects)
4. [Return Values](#return-values)
5. [Error Codes](#error-codes)
6. [Examples](#examples)

---

## Core Functions

### `requireRole(allowedRoles)`

Main middleware factory for role-based access control.

**Signature**:
```typescript
function requireRole(
  allowedRoles: UserRole | UserRole[]
): (req: Request, res: Response, next: NextFunction) => Promise<void>
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| allowedRoles | `UserRole \| UserRole[]` | Yes | Single role or array of allowed roles |

**Returns**: Express middleware function

**Throws**: 
- `Error` if invalid role provided (non-existent role)

**Example**:
```typescript
// Single role
router.get('/admin', 
  requireAuth, 
  requireRole('admin'), 
  controller
);

// Multiple roles
router.get('/system',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  controller
);
```

**Process Flow**:
```
1. Validate allowedRoles at middleware creation
2. Return async middleware function
3. On request:
   a. Extract userId from req.auth.userId
   b. Fetch user role (cache or database)
   c. Validate user exists
   d. Validate account not deleted
   e. Validate role matches
   f. Store role in req.auth.role
   g. Call next() on success
   h. Call next(AppError) on failure
```

**Modifies Request**:
```typescript
req.auth.role = 'admin' // Set to actual user role
```

---

### `requireMinimumRole(minimumRole)`

Hierarchical role-based access control using role levels.

**Signature**:
```typescript
function requireMinimumRole(
  minimumRole: UserRole
): (req: Request, res: Response, next: NextFunction) => Promise<void>
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| minimumRole | `UserRole` | Yes | Minimum role hierarchy required |

**Returns**: Express middleware function

**Role Hierarchy** (ascending):
```
patient (1) < therapist (2) < admin (3) < superadmin (4)
```

**Example**:
```typescript
// Therapist and above (therapist, admin, superadmin)
router.get('/advanced-analytics',
  requireAuth,
  requireMinimumRole('therapist'),
  controller
);
```

**Behavior**:
- Allows users with role at specified level or higher
- Denies users with lower hierarchy roles

---

### `requirePermission(requiredPermissions)`

Permission-based access control (future enhancement).

**Signature**:
```typescript
function requirePermission(
  requiredPermissions: string | string[]
): (req: Request, res: Response, next: NextFunction) => Promise<void>
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| requiredPermissions | `string \| string[]` | Yes | Single permission or array of permissions |

**Returns**: Express middleware function

**Example**:
```typescript
router.post('/report',
  requireAuth,
  requirePermission(['read_profile', 'submit_report']),
  controller
);
```

**Built-in Permission Mapping**:
```typescript
patient: [
  'read_own_profile',
  'book_session',
  'view_therapists'
]

therapist: [
  'read_own_profile',
  'manage_sessions',
  'view_earnings'
]

admin: [
  'read_all_profiles',
  'manage_users',
  'manage_therapists',
  'view_analytics'
]

superadmin: [
  'read_all_profiles',
  'manage_users',
  'manage_therapists',
  'view_analytics',
  'manage_roles',
  'manage_permissions'
]
```

---

### `clearRoleCache(userId?)`

Utility function to invalidate role cache.

**Signature**:
```typescript
function clearRoleCache(userId?: string): void
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | `string` | No | User ID to clear. If omitted, clears entire cache |

**Returns**: `void`

**Example**:
```typescript
// Clear cache for specific user
clearRoleCache('user123');

// Clear entire cache
clearRoleCache();
```

**Use Cases**:
1. After updating user role
2. After deleting user account
3. After deployment
4. When testing cache behavior

---

## Type Definitions

### `UserRole`

```typescript
type UserRole = 'patient' | 'therapist' | 'admin' | 'superadmin'
```

**Description**: Enumerated type of available user roles

**Valid Values**:
- `'patient'` - End user seeking therapy
- `'therapist'` - Mental health professional
- `'admin'` - System administrator
- `'superadmin'` - Super administrator with all permissions

---

### `roleHierarchy`

```typescript
interface RoleHierarchyMap {
  [key in UserRole]: number
}

const roleHierarchy: RoleHierarchyMap = {
  patient: 1,
  therapist: 2,
  admin: 3,
  superadmin: 4
}
```

**Description**: Maps roles to their hierarchy level

**Usage**:
```typescript
const level = roleHierarchy['admin']; // Returns 3
const isHigherRole = roleHierarchy['admin'] > roleHierarchy['therapist']; // true
```

---

### Request Interface Extension

```typescript
interface Request {
  auth?: {
    userId: string;           // From JWT
    sessionId: string;        // From JWT
    jti: string;              // JWT ID
    role?: UserRole;          // Set by RBAC middleware
  };
}
```

**Description**: Express Request object extended with auth data

**Set By**:
- `auth.userId, sessionId, jti` - `requireAuth` middleware
- `auth.role` - `requireRole`, `requireMinimumRole`, `requirePermission` middleware

**Access in Controllers**:
```typescript
const userId = req.auth?.userId;
const role = req.auth?.role;
```

---

## Configuration Objects

### Cache Configuration

```typescript
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const roleCache = new Map<string, CacheEntry>();

interface CacheEntry {
  role: UserRole;
  timestamp: number;
  isDeleted: boolean;
}
```

**Configuration**:
- **TTL**: 5 minutes (300 seconds)
- **Type**: In-memory Map
- **Size**: Unbounded (scales with active users)
- **Invalidation**: Time-based and manual

**Tuning Recommendations**:
```typescript
// High-traffic production (many role changes)
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Development/testing
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// Long-lived use cases (few role changes)
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
```

---

## Return Values

### Middleware Behavior: Success

**When Authorized**:
```typescript
// 1. Store role in request
req.auth.role = userRole;

// 2. Call next middleware
next();

// 3. Controller receives enriched request
export const handler = (req: Request, res: Response) => {
  const role = req.auth.role; // Available in controller
}
```

### Middleware Behavior: Failure

**When Denied**:
```typescript
// Error passed to error middleware
next(new AppError(message, statusCode));

// Error middleware handles response
// Error response sent to client
// Controller NOT executed
```

---

## Error Codes

### 401 Unauthorized

**Status**: Unauthenticated request

**Scenarios**:
- No JWT token provided
- Invalid JWT token
- JWT signature verification failed

**Response**:
```json
{
  "success": false,
  "message": "Authentication required",
  "statusCode": 401
}
```

**Cause**: `requireAuth` middleware

---

### 403 Forbidden

**Status**: Authenticated but insufficient permissions

**Scenarios**:
- User role doesn't match required role
- Insufficient permissions for operation
- Privilege escalation attempt

**Response**:
```json
{
  "success": false,
  "message": "Access denied. Required role(s): admin. Your role: patient",
  "statusCode": 403
}
```

**Cause**: `requireRole`, `requireMinimumRole`, `requirePermission` middleware

---

### 404 Not Found

**Status**: User not found in database

**Scenarios**:
- User ID from JWT doesn't exist
- User deleted (rare edge case)
- Database corruption

**Response**:
```json
{
  "success": false,
  "message": "User not found",
  "statusCode": 404
}
```

**Cause**: `requireRole` middleware

---

### 410 Gone

**Status**: User account has been deleted (soft delete)

**Scenarios**:
- User deleted their account
- Admin deleted user account
- User trying to use old token after deletion

**Response**:
```json
{
  "success": false,
  "message": "User account is deleted. Please contact support.",
  "statusCode": 410
}
```

**Cause**: `requireRole` middleware

---

### 500 Internal Server Error

**Status**: Unexpected error during authorization

**Scenarios**:
- Database connection error
- Unexpected exception in middleware
- System failure

**Response**:
```json
{
  "success": false,
  "message": "Authorization failed",
  "statusCode": 500
}
```

**Cause**: Exception in `requireRole` middleware

---

## Examples

### Example 1: Basic Admin Route

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { getUsers } from '../controllers/admin.controller';

const router = Router();

router.get('/admin/users',
  requireAuth,          // Verify JWT
  requireRole('admin'), // Check admin role
  getUsers              // Execute controller
);

export default router;
```

**Request**:
```bash
GET /admin/users HTTP/1.1
Authorization: Bearer <valid_admin_token>
```

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    { "id": "1", "email": "user@example.com", "role": "patient" }
  ]
}
```

**Failure: Not Admin** (403):
```json
{
  "success": false,
  "message": "Access denied. Required role(s): admin. Your role: patient",
  "statusCode": 403
}
```

---

### Example 2: Multiple Roles

```typescript
router.get('/system-config',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  getSystemConfig
);
```

**Authorization Logic**:
```
✓ admin can access
✓ superadmin can access
✗ therapist cannot access
✗ patient cannot access
```

---

### Example 3: Hierarchical Access

```typescript
router.get('/therapist-analytics',
  requireAuth,
  requireMinimumRole('therapist'),
  getAnalytics
);
```

**Authorization Logic**:
```
Hierarchy Check:
- patient (1) < therapist (2) → ✗ Denied
- therapist (2) >= therapist (2) → ✓ Allowed
- admin (3) >= therapist (2) → ✓ Allowed
- superadmin (4) >= therapist (2) → ✓ Allowed
```

---

### Example 4: Permission-Based Access

```typescript
router.post('/sensitive-report',
  requireAuth,
  requirePermission(['submit_report', 'view_analytics']),
  submitReport
);
```

**Checking Logic**:
```
User role: therapist
User permissions:
  - read_own_profile ✗
  - manage_sessions ✗
  - view_earnings ✗
Required: [submit_report, view_analytics]
Result: ✗ Denied (403)
```

---

### Example 5: Cache Invalidation

```typescript
import { clearRoleCache } from '../middleware/rbac.middleware';
import UserModel from '../models/user.model';

export const updateUserRole = async (req, res, next) => {
  try {
    const { userId, newRole } = req.body;

    // Update role in database
    await UserModel.findByIdAndUpdate(userId, { role: newRole });

    // Invalidate cache immediately
    clearRoleCache(userId);

    res.json({
      success: true,
      message: `User role updated to ${newRole}`
    });
  } catch (error) {
    next(error);
  }
};
```

---

### Example 6: Accessing Role in Controller

```typescript
export const getMetrics = async (req: Request, res: Response) => {
  // Role is available from RBAC middleware
  const userRole = req.auth?.role;
  const userId = req.auth?.userId;

  let data;

  // Customize response based on role
  if (userRole === 'admin') {
    data = await getFullMetrics();
  } else if (userRole === 'therapist') {
    data = await getTherapistMetrics();
  } else {
    data = await getPublicMetrics();
  }

  // Log access
  console.log(`[AUDIT] ${userRole} user ${userId} accessed metrics`);

  res.json({
    success: true,
    data,
    _meta: { accessedBy: userRole }
  });
};
```

---

### Example 7: Route Organization

```typescript
// backend/src/routes/index.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

import adminRoutes from './admin.routes';
import therapistRoutes from './therapist.routes';
import patientRoutes from './patient.routes';
import publicRoutes from './public.routes';

const router = Router();

// Public routes (no auth required)
router.use('/public', publicRoutes);

// Authenticated routes (any authenticated user)
router.use('/', requireAuth, (req, res, next) => {
  // All requests past this point are authenticated
  next();
});

// Role-specific routes
router.use('/admin', requireRole('admin'), adminRoutes);
router.use('/therapist', requireRole('therapist'), therapistRoutes);
router.use('/patient', requireRole('patient'), patientRoutes);

export default router;
```

---

### Example 8: Error Handling

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { AppError } from '../middleware/error.middleware';

const router = Router();

router.get('/sensitive',
  requireAuth,
  requireRole('admin'),
  (req, res, next) => {
    try {
      // Controller logic
      res.json({ success: true });
    } catch (error) {
      // Error middleware handles
      next(error);
    }
  }
);

export default router;
```

---

## Complete API Summary

| Function | Purpose | Parameters | Returns |
|----------|---------|-----------|---------|
| `requireRole(roles)` | Single/multiple role check | `UserRole \| UserRole[]` | Middleware |
| `requireMinimumRole(role)` | Hierarchical role check | `UserRole` | Middleware |
| `requirePermission(perms)` | Permission-based check | `string \| string[]` | Middleware |
| `clearRoleCache(id?)` | Invalidate cache | `string?` | void |

| Error Code | Meaning | When |
|-----------|---------|------|
| 401 | Unauthenticated | No valid JWT token |
| 403 | Forbidden | Role/permission mismatch |
| 404 | User not found | User ID invalid |
| 410 | Account deleted | User deleted |
| 500 | System error | Unexpected failure |

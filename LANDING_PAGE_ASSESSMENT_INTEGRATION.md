# Landing Page Assessment Integration Guide

## Current Behavior

### Private Assessment (from Landing Page)
- Users complete **free-screening assessment** without logging in
- Results stored in `ScreeningAttempt` table with `patientId = NULL`
- Data is public/anonymous
- User gets result but data is NOT linked to account

### Current Routes
- **Public**: `POST /v1/free-screening/start` - No auth required
- **Public**: `POST /v1/free-screening/:attemptId/submit` - No auth required

## Integration Strategy

### Option 1: Automatic Migration (Recommended)
When a user logs in after completing landing assessment:
1. Check if user has any unlinked `ScreeningAttempt` records (patientId = NULL)
2. Prompt: "We found previous assessment results. Would you like to link them to your account?"
3. If yes: Update `patientId` to current user's patient profile ID
4. Result appears in `/patient/assessment-reports`

### Option 2: In-Form Authentication
Modified landing assessment flow:
1. Show "Sign in to save results" option at start
2. If user signs in mid-assessment, link to account
3. Results auto-save as authenticated user

### Option 3: Post-Assessment Linking
1. Complete landing assessment (saves anonymously)
2. Show "Create account to save results" CTA
3. Redirect to signup
4. Link previous assessment after signup confirmation

## Implementation Steps

### Step 1: Backend - Create Migration
```sql
-- Add assessment linking endpoint
-- GET /api/v1/patient/screening/unlinked-attempts
-- Returns: ScreeningAttempt[] with patientId = NULL created in last 7 days

-- POST /api/v1/patient/screening/:attemptId/link
-- Links unlinked ScreeningAttempt to authenticated user
-- Updates: screening_attempts SET patientId = $1 WHERE id = $2
```

### Step 2: Frontend - Detection on Login
In `frontend/src/pages/auth/LoginPage.tsx` after successful login:
```typescript
// After authentication
const unlinkedAssessments = await patientApi.getUnlinkedAssessments();
if (unlinkedAssessments.length > 0) {
  // Show modal with assessment data
  // "Link previous assessments to your account?"
  // Yes -> POST /api/v1/patient/screening/:id/link
}
```

### Step 3: Update Assessment Reports
Modified `AssessmentReportsPage.tsx`:
```typescript
// Include both authenticated AND linked public assessments
const allAssessments = [
  ...authenticatedAssessments,  // FROM PatientAssessment table
  ...linkedFreeScreening,       // FROM ScreeningAttempt with patientId
];
```

## Data Model

### Before Integration
```
ScreeningAttempt {
  id: uuid
  patientId: NULL  ← No user attached
  templateId: uuid
  totalScore: int
  severity: string
  submittedAt: datetime
}
```

### After Integration
```
ScreeningAttempt {
  id: uuid
  patientId: uuid  ← User's PatientProfile linked
  templateId: uuid
  totalScore: int
  severity: string
  submittedAt: datetime
}
```

## Responsive Display in Assessment History

The `AssessmentReportsPage` should display:
1. **Authenticated Assessments** (Quick, Daily, Clinical)
   - Source: `PatientAssessment` table
   - User's logged-in assessments

2. **Linked Public Assessments** (Free-Screening)
   - Source: `ScreeningAttempt` with `patientId` set
   - Previously anonymous assessments now linked

## Filtering & Analytics

### Filter Options (Updated)
- **All**: Shows both authenticated + linked assessments
- **Quick Mental Check**: Authenticated only
- **Clinical**: Authenticated + Linked (if it was PHQ-9/GAD-7/etc)
- **Daily**: Authenticated only  
- **Free Screening**: Linked public assessments only

### Trend Analysis
- Includes linked assessments in trend calculation
- Shows complete historical picture
- Score comparison across both types

## UI/UX Improvements

### Post-Login Modal
```
┌─────────────────────────────────────────┐
│ Welcome Back!                            │
├─────────────────────────────────────────┤
│ We found 2 previous assessments you     │
│ completed before signing up.             │
│                                          │
│ Quick Mental Check • 3 days ago          │
│ PHQ-9 Assessment • 5 days ago            │
│                                          │
│ [ ] Link these to my account             │
│     [Cancel]  [Link & Continue]          │
└─────────────────────────────────────────┘
```

### Assessment History Annotation
```
Quick Mental Check                   Score: 18/24
✓ Linked from landing page assessment
3 days ago
```

## Benefits

1. **Complete Picture**: Patient sees all assessments in one place
2. **Continuity**: Assessment history starts before account creation
3. **Better Analytics**: Trends include pre-account data
4. **Engagement**: Encourages account creation to save results
5. **Privacy**: User controls linking (opt-in, not auto)

## Data Privacy

- ✓ Anonymous assessments remain anonymous until user links them
- ✓ User controls data linking (explicit action required)
- ✓ Can un-link if desired (soft delete, don't actually remove)
- ✓ GDPR compliant (user can delete all linked data)
- ✓ No data sharing without user consent

## Timeline for Implementation

### Phase 1: Current (Completed)
- ✅ Daily assessment form
- ✅ Assessment history display
- ✅ Analytics dashboard

### Phase 2: Backend Support (Next)
- Create `/api/v1/patient/screening/unlinked-attempts` endpoint
- Create `/api/v1/patient/screening/:id/link` endpoint
- Add database migration for any schema changes needed

### Phase 3: Frontend Integration
- Add post-login linking modal in LoginPage
- Update AssessmentReportsPage to show linked assessments
- Display annotation showing source (linked vs authenticated)

### Phase 4: Polish (Optional)
- Email notification: "Your assessment was linked to your account"
- Auto-refresh assessment reports after linking
- Celebratory animation when first assessment linked
- Share report option

## Related Files

```
backend/
  src/
    services/
      free-screening.service.ts  ← Add linking logic
      patient-v1.service.ts      ← Integration point
    routes/
      patient.routes.ts          ← New endpoints
    
frontend/
  src/
    pages/
      auth/LoginPage.tsx         ← Add modal
      patient/AssessmentReportsPage.tsx  ← Show linked
      patient/AssessmentsPage.tsx        ← Include linked
```

## Alternative: Direct Integration

If patient is already logged in when taking landing assessment:
- Use authenticated endpoint: `/v1/free-screening/start/me`
- Results auto-linked to account
- No migration needed
- Cleaner user experience

### Implementation:
```typescript
// In frontend/src/pages/Assessment.tsx
const [isAuthenticated, setIsAuthenticated] = useState(false);

useEffect(() => {
  const token = localStorage.getItem('auth_token');
  setIsAuthenticated(!!token);
}, []);

const loadAssessment = async () => {
  const endpoint = isAuthenticated 
    ? '/v1/free-screening/start/me'  // ← Authenticated
    : '/v1/free-screening/start';     // ← Anonymous
  
  const res = await http.post(endpoint, {});
  // Rest of code...
};

// Same for submission
const handleFinish = async () => {
  const endpoint = isAuthenticated
    ? `/v1/free-screening/${attemptId}/submit/me`  // ← Authenticated
    : `/v1/free-screening/${attemptId}/submit`;    // ← Anonymous
    
  const res = await http.post(endpoint, { ... });
  // Rest of code...
};
```

## Conclusion

This integration allows seamless connection between landing page assessments and authenticated user accounts, providing a complete assessment history and better analytics without compromising privacy.

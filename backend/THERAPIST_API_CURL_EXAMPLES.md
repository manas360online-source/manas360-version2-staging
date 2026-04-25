# Therapist API - Example Curl Commands

**API Base URL:** `https://api.manas360.com/api/v1`

Replace `YOUR_JWT_TOKEN` with an actual JWT token in all examples.

---

## Authentication

### Generate JWT Token (Login)
```bash
curl -X POST https://api.manas360.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "therapist@example.com",
    "password": "your-password"
  }'
```

---

## Profile Management

### 1. Create Therapist Profile
```bash
curl -X POST https://api.manas360.com/api/v1/therapists/me/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Jane Doe",
    "email": "dr.jane@example.com",
    "phone": "+11234567890",
    "specialization": "Cognitive Behavioral Therapy"
  }'
```

### 2. Get Therapist Profile
```bash
curl -X GET https://api.manas360.com/api/v1/therapists/me/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Update Therapist Profile
```bash
curl -X PUT https://api.manas360.com/api/v1/therapists/me/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Jane Smith",
    "specialization": "Psychodynamic Therapy",
    "bio": "Specialized in anxiety and depression treatment"
  }'
```

---

## Document Management

### 4. Upload Credential Document
```bash
curl -X POST https://api.manas360.com/api/v1/therapists/me/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/license.pdf" \
  -F "documentType=license" \
  -F "expiryDate=2027-12-31"
```

**Upload with image file:**
```bash
curl -X POST https://api.manas360.com/api/v1/therapists/me/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/degree.jpg" \
  -F "documentType=degree"
```

### 5. List Therapist Documents
```bash
# Get first page with 10 documents
curl -X GET "https://api.manas360.com/api/v1/therapists/me/documents?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by document type:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/documents?type=license&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by verification status:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/documents?verificationStatus=verified&page=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Get Document Signed URL
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/documents/507f1f77bcf86cd799439012/signed-url" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7. Delete Document
```bash
curl -X DELETE "https://api.manas360.com/api/v1/therapists/me/documents/507f1f77bcf86cd799439012" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Leads Management

### 8. List Available Leads
```bash
# Get first page with 10 leads
curl -X GET "https://api.manas360.com/api/v1/therapists/me/leads?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by specialization:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/leads?specialization=Anxiety&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by budget range:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/leads?minBudget=50&maxBudget=500&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Sort by budget (descending):**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/leads?sortBy=budget&sortOrder=desc&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by status:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/leads?status=available&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Complex filter:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/leads?specialization=Anxiety&minBudget=100&maxBudget=300&sortBy=budget&sortOrder=asc&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 9. Get Lead Details
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/leads/607f1f77bcf86cd799439020" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 10. Purchase Lead
```bash
curl -X POST "https://api.manas360.com/api/v1/therapists/me/leads/607f1f77bcf86cd799439020/purchase" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Session Management

### 11. List Therapist Sessions
```bash
# Get all sessions, first page
curl -X GET "https://api.manas360.com/api/v1/therapists/me/sessions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by status:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/sessions?status=scheduled&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by completed status:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/sessions?status=completed&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by date range:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/sessions?startDate=2026-02-01T00:00:00Z&endDate=2026-02-28T23:59:59Z&page=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Sort by scheduled date (descending):**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/sessions?sortBy=scheduledAt&sortOrder=desc&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 12. Get Session Details
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 13. Update Session Status to Completed
```bash
curl -X PATCH "https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "completionNotes": "Session went well. Patient showed good progress in managing anxiety."
  }'
```

### 14. Update Session Status to Cancelled
```bash
curl -X PATCH "https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "cancelled",
    "cancellationReason": "Therapist became unavailable due to emergency"
  }'
```

---

## Session Notes (Encrypted)

### 15. Add Encrypted Session Note
```bash
curl -X POST "https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040/notes" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Patient discussed anxiety triggers during social situations. Recommended exposure therapy and breathing exercises for next session. Patient showed good engagement."
  }'
```

### 16. List Session Notes
```bash
# Get first page of notes
curl -X GET "https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040/notes?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Sort by creation date (reverse):**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040/notes?sortBy=createdAt&sortOrder=desc&page=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 17. Get Decrypted Session Note
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040/notes/907f1f77bcf86cd799439060" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 18. Update Session Note
```bash
curl -X PUT "https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040/notes/907f1f77bcf86cd799439060" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Patient discussed anxiety triggers during social situations. Recommended exposure therapy and breathing exercises. Follow-up needed on meditation practice."
  }'
```

### 19. Delete Session Note
```bash
curl -X DELETE "https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040/notes/907f1f77bcf86cd799439060" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Earnings & Analytics

### 20. Get Earnings Overview
```bash
# Current month earnings
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Specific month:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings?year=2026&month=2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Date range:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings?startDate=2026-01-01T00:00:00Z&endDate=2026-02-28T23:59:59Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 21. Get Earnings History (Paginated)
```bash
# First page with 10 items
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings/history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Sort by amount (highest first):**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings/history?sortBy=amount&sortOrder=desc&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by date range:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings/history?startDate=2026-01-01T00:00:00Z&endDate=2026-02-28T23:59:59Z&page=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Sort by date (most recent first):**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings/history?sortBy=completedAt&sortOrder=desc&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 22. Get Monthly Earnings Breakdown
```bash
# 2026 monthly breakdown
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings/monthly?year=2026" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 23. Get Earnings by Session Type
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings/by-type" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Wallet Management

### 24. Get Wallet Details
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/wallet" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 25. Get Wallet Transactions
```bash
# First page of all transactions
curl -X GET "https://api.manas360.com/api/v1/therapists/me/wallet/transactions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by transaction type (debit):**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/wallet/transactions?type=debit&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by transaction type (credit):**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/wallet/transactions?type=credit&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by status:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/wallet/transactions?status=completed&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Date range:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/wallet/transactions?startDate=2026-02-01T00:00:00Z&endDate=2026-02-28T23:59:59Z&page=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Complex filter:**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/wallet/transactions?type=debit&status=completed&startDate=2026-02-01T00:00:00Z&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Advanced Examples

### Example 1: Complete Workflow - Profile Setup and Lead Purchase

**Step 1: Create Profile**
```bash
curl -X POST https://api.manas360.com/api/v1/therapists/me/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Jane Doe",
    "email": "dr.jane@example.com",
    "phone": "+11234567890",
    "specialization": "Cognitive Behavioral Therapy"
  }'
```

**Step 2: Upload License**
```bash
curl -X POST https://api.manas360.com/api/v1/therapists/me/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/license.pdf" \
  -F "documentType=license" \
  -F "expiryDate=2027-12-31"
```

**Step 3: Browse Leads**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/leads?minBudget=150&maxBudget=300&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Step 4: Purchase First Lead**
```bash
curl -X POST "https://api.manas360.com/api/v1/therapists/me/leads/607f1f77bcf86cd799439020/purchase" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### Example 2: Session Management Workflow

**Step 1: View Upcoming Sessions**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/sessions?status=scheduled&sortBy=scheduledAt&sortOrder=asc&page=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Step 2: View Session Details**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Step 3: Add Session Note**
```bash
curl -X POST "https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040/notes" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Session focused on anxiety management. Patient practiced breathing exercises. Will continue with exposure therapy next session."
  }'
```

**Step 4: Mark Session as Completed**
```bash
curl -X PATCH "https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "completionNotes": "Patient responded well to interventions."
  }'
```

---

### Example 3: Earnings Analysis Workflow

**Step 1: Get Monthly Overview**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings?year=2026&month=2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Step 2: Compare with Previous Year**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings?year=2025&month=2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Step 3: View Monthly Breakdown for Year**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings/monthly?year=2026" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Step 4: Get Detailed History**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings/history?sortBy=amount&sortOrder=desc&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Step 5: Check Wallet Balance**
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/wallet" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Error Handling Examples

### 401 Unauthorized - Missing Token
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/profile"
# Response: 401 Unauthorized
```

### 400 Bad Request - Validation Error
```bash
curl -X POST https://api.manas360.com/api/v1/therapists/me/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "J",  # Too short (min 2)
    "email": "invalid-email",  # Invalid format
    "phone": "123",  # Invalid format
    "specialization": ""  # Empty
  }'
# Response: 400 Bad Request with validation errors
```

### 409 Conflict - Duplicate Email
```bash
curl -X POST https://api.manas360.com/api/v1/therapists/me/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Someone Else",
    "email": "dr.jane@example.com",  # Already exists
    "phone": "+19876543210",
    "specialization": "Therapy"
  }'
# Response: 409 Conflict
```

### 402 Payment Required - Insufficient Balance
```bash
curl -X POST "https://api.manas360.com/api/v1/therapists/me/leads/607f1f77bcf86cd799439020/purchase" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
# Response: 402 Payment Required (insufficient wallet balance)
```

---

## Tips for Using These Commands

1. **Extract Token from Response:**
   ```bash
   TOKEN=$(curl -s -X POST https://api.manas360.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"therapist@example.com","password":"password"}' | jq -r '.token')
   ```

2. **Pretty Print JSON Response:**
   ```bash
   curl -X GET https://api.manas360.com/api/v1/therapists/me/profile \
     -H "Authorization: Bearer $TOKEN" | jq .
   ```

3. **Save Response to File:**
   ```bash
   curl -X GET https://api.manas360.com/api/v1/therapists/me/earnings \
     -H "Authorization: Bearer $TOKEN" > earnings.json
   ```

4. **Check Response Headers with Status Code:**
   ```bash
   curl -i -X GET https://api.manas360.com/api/v1/therapists/me/profile \
     -H "Authorization: Bearer $TOKEN"
   ```

5. **Verbose Output (for debugging):**
   ```bash
   curl -v -X GET https://api.manas360.com/api/v1/therapists/me/profile \
     -H "Authorization: Bearer $TOKEN"
   ```

---

## Testing with Postman

Import this collection into Postman for easier testing:

1. Save curl commands as Environment Variables
2. Create Collection with folders for each resource
3. Use tests to validate responses
4. Export results for reporting

---

**Last Updated:** February 27, 2026  
**API Version:** 1.0.0  
**Status:** Production Ready

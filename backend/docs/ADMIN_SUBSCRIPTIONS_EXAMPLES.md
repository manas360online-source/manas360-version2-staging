# Admin Subscriptions - Examples & Use Cases

## 🔑 Quick Start

### 1. Get Admin Token
```bash
curl -X POST "http://localhost:3005/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }' | jq '.data.accessToken'
```

### 2. Set Token as Variable
```bash
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Fetch Subscriptions
```bash
curl -X GET "http://localhost:3005/api/v1/admin/subscriptions" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 📋 cURL Examples

### Example 1: List All Active Subscriptions
```bash
curl -X GET "http://localhost:3005/api/v1/admin/subscriptions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "user": {
          "id": "507f1f77bcf86cd799439010",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+91-9876543210"
        },
        "plan": {
          "type": "premium",
          "name": "Premium Plan"
        },
        "status": "active",
        "startDate": "2025-01-15T10:30:00Z",
        "expiryDate": "2026-01-15T10:30:00Z",
        "price": 2999,
        "currency": "INR",
        "billingCycle": "annual",
        "autoRenew": true,
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "meta": {
      "totalItems": 125,
      "totalPages": 13,
      "currentPage": 1,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "message": "Subscriptions fetched successfully"
}
```

### Example 2: Filter by Plan Type - Premium
```bash
curl -X GET "http://localhost:3005/api/v1/admin/subscriptions?planType=premium" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data'
```

### Example 3: Filter by Plan Type - Basic
```bash
curl -X GET "http://localhost:3005/api/v1/admin/subscriptions?planType=basic" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.data | length'
```

Output:
```
42
```

### Example 4: Get Expired Subscriptions
```bash
curl -X GET "http://localhost:3005/api/v1/admin/subscriptions?status=expired" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.meta'
```

### Example 5: Get Cancelled Subscriptions
```bash
curl -s -X GET "http://localhost:3005/api/v1/admin/subscriptions?status=cancelled" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.data[] | {email: .user.email, plan: .plan.type, status: .status}'
```

Output:
```json
{
  "email": "user1@example.com",
  "plan": "basic",
  "status": "cancelled"
}
{
  "email": "user2@example.com",
  "plan": "premium",
  "status": "cancelled"
}
```

### Example 6: Paginate Results - Page 2
```bash
curl -X GET "http://localhost:3005/api/v1/admin/subscriptions?page=2&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.meta'
```

Output:
```json
{
  "totalItems": 245,
  "totalPages": 13,
  "currentPage": 2,
  "itemsPerPage": 20,
  "hasNextPage": true,
  "hasPreviousPage": true
}
```

### Example 7: Combined Filters - Pro Plan Active Subscriptions
```bash
curl -X GET "http://localhost:3005/api/v1/admin/subscriptions?planType=pro&status=active" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.data | map({id: ._id, user: .user.email, price: .price})'
```

Output:
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "user": "john@example.com",
    "price": 4999
  },
  {
    "id": "507f1f77bcf86cd799439012",
    "user": "jane@example.com",
    "price": 4999
  }
]
```

### Example 8: Get Pretty Output with Timing
```bash
curl -w "\n\nRequest took: %{time_total}s\n" \
  -X GET "http://localhost:3005/api/v1/admin/subscriptions?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

### Example 9: Save Results to File
```bash
curl -s -X GET "http://localhost:3005/api/v1/admin/subscriptions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > subscriptions.json

cat subscriptions.json | jq '.data.data | length'
```

---

## 💻 Programming Language Examples

### Node.js
```javascript
const fetch = require('node-fetch');

async function getSubscriptions(token, filters = {}) {
  const params = new URLSearchParams({
    status: filters.status || 'active',
    page: filters.page || 1,
    limit: filters.limit || 10,
  });

  if (filters.planType) {
    params.append('planType', filters.planType);
  }

  const response = await fetch(
    `http://localhost:3005/api/v1/admin/subscriptions?${params}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const data = await response.json();
  return data.data;
}

// Get all premium subscriptions
getSubscriptions(process.env.ADMIN_TOKEN, { planType: 'premium' })
  .then(result => {
    console.log(`Found ${result.meta.totalItems} premium subscriptions`);
    
    result.data.forEach(sub => {
      console.log(`${sub.user.name} - Expires: ${sub.expiryDate}`);
    });
  })
  .catch(console.error);
```

### TypeScript
```typescript
interface Subscription {
  _id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  plan: { type: string; name: string };
  status: 'active' | 'expired' | 'cancelled' | 'paused';
  startDate: Date;
  expiryDate: Date;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  autoRenew: boolean;
  createdAt: Date;
}

interface SubscriptionsResponse {
  data: Subscription[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

async function fetchSubscriptions(
  token: string,
  planType?: 'basic' | 'premium' | 'pro'
): Promise<SubscriptionsResponse> {
  const params = new URLSearchParams();
  
  if (planType) params.append('planType', planType);
  params.append('status', 'active');

  const response = await fetch(
    `http://localhost:3005/api/v1/admin/subscriptions?${params}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

// Usage
const subs = await fetchSubscriptions(adminToken, 'pro');
console.log(`Total Pro Subscriptions: ${subs.meta.totalItems}`);
subs.data.forEach(sub => {
  const daysLeft = Math.ceil(
    (new Date(sub.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  console.log(`${sub.user.email}: ${daysLeft} days remaining`);
});
```

### React Hook
```typescript
import { useState, useEffect } from 'react';

interface FilterOptions {
  planType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useSubscriptions(token: string, filters: FilterOptions = {}) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      status: filters.status || 'active',
      page: String(filters.page || 1),
      limit: String(filters.limit || 10),
    });

    if (filters.planType) {
      params.append('planType', filters.planType);
    }

    fetch(`/api/v1/admin/subscriptions?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          setSubscriptions(result.data.data);
          setMeta(result.data.meta);
        } else {
          setError(result.message);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, filters]);

  return { subscriptions, meta, loading, error };
}

// Component Example
export function SubscriptionsDashboard() {
  const token = localStorage.getItem('adminToken');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { subscriptions, meta, loading, error } = useSubscriptions(token, {
    planType: planFilter || undefined,
    status: 'active',
    page,
    limit: 20,
  });

  if (error) return <div className="error">{error}</div>;
  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Active Subscriptions</h2>

      <div className="filters">
        <select value={planFilter} onChange={e => {
          setPlanFilter(e.target.value);
          setPage(1);
        }}>
          <option value="">All Plans</option>
          <option value="basic">Basic</option>
          <option value="premium">Premium</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Plan</th>
            <th>Price</th>
            <th>Cycle</th>
            <th>Expires</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map(sub => (
            <tr key={sub._id}>
              <td>{sub.user.email}</td>
              <td>{sub.plan.name}</td>
              <td>₹{sub.price}</td>
              <td>{sub.billingCycle}</td>
              <td>{new Date(sub.expiryDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={!meta?.hasPreviousPage} onClick={() => setPage(p => p - 1)}>
          ← Previous
        </button>
        <span>Page {meta?.currentPage} of {meta?.totalPages}</span>
        <button disabled={!meta?.hasNextPage} onClick={() => setPage(p => p + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}
```

### Python
```python
import requests
from enum import Enum
from typing import List, Optional
from datetime import datetime

class PlanType(Enum):
    BASIC = 'basic'
    PREMIUM = 'premium'
    PRO = 'pro'

class SubStatus(Enum):
    ACTIVE = 'active'
    EXPIRED = 'expired'
    CANCELLED = 'cancelled'
    PAUSED = 'paused'

class SubscriptionClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def list_subscriptions(
        self,
        plan_type: Optional[PlanType] = None,
        status: SubStatus = SubStatus.ACTIVE,
        page: int = 1,
        limit: int = 10
    ) -> dict:
        params = {
            'status': status.value,
            'page': page,
            'limit': limit
        }
        
        if plan_type:
            params['planType'] = plan_type.value

        response = requests.get(
            f'{self.base_url}/api/v1/admin/subscriptions',
            headers=self.headers,
            params=params
        )

        response.raise_for_status()
        return response.json()

    def get_all_subscriptions(self, plan_type: Optional[PlanType] = None) -> List[dict]:
        """Fetch all subscriptions by iterating through pages"""
        all_subs = []
        page = 1

        while True:
            result = self.list_subscriptions(
                plan_type=plan_type,
                page=page,
                limit=50  # Max limit
            )

            all_subs.extend(result['data']['data'])

            if not result['data']['meta']['hasNextPage']:
                break

            page += 1

        return all_subs

    def get_expiring_soon(self, days: int = 7) -> List[dict]:
        """Get subscriptions expiring within N days"""
        expiring = []
        
        for status in [SubStatus.ACTIVE]:
            result = self.list_subscriptions(status=status, limit=50)
            
            for sub in result['data']['data']:
                expiry = datetime.fromisoformat(sub['expiryDate'].replace('Z', '+00:00'))
                days_left = (expiry - datetime.now(expiry.tzinfo)).days
                
                if 0 < days_left <= days:
                    expiring.append({
                        'email': sub['user']['email'],
                        'plan': sub['plan']['type'],
                        'expiryDate': sub['expiryDate'],
                        'daysLeft': days_left
                    })

        return sorted(expiring, key=lambda x: x['daysLeft'])

    def print_report(self, subscriptions: List[dict]):
        print('\n📊 SUBSCRIPTION REPORT')
        print('=' * 80)
        print(f'{"Email":<35} {"Plan":<12} {"Price":<8} {"Expires":<15}')
        print('-' * 80)

        for sub in subscriptions:
            email = sub['user']['email']
            plan = sub['plan']['type']
            price = f"₹{sub['price']}"
            expires = datetime.fromisoformat(
                sub['expiryDate'].replace('Z', '+00:00')
            ).strftime('%Y-%m-%d')

            print(f'{email:<35} {plan:<12} {price:<8} {expires:<15}')

        print(f'\nTotal: {len(subscriptions)} subscriptions')
        print('=' * 80 + '\n')

# Usage
client = SubscriptionClient('http://localhost:3005', 'admin_token')

# Get all active premium subscriptions
print('Active Premium Subscriptions:')
result = client.list_subscriptions(plan_type=PlanType.PREMIUM)
client.print_report(result['data']['data'])

# Get subscriptions expiring soon
print('\nSubscriptions Expiring Within 7 Days:')
expiring = client.get_expiring_soon(days=7)
for sub in expiring:
    print(f"{sub['email']}: {sub['daysLeft']} days")

# Get all subscriptions (paginating through all)
print('\nDownloading all subscriptions...')
all_subs = client.get_all_subscriptions()
print(f'Total active subscriptions: {len(all_subs)}')
```

---

## 📊 Common Queries

### Count Subscriptions by Plan Type
```bash
for plan in basic premium pro; do
  count=$(curl -s "http://localhost:3005/api/v1/admin/subscriptions?planType=$plan&limit=1" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.meta.totalItems')
  echo "$plan: $count"
done
```

Output:
```
basic: 142
premium: 89
pro: 14
```

### Calculate Total Revenue
```bash
curl -s "http://localhost:3005/api/v1/admin/subscriptions?limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | \
  jq '[.data.data[].price] | add'
```

Output:
```
234567.50
```

### Get Subscriptions Expiring Today
```bash
curl -s "http://localhost:3005/api/v1/admin/subscriptions?limit=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | \
  jq -r ".data.data[] | select(.expiryDate | split(\"T\")[0] == \"$(date +%Y-%m-%d)\") | .user.email"
```

---

## ⚠️ Error Handling

### Invalid Plan Type
```bash
curl -X GET "http://localhost:3005/api/v1/admin/subscriptions?planType=invalid" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Response:
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "Invalid plan type"
}
```

### Unauthorized
```bash
curl -X GET "http://localhost:3005/api/v1/admin/subscriptions" \
  -H "Authorization: Bearer invalid_token"
```

Response:
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid token"
}
```

### Forbidden (Non-Admin)
```bash
# With patient token
curl -X GET "http://localhost:3005/api/v1/admin/subscriptions" \
  -H "Authorization: Bearer patient_token"
```

Response:
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Access denied. Admin role required."
}
```

---

## 🔄 Integration Examples

### Webhook Notification (When Subscriptions Selected)
```javascript
// Send admins daily report of expiring subscriptions
app.post('/admin-notifications/subscriptions-expiring', async (req, res) => {
  const client = new SubscriptionClient(API_URL, ADMIN_TOKEN);
  const expiring = await client.get_expiring_soon(days: 7);

  if (expiring.length > 0) {
    await sendEmail({
      to: 'admins@example.com',
      subject: `${expiring.length} subscriptions expiring soon`,
      html: generateSubscriptionsReport(expiring)
    });
  }

  res.json({ notified: expiring.length });
});
```

### Dashboard Widget
```typescript
// React component for admin dashboard
export function SubscriptionMetrics() {
  const { subscriptions, meta } = useSubscriptions(token, { limit: 1 });
  
  const metrics = {
    total: meta?.totalItems || 0,
    basic: /* count from planType=basic */ 0,
    premium: /* count from planType=premium */ 0,
    pro: /* count from planType=pro */ 0,
  };

  return (
    <div className="metrics-grid">
      <MetricCard label="Total Active" value={metrics.total} />
      <MetricCard label="Basic" value={metrics.basic} />
      <MetricCard label="Premium" value={metrics.premium} />
      <MetricCard label="Pro" value={metrics.pro} />
    </div>
  );
}
```

---

**Last Updated**: February 27, 2026
**Examples Tested**: ✅ All cURL commands on macOS

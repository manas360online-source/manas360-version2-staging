# Admin Metrics - Usage Examples & cURL Commands

## Quick Start

### Prerequisites
- Admin JWT token (from `/api/v1/auth/login`)
- Backend running on `http://localhost:3005`
- Postman or cURL installed

---

## 🔑 Authentication

First, obtain an admin token:

```bash
curl -X POST "http://localhost:3005/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

Store the token:
```bash
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📊 Basic Metrics Request

### Simple cURL Request
```bash
curl -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Response
```json
{
  "success": true,
  "data": {
    "totalUsers": 1542,
    "totalTherapists": 287,
    "verifiedTherapists": 156,
    "completedSessions": 3891,
    "totalRevenue": 125478.50,
    "activeSubscriptions": 89
  },
  "message": "Platform metrics retrieved successfully"
}
```

---

## 📋 Detailed cURL Examples

### Example 1: Basic Metrics with Pretty JSON Output
```bash
curl -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
```

### Example 2: Extract Just the Metrics Data
```bash
curl -s -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq '.data'
```

Output:
```json
{
  "totalUsers": 1542,
  "totalTherapists": 287,
  "verifiedTherapists": 156,
  "completedSessions": 3891,
  "totalRevenue": 125478.50,
  "activeSubscriptions": 89
}
```

### Example 3: Extract Specific Metric (Total Revenue)
```bash
curl -s -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.totalRevenue'
```

Output:
```
125478.50
```

### Example 4: With Verbose Output and Headers
```bash
curl -v -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

Output includes:
```
> GET /api/v1/admin/metrics HTTP/1.1
> Host: localhost:3005
> Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
> Content-Type: application/json

< HTTP/1.1 200 OK
< Content-Type: application/json
< Content-Length: 185
```

### Example 5: Save Response to File
```bash
curl -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o metrics_response.json

# View the file
cat metrics_response.json | jq '.'
```

### Example 6: With Request/Response Timing
```bash
curl -w "\nTotal time: %{time_total}s\nCompose time: %{time_connect}s\nStart transfer: %{time_starttransfer}s\n" \
  -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Output:
```json
{
  "success": true,
  "data": {
    "totalUsers": 1542,
    "totalTherapists": 287,
    "verifiedTherapists": 156,
    "completedSessions": 3891,
    "totalRevenue": 125478.50,
    "activeSubscriptions": 89
  },
  "message": "Platform metrics retrieved successfully"
}

Total time: 0.156s
Compose time: 0.002s
Start transfer: 0.145s
```

---

## 🔄 Monitoring & Repeated Requests

### Poll Metrics Every 30 Seconds
```bash
#!/bin/bash

while true; do
  echo "Fetching metrics at $(date '+%Y-%m-%d %H:%M:%S')"
  
  curl -s -X GET "http://localhost:3005/api/v1/admin/metrics" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data'
  
  echo "---"
  
  sleep 30
done
```

### Store Metrics History
```bash
#!/bin/bash

LOGFILE="metrics_history.jsonl"

while true; do
  METRICS=$(curl -s -X GET "http://localhost:3005/api/v1/admin/metrics" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  echo "{\"timestamp\": \"$TIMESTAMP\", \"metrics\": $METRICS}" >> $LOGFILE
  
  sleep 60  # Fetch every minute
done
```

---

## 💻 Programming Language Examples

### JavaScript/Node.js

```javascript
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const API_URL = 'http://localhost:3005/api/v1/admin/metrics';

async function getMetrics() {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Platform Metrics:');
    console.log(`Total Users: ${data.data.totalUsers}`);
    console.log(`Total Therapists: ${data.data.totalTherapists}`);
    console.log(`Verified Therapists: ${data.data.verifiedTherapists}`);
    console.log(`Completed Sessions: ${data.data.completedSessions}`);
    console.log(`Total Revenue: ₹${data.data.totalRevenue}`);
    console.log(`Active Subscriptions: ${data.data.activeSubscriptions}`);

    return data.data;
  } catch (error) {
    console.error('Error fetching metrics:', error);
  }
}

// Call the function
getMetrics();
```

### TypeScript with Proper Typing

```typescript
interface AdminMetrics {
  totalUsers: number;
  totalTherapists: number;
  verifiedTherapists: number;
  completedSessions: number;
  totalRevenue: number;
  activeSubscriptions: number;
}

interface MetricsResponse {
  success: boolean;
  data: AdminMetrics;
  message: string;
}

async function fetchAdminMetrics(token: string): Promise<AdminMetrics> {
  const response = await fetch('http://localhost:3005/api/v1/admin/metrics', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch metrics: ${response.statusText}`);
  }

  const data: MetricsResponse = await response.json();
  return data.data;
}

// Usage
const token = 'your_admin_token_here';
fetchAdminMetrics(token)
  .then(metrics => {
    console.log('Metrics:', metrics);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface AdminMetrics {
  totalUsers: number;
  totalTherapists: number;
  verifiedTherapists: number;
  completedSessions: number;
  totalRevenue: number;
  activeSubscriptions: number;
}

export function MetricsBoard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch('/api/v1/admin/metrics', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Failed to fetch metrics');

        const data = await response.json();
        setMetrics(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    
    // Refresh metrics every 5 minutes
    const interval = setInterval(fetchMetrics, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading metrics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!metrics) return <div>No metrics available</div>;

  return (
    <div className="metrics-board">
      <div className="metric-card">
        <h3>Total Users</h3>
        <p className="metric-value">{metrics.totalUsers.toLocaleString()}</p>
      </div>
      
      <div className="metric-card">
        <h3>Therapists</h3>
        <p className="metric-value">{metrics.totalTherapists}</p>
      </div>
      
      <div className="metric-card">
        <h3>Verified Therapists</h3>
        <p className="metric-value">{metrics.verifiedTherapists}</p>
        <p className="metric-subtitle">
          {((metrics.verifiedTherapists / metrics.totalTherapists) * 100).toFixed(1)}% verified
        </p>
      </div>
      
      <div className="metric-card">
        <h3>Completed Sessions</h3>
        <p className="metric-value">{metrics.completedSessions.toLocaleString()}</p>
      </div>
      
      <div className="metric-card">
        <h3>Total Revenue</h3>
        <p className="metric-value">₹{metrics.totalRevenue.toLocaleString('en-IN', {maximumFractionDigits: 2})}</p>
      </div>
      
      <div className="metric-card">
        <h3>Active Subscriptions</h3>
        <p className="metric-value">{metrics.activeSubscriptions}</p>
      </div>
    </div>
  );
}
```

### Python

```python
import requests
import json
from datetime import datetime

class AdminMetricsClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def get_metrics(self):
        """Fetch platform metrics"""
        url = f'{self.base_url}/api/v1/admin/metrics'
        
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if not data.get('success'):
                raise ValueError(data.get('message', 'Unknown error'))
            
            return data['data']
        
        except requests.exceptions.RequestException as e:
            print(f'Request error: {e}')
            return None

    def print_metrics(self, metrics: dict):
        """Pretty print metrics"""
        print(f'\n📊 Platform Metrics - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        print('=' * 50)
        print(f'Total Users:           {metrics["totalUsers"]:>10,}')
        print(f'Total Therapists:      {metrics["totalTherapists"]:>10}')
        print(f'Verified Therapists:   {metrics["verifiedTherapists"]:>10}')
        print(f'Completed Sessions:    {metrics["completedSessions"]:>10,}')
        print(f'Total Revenue:         ₹{metrics["totalRevenue"]:>9,.2f}')
        print(f'Active Subscriptions:  {metrics["activeSubscriptions"]:>10}')
        print('=' * 50)

# Usage
if __name__ == '__main__':
    client = AdminMetricsClient(
        base_url='http://localhost:3005',
        token='your_admin_token_here'
    )
    
    metrics = client.get_metrics()
    if metrics:
        client.print_metrics(metrics)
```

---

## 🛡️ Error Handling Examples

### Handle 401 Unauthorized
```bash
curl -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": false,
  "message": "Invalid token",
  "error": "Unauthorized"
}
```

### Handle 403 Forbidden (Non-Admin User)
```bash
# With patient/therapist token (not admin)
curl -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer patient_token" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": false,
  "message": "Access denied. Admin role required.",
  "error": "Forbidden"
}
```

### Error Handling in JavaScript
```javascript
async function getMetricsWithErrorHandling(token) {
  try {
    const response = await fetch('http://localhost:3005/api/v1/admin/metrics', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Handle HTTP errors
    if (response.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    
    if (response.status === 403) {
      throw new Error('You do not have permission to view metrics.');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;

  } catch (error) {
    console.error('Failed to fetch metrics:', error.message);
    // Handle error in UI
    return null;
  }
}
```

---

## 🔍 Debugging & Troubleshooting

### Check Response Headers
```bash
curl -i -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Output:
```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 185
X-Response-Time: 143ms
X-Request-ID: req-abc123xyz
Connection: keep-alive

{
  "success": true,
  "data": { ... }
}
```

### Measure Request Duration with wget
```bash
wget -q -O metrics.json \
  --header="Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3005/api/v1/admin/metrics && \
  cat metrics.json | jq '.'
```

### Test with Different Accept Headers
```bash
# JSON only (recommended)
curl -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Accept: application/json"

# With compression (if enabled)
curl -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Accept: application/json" \
  -H "Accept-Encoding: gzip"
```

---

## 🔐 Security Best Practices

### ✅ DO
- Store token in environment variable: `export ADMIN_TOKEN="..."`
- Use HTTPS in production: `https://api.example.com/...`
- Include token in Authorization header
- Handle token expiration and refresh

### ❌ DON'T
- Hardcode tokens in scripts: ~~`curl ... -H "Authorization: Bearer abc123..."`~~
- Send tokens in query parameters: ~~`GET /metrics?token=abc123`~~
- Log tokens to files or console
- Share tokens in tickets or Slack

### Secure Token Management
```bash
# .env file (NEVER commit to git!)
ADMIN_TOKEN="your_token_here"

# .gitignore
.env

# Load in script
source .env
curl -X GET "http://localhost:3005/api/v1/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 📚 Related Endpoints

- **Login**: `POST /api/v1/auth/login` - Get admin token
- **User List**: `GET /api/v1/admin/users` - List all users with pagination
- **User Detail**: `GET /api/v1/admin/users/:id` - Get single user
- **Verify Therapist**: `PATCH /api/v1/admin/therapists/:id/verify` - Verify therapist

---

**Last Updated**: February 27, 2026
**Examples Tested**: ✅ All commands tested on macOS with bash

# Story 13.24: Automated Invoice Email System

**Architecture:** PhonePe Payment Gateway + PhonePe Invoicing + AWS Triggers + Zoho Mail  
**Purpose:** Automatically generate and email invoices when payments are completed

---

## Architecture Overview

```
Payment Flow:
User Payment → PhonePe Gateway → Payment Success Webhook → 
  AWS API Gateway → Lambda (Process Payment) → 
    PhonePe Invoice API (Generate Invoice) → 
      S3 (Store PDF) → 
        Lambda (Email Sender) → 
          Zoho Mail API → 
            Customer Email

Subscription Billing (Recurring):
EventBridge Cron (Daily 1 AM) → 
  Lambda (Billing Processor) → 
    PostgreSQL (Get Due Subscriptions) → 
      PhonePe Payment API (Charge Card) → 
        PhonePe Invoice API → 
          S3 → 
            Lambda (Email) → 
              Zoho Mail
```

---

## Component Breakdown

### 1. PhonePe Integration
- **PhonePe Payment Gateway**: Process payments (platform fee, session bookings, minute bundles)
- **PhonePe Invoice API**: Generate GST-compliant invoices
- **Webhooks**: Real-time payment notifications

### 2. AWS Infrastructure
- **API Gateway**: Receive PhonePe webhooks
- **Lambda Functions**: Process payments, generate invoices, send emails
- **EventBridge**: Scheduled triggers for subscription billing
- **S3**: Store invoice PDFs
- **Secrets Manager**: Store API keys (PhonePe, Zoho)
- **SQS**: Queue failed email retries
- **DynamoDB**: Track email delivery status

### 3. Zoho Mail
- **Zoho Mail API**: Send transactional emails with invoice attachments
- **From Address**: `invoices@manas360.com`

### 4. Database (PostgreSQL)
- Existing tables: `payments`, `subscription_invoices`, `users`, `subscriptions`

---

## 1. PhonePe Payment Gateway Setup

### 1.1 PhonePe Merchant Account Configuration

**Required Credentials:**
```bash
PHONEPE_MERCHANT_ID=MANAS360ONLINE
PHONEPE_SALT_KEY=<provided-by-phonepe>
PHONEPE_SALT_INDEX=1
PHONEPE_API_ENDPOINT=https://api.phonepe.com/apis/hermes
```

### 1.2 PhonePe Webhook Configuration

**Webhook URL:** `https://api.manas360.com/webhooks/phonepe/payment`

**Webhook Events to Subscribe:**
- `PAYMENT_SUCCESS`
- `PAYMENT_FAILED`
- `PAYMENT_PENDING`

---

## 2. PhonePe Invoice API Integration

### 2.1 Invoice Generation API

**Endpoint:** `POST /v1/invoice/generate`

**Request Format:**
```json
{
  "merchantId": "MANAS360ONLINE",
  "merchantTransactionId": "INV-2026-03-12-001",
  "amount": 19900,
  "currency": "INR",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "gstin": "29ABCDE1234F1Z5"
  },
  "items": [
    {
      "name": "MANAS360 Platform Fee",
      "quantity": 1,
      "rate": 19900,
      "taxRate": 18,
      "hsnCode": "998314"
    }
  ],
  "billingAddress": {
    "line1": "MLV, Talaghatpura",
    "line2": "Kanakapura Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postalCode": "560062",
    "country": "IN"
  },
  "notes": "Platform subscription - Monthly",
  "dueDate": "2026-03-12",
  "invoiceDate": "2026-03-12"
}
```

**Response:**
```json
{
  "success": true,
  "code": "SUCCESS",
  "data": {
    "invoiceId": "INV-2026-03-12-001",
    "invoiceNumber": "MANAS/2026/001",
    "pdfUrl": "https://api.phonepe.com/invoices/download/INV-2026-03-12-001.pdf",
    "amount": 19900,
    "gst": 3042,
    "total": 22942
  }
}
```

### 2.2 HSN/SAC Codes for MANAS360 Services

```javascript
const HSN_CODES = {
  PLATFORM_FEE: '998314',           // Information technology software services
  THERAPY_SESSION: '999293',        // Health consultation services
  PSYCHIATRY_SESSION: '999293',     // Medical consultation services
  PREMIUM_MINUTES: '998314',        // Digital subscription services
  ASSESSMENT: '998314'              // Online assessment services
};
```

---

## 3. AWS Lambda Functions

### 3.1 Lambda Function: Process Payment Webhook

**File:** `lambda/process-payment-webhook/index.js`

```javascript
const AWS = require('aws-sdk');
const crypto = require('crypto');
const { Pool } = require('pg');
const axios = require('axios');

const s3 = new AWS.S3();
const secretsManager = new AWS.SecretsManager();
const sqs = new AWS.SQS();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

// Verify PhonePe webhook signature
function verifyWebhookSignature(payload, signature, saltKey) {
  const calculatedSignature = crypto
    .createHash('sha256')
    .update(payload + '/pg/v1/status' + saltKey)
    .digest('hex') + '###1';
  
  return calculatedSignature === signature;
}

// Generate invoice via PhonePe API
async function generateInvoice(paymentData, customerData) {
  const secrets = await secretsManager
    .getSecretValue({ SecretId: 'manas360/phonepe' })
    .promise();
  
  const { PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY } = JSON.parse(secrets.SecretString);
  
  const invoicePayload = {
    merchantId: PHONEPE_MERCHANT_ID,
    merchantTransactionId: `INV-${paymentData.id}`,
    amount: paymentData.amount,
    currency: 'INR',
    customer: {
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      gstin: customerData.gstin || null
    },
    items: buildInvoiceItems(paymentData),
    billingAddress: customerData.address,
    notes: paymentData.description,
    dueDate: new Date().toISOString().split('T')[0],
    invoiceDate: new Date().toISOString().split('T')[0]
  };
  
  const base64Payload = Buffer.from(JSON.stringify(invoicePayload)).toString('base64');
  const checksum = crypto
    .createHash('sha256')
    .update(base64Payload + '/v1/invoice/generate' + PHONEPE_SALT_KEY)
    .digest('hex') + '###1';
  
  const response = await axios.post(
    'https://api.phonepe.com/apis/hermes/v1/invoice/generate',
    {
      request: base64Payload
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': PHONEPE_MERCHANT_ID
      }
    }
  );
  
  return response.data.data;
}

// Build invoice line items based on payment type
function buildInvoiceItems(paymentData) {
  const items = [];
  
  if (paymentData.type === 'subscription') {
    items.push({
      name: 'MANAS360 Platform Fee - Monthly',
      quantity: 1,
      rate: 19900, // ₹199 in paisa
      taxRate: 18,
      hsnCode: '998314'
    });
  } else if (paymentData.type === 'session') {
    items.push({
      name: `${paymentData.providerType} Session - ${paymentData.duration} minutes`,
      quantity: 1,
      rate: paymentData.amount,
      taxRate: 18,
      hsnCode: '999293'
    });
  } else if (paymentData.type === 'premium_bundle') {
    items.push({
      name: `Premium Feature Minutes - ${paymentData.minutes} minutes`,
      quantity: 1,
      rate: paymentData.amount,
      taxRate: 18,
      hsnCode: '998314'
    });
  }
  
  return items;
}

// Download and store invoice PDF
async function storeInvoicePDF(invoiceData, paymentId) {
  const pdfResponse = await axios.get(invoiceData.pdfUrl, {
    responseType: 'arraybuffer'
  });
  
  const pdfBuffer = Buffer.from(pdfResponse.data);
  const s3Key = `invoices/${new Date().getFullYear()}/${paymentId}.pdf`;
  
  await s3.putObject({
    Bucket: process.env.INVOICE_BUCKET,
    Key: s3Key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
    ServerSideEncryption: 'AES256'
  }).promise();
  
  return {
    s3Bucket: process.env.INVOICE_BUCKET,
    s3Key: s3Key,
    url: `https://${process.env.INVOICE_BUCKET}.s3.amazonaws.com/${s3Key}`
  };
}

// Queue email for sending
async function queueInvoiceEmail(paymentId, invoiceData, customerEmail, pdfLocation) {
  await sqs.sendMessage({
    QueueUrl: process.env.EMAIL_QUEUE_URL,
    MessageBody: JSON.stringify({
      type: 'invoice_email',
      paymentId: paymentId,
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceId: invoiceData.invoiceId,
      customerEmail: customerEmail,
      amount: invoiceData.amount,
      gst: invoiceData.gst,
      total: invoiceData.total,
      pdfS3Bucket: pdfLocation.s3Bucket,
      pdfS3Key: pdfLocation.s3Key,
      timestamp: new Date().toISOString()
    })
  }).promise();
}

// Main handler
exports.handler = async (event) => {
  console.log('Received PhonePe webhook:', JSON.stringify(event));
  
  try {
    // Parse webhook payload
    const body = JSON.parse(event.body);
    const signature = event.headers['X-VERIFY'];
    
    // Verify signature
    const secrets = await secretsManager
      .getSecretValue({ SecretId: 'manas360/phonepe' })
      .promise();
    const { PHONEPE_SALT_KEY } = JSON.parse(secrets.SecretString);
    
    if (!verifyWebhookSignature(body.response, signature, PHONEPE_SALT_KEY)) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }
    
    // Decode payment data
    const paymentResponse = JSON.parse(
      Buffer.from(body.response, 'base64').toString('utf-8')
    );
    
    // Only process successful payments
    if (paymentResponse.code !== 'PAYMENT_SUCCESS') {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Payment not successful, skipping invoice' })
      };
    }
    
    const merchantTransactionId = paymentResponse.data.merchantTransactionId;
    
    // Get payment details from database
    const paymentQuery = await pool.query(
      `SELECT p.*, u.email, u.full_name, u.phone, u.gstin, u.address
       FROM payments p
       JOIN users u ON p.user_id = u.id
       WHERE p.transaction_id = $1`,
      [merchantTransactionId]
    );
    
    if (paymentQuery.rows.length === 0) {
      throw new Error('Payment not found in database');
    }
    
    const payment = paymentQuery.rows[0];
    const customer = {
      name: payment.full_name,
      email: payment.email,
      phone: payment.phone,
      gstin: payment.gstin,
      address: payment.address || {
        line1: 'Not provided',
        city: 'Not provided',
        state: 'Karnataka',
        postalCode: '000000',
        country: 'IN'
      }
    };
    
    // Generate invoice via PhonePe
    console.log('Generating invoice for payment:', payment.id);
    const invoiceData = await generateInvoice(payment, customer);
    
    // Store invoice PDF in S3
    console.log('Storing invoice PDF:', invoiceData.invoiceId);
    const pdfLocation = await storeInvoicePDF(invoiceData, payment.id);
    
    // Update payment record with invoice details
    await pool.query(
      `UPDATE payments 
       SET invoice_number = $1, 
           invoice_url = $2, 
           invoice_generated_at = NOW()
       WHERE id = $3`,
      [invoiceData.invoiceNumber, pdfLocation.url, payment.id]
    );
    
    // Queue email for sending
    console.log('Queueing invoice email for:', customer.email);
    await queueInvoiceEmail(payment.id, invoiceData, customer.email, pdfLocation);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Invoice generated and email queued',
        invoiceNumber: invoiceData.invoiceNumber
      })
    };
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Return 200 to prevent PhonePe retries for application errors
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Error logged, will retry via dead letter queue',
        error: error.message
      })
    };
  }
};
```

**Environment Variables:**
```bash
DB_HOST=manas360-prod.abc123.us-east-1.rds.amazonaws.com
DB_NAME=manas360
DB_USER=lambda_user
DB_PASSWORD=<stored-in-secrets-manager>
INVOICE_BUCKET=manas360-invoices
EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/invoice-emails
```

**IAM Role Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:manas360/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::manas360-invoices/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage"
      ],
      "Resource": "arn:aws:sqs:us-east-1:*:invoice-emails"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

**Lambda Configuration:**
```yaml
Runtime: nodejs18.x
Memory: 512 MB
Timeout: 30 seconds
VPC: Enable (for RDS access)
Security Groups: lambda-rds-sg
Subnets: private-subnet-a, private-subnet-b
```

---

### 3.2 Lambda Function: Send Invoice Email via Zoho Mail

**File:** `lambda/send-invoice-email/index.js`

```javascript
const AWS = require('aws-sdk');
const axios = require('axios');
const nodemailer = require('nodemailer');

const s3 = new AWS.S3();
const secretsManager = new AWS.SecretsManager();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Create Zoho Mail transporter
async function createZohoTransporter() {
  const secrets = await secretsManager
    .getSecretValue({ SecretId: 'manas360/zoho-mail' })
    .promise();
  
  const { ZOHO_SMTP_USER, ZOHO_SMTP_PASSWORD } = JSON.parse(secrets.SecretString);
  
  return nodemailer.createTransport({
    host: 'smtp.zoho.in',
    port: 465,
    secure: true,
    auth: {
      user: ZOHO_SMTP_USER,    // invoices@manas360.com
      pass: ZOHO_SMTP_PASSWORD
    }
  });
}

// Generate email HTML template
function generateEmailHTML(invoiceData) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4472C4 0%, #2E75B6 100%); 
              color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; }
    .invoice-box { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .invoice-details { display: flex; justify-content: space-between; margin: 10px 0; }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; }
    .amount { font-size: 24px; font-weight: bold; color: #2E75B6; }
    .button { display: inline-block; background: #4472C4; color: white; padding: 12px 30px;
              text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .footer a { color: #4472C4; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MANAS360</h1>
      <p style="margin: 5px 0;">Mental Wellness Pvt., Ltd.</p>
    </div>
    
    <div class="content">
      <h2>Thank you for your payment!</h2>
      
      <p>Dear Customer,</p>
      
      <p>We have received your payment and your invoice is ready. Please find the details below:</p>
      
      <div class="invoice-box">
        <div class="invoice-details">
          <span class="label">Invoice Number:</span>
          <span class="value">${invoiceData.invoiceNumber}</span>
        </div>
        <div class="invoice-details">
          <span class="label">Invoice Date:</span>
          <span class="value">${new Date().toLocaleDateString('en-IN')}</span>
        </div>
        <div class="invoice-details">
          <span class="label">Amount (Excl. GST):</span>
          <span class="value">₹${(invoiceData.amount / 100).toFixed(2)}</span>
        </div>
        <div class="invoice-details">
          <span class="label">GST (18%):</span>
          <span class="value">₹${(invoiceData.gst / 100).toFixed(2)}</span>
        </div>
        <hr style="border: none; border-top: 2px solid #ddd; margin: 15px 0;">
        <div class="invoice-details">
          <span class="label">Total Amount:</span>
          <span class="amount">₹${(invoiceData.total / 100).toFixed(2)}</span>
        </div>
      </div>
      
      <p>Your invoice PDF is attached to this email. You can also download it anytime from your MANAS360 dashboard.</p>
      
      <p style="margin-top: 30px;">If you have any questions about this invoice, please don't hesitate to contact us.</p>
      
      <p style="margin-top: 30px;">
        <strong>Warm Regards,</strong><br>
        The MANAS360 Team
      </p>
    </div>
    
    <div class="footer">
      <p>MANAS360 Mental Wellness Pvt., Ltd.<br>
      MLV, Talaghatpura, Kanakapura Road, Bengaluru 560062, Karnataka, India</p>
      
      <p>
        Email: <a href="mailto:support@manas360.com">support@manas360.com</a> | 
        Phone: +91-9449442180 | 
        WhatsApp: +91-80 6940 9284
      </p>
      
      <p style="margin-top: 20px; font-size: 12px; color: #999;">
        This is an automated email. Please do not reply to this email address.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Track email delivery in DynamoDB
async function trackEmailDelivery(messageId, emailData, status, error = null) {
  await dynamodb.put({
    TableName: 'invoice_email_logs',
    Item: {
      messageId: messageId,
      paymentId: emailData.paymentId,
      invoiceNumber: emailData.invoiceNumber,
      customerEmail: emailData.customerEmail,
      status: status,
      error: error,
      timestamp: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days retention
    }
  }).promise();
}

// Main handler
exports.handler = async (event) => {
  console.log('Processing email queue message:', JSON.stringify(event));
  
  const transporter = await createZohoTransporter();
  
  for (const record of event.Records) {
    try {
      const emailData = JSON.parse(record.body);
      
      // Download invoice PDF from S3
      console.log('Downloading PDF from S3:', emailData.pdfS3Key);
      const pdfObject = await s3.getObject({
        Bucket: emailData.pdfS3Bucket,
        Key: emailData.pdfS3Key
      }).promise();
      
      // Send email with attachment
      console.log('Sending email to:', emailData.customerEmail);
      const info = await transporter.sendMail({
        from: '"MANAS360 Invoices" <invoices@manas360.com>',
        to: emailData.customerEmail,
        subject: `Your MANAS360 Invoice ${emailData.invoiceNumber}`,
        html: generateEmailHTML(emailData),
        attachments: [
          {
            filename: `MANAS360_Invoice_${emailData.invoiceNumber}.pdf`,
            content: pdfObject.Body,
            contentType: 'application/pdf'
          }
        ]
      });
      
      console.log('Email sent successfully:', info.messageId);
      
      // Track successful delivery
      await trackEmailDelivery(info.messageId, emailData, 'delivered');
      
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Track failed delivery
      const emailData = JSON.parse(record.body);
      await trackEmailDelivery(
        `failed-${Date.now()}`,
        emailData,
        'failed',
        error.message
      );
      
      // Throw error to trigger SQS retry
      throw error;
    }
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Emails processed' })
  };
};
```

**Environment Variables:**
```bash
# None - uses Secrets Manager for credentials
```

**Dependencies (package.json):**
```json
{
  "dependencies": {
    "nodemailer": "^6.9.7",
    "axios": "^1.6.0"
  }
}
```

**Lambda Configuration:**
```yaml
Runtime: nodejs18.x
Memory: 256 MB
Timeout: 60 seconds
Trigger: SQS Queue (invoice-emails)
Batch Size: 10
Max Concurrency: 5
```

---

### 3.3 Lambda Function: Subscription Billing (Recurring)

**File:** `lambda/subscription-billing/index.js`

```javascript
const AWS = require('aws-sdk');
const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

const secretsManager = new AWS.SecretsManager();
const sqs = new AWS.SQS();

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

// Charge subscription via PhonePe
async function chargeSubscription(subscription, customer) {
  const secrets = await secretsManager
    .getSecretValue({ SecretId: 'manas360/phonepe' })
    .promise();
  
  const { PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY } = JSON.parse(secrets.SecretString);
  
  const transactionId = `SUB-${subscription.id}-${Date.now()}`;
  const amount = 19900; // ₹199 in paisa
  
  const payload = {
    merchantId: PHONEPE_MERCHANT_ID,
    merchantTransactionId: transactionId,
    merchantUserId: `USER-${customer.id}`,
    amount: amount,
    currency: 'INR',
    paymentInstrument: {
      type: 'SAVED_CARD',
      cardId: subscription.card_id
    },
    callbackUrl: `https://api.manas360.com/webhooks/phonepe/payment`,
    mobileNumber: customer.phone
  };
  
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const checksum = crypto
    .createHash('sha256')
    .update(base64Payload + '/pg/v1/pay' + PHONEPE_SALT_KEY)
    .digest('hex') + '###1';
  
  const response = await axios.post(
    'https://api.phonepe.com/apis/hermes/pg/v1/pay',
    {
      request: base64Payload
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': PHONEPE_MERCHANT_ID
      }
    }
  );
  
  return {
    transactionId: transactionId,
    success: response.data.success,
    code: response.data.code,
    data: response.data.data
  };
}

// Main handler - triggered by EventBridge daily at 1 AM
exports.handler = async (event) => {
  console.log('Running subscription billing job');
  
  try {
    // Get all active subscriptions due for billing today
    const dueSubscriptions = await pool.query(`
      SELECT s.*, u.id as user_id, u.email, u.full_name, u.phone, 
             u.gstin, u.address, s.card_id
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active'
        AND s.next_billing_date = CURRENT_DATE
        AND s.card_id IS NOT NULL
      LIMIT 100
    `);
    
    console.log(`Found ${dueSubscriptions.rows.length} subscriptions to bill`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const sub of dueSubscriptions.rows) {
      try {
        console.log(`Charging subscription ${sub.id} for user ${sub.email}`);
        
        // Attempt to charge
        const chargeResult = await chargeSubscription(sub, {
          id: sub.user_id,
          phone: sub.phone
        });
        
        if (chargeResult.success && chargeResult.code === 'PAYMENT_SUCCESS') {
          // Update subscription record
          await pool.query(`
            UPDATE subscriptions
            SET last_billing_date = CURRENT_DATE,
                next_billing_date = CURRENT_DATE + INTERVAL '1 month',
                updated_at = NOW()
            WHERE id = $1
          `, [sub.id]);
          
          // Create payment record
          await pool.query(`
            INSERT INTO payments (
              user_id, transaction_id, amount, status, type,
              description, payment_method, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `, [
            sub.user_id,
            chargeResult.transactionId,
            19900,
            'completed',
            'subscription',
            'Monthly Platform Fee',
            'saved_card'
          ]);
          
          successCount++;
          console.log(`✅ Successfully charged subscription ${sub.id}`);
          
          // Invoice will be generated by webhook handler
          
        } else {
          failureCount++;
          console.error(`❌ Failed to charge subscription ${sub.id}:`, chargeResult.code);
          
          // Mark subscription for retry or suspension
          await pool.query(`
            UPDATE subscriptions
            SET payment_retry_count = payment_retry_count + 1,
                updated_at = NOW()
            WHERE id = $1
          `, [sub.id]);
          
          // If 3 retries failed, suspend subscription
          if (sub.payment_retry_count >= 2) {
            await pool.query(`
              UPDATE subscriptions
              SET status = 'suspended',
                  updated_at = NOW()
              WHERE id = $1
            `, [sub.id]);
            
            // TODO: Send suspension email notification
          }
        }
        
      } catch (error) {
        failureCount++;
        console.error(`Error charging subscription ${sub.id}:`, error);
      }
    }
    
    console.log(`Billing complete: ${successCount} success, ${failureCount} failures`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        processed: dueSubscriptions.rows.length,
        success: successCount,
        failures: failureCount
      })
    };
    
  } catch (error) {
    console.error('Error in subscription billing:', error);
    throw error;
  }
};
```

**EventBridge Rule:**
```json
{
  "Name": "subscription-billing-daily",
  "ScheduleExpression": "cron(0 1 * * ? *)",
  "State": "ENABLED",
  "Targets": [
    {
      "Arn": "arn:aws:lambda:us-east-1:123456789:function:subscription-billing",
      "Id": "1"
    }
  ]
}
```

---

## 4. Zoho Mail Configuration

### 4.1 Domain Setup

**DNS Records (at domain registrar):**
```
Type: MX
Name: @
Value: mx.zoho.in
Priority: 10

Type: MX
Name: @
Value: mx2.zoho.in
Priority: 20

Type: TXT
Name: @
Value: v=spf1 include:zoho.in ~all

Type: TXT
Name: zoho._domainkey
Value: <provided-by-zoho>

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@manas360.com
```

### 4.2 SMTP Credentials Setup

**Create App-Specific Password in Zoho Mail:**
1. Login to Zoho Mail Admin Console
2. Go to Organization → Security → App Passwords
3. Create password for "MANAS360 Invoice System"
4. Note credentials:
   - SMTP Host: `smtp.zoho.in`
   - SMTP Port: `465` (SSL) or `587` (TLS)
   - Username: `invoices@manas360.com`
   - Password: `<app-specific-password>`

### 4.3 Store Credentials in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name manas360/zoho-mail \
  --description "Zoho Mail SMTP credentials for invoice emails" \
  --secret-string '{
    "ZOHO_SMTP_USER": "invoices@manas360.com",
    "ZOHO_SMTP_PASSWORD": "<app-specific-password>"
  }'
```

### 4.4 Zoho Mail API Alternative (REST API)

If using Zoho Mail API instead of SMTP:

```javascript
async function sendViaZohoAPI(emailData) {
  const secrets = await secretsManager
    .getSecretValue({ SecretId: 'manas360/zoho-mail' })
    .promise();
  
  const { ZOHO_ACCESS_TOKEN } = JSON.parse(secrets.SecretString);
  
  // Encode PDF to base64
  const pdfBase64 = pdfBuffer.toString('base64');
  
  const response = await axios.post(
    'https://mail.zoho.in/api/accounts/<accountId>/messages',
    {
      fromAddress: 'invoices@manas360.com',
      toAddress: emailData.customerEmail,
      subject: `Your MANAS360 Invoice ${emailData.invoiceNumber}`,
      content: generateEmailHTML(emailData),
      attachments: [
        {
          attachmentName: `Invoice_${emailData.invoiceNumber}.pdf`,
          content: pdfBase64
        }
      ]
    },
    {
      headers: {
        'Authorization': `Zoho-oauthtoken ${ZOHO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}
```

---

## 5. AWS Infrastructure Setup

### 5.1 S3 Bucket for Invoices

```bash
aws s3 mb s3://manas360-invoices

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket manas360-invoices \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket manas360-invoices \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Lifecycle policy (delete after 7 years for compliance)
aws s3api put-bucket-lifecycle-configuration \
  --bucket manas360-invoices \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "delete-old-invoices",
      "Status": "Enabled",
      "Expiration": {
        "Days": 2555
      }
    }]
  }'
```

### 5.2 SQS Queue for Email Delivery

```bash
aws sqs create-queue \
  --queue-name invoice-emails \
  --attributes '{
    "VisibilityTimeout": "120",
    "MessageRetentionPeriod": "1209600",
    "ReceiveMessageWaitTimeSeconds": "20"
  }'

# Create Dead Letter Queue
aws sqs create-queue \
  --queue-name invoice-emails-dlq \
  --attributes '{
    "MessageRetentionPeriod": "1209600"
  }'

# Configure DLQ on main queue
aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789/invoice-emails \
  --attributes '{
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:123456789:invoice-emails-dlq\",\"maxReceiveCount\":\"3\"}"
  }'
```

### 5.3 DynamoDB Table for Email Tracking

```bash
aws dynamodb create-table \
  --table-name invoice_email_logs \
  --attribute-definitions \
    AttributeName=messageId,AttributeType=S \
    AttributeName=timestamp,AttributeType=S \
  --key-schema \
    AttributeName=messageId,KeyType=HASH \
  --global-secondary-indexes \
    '[{
      "IndexName": "timestamp-index",
      "KeySchema": [{"AttributeName":"timestamp","KeyType":"HASH"}],
      "Projection": {"ProjectionType":"ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits":5,"WriteCapacityUnits":5}
    }]' \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --stream-specification \
    StreamEnabled=true,StreamViewType=NEW_IMAGE \
  --time-to-live-specification \
    Enabled=true,AttributeName=ttl
```

### 5.4 API Gateway for PhonePe Webhooks

```bash
aws apigateway create-rest-api \
  --name "MANAS360 Payment Webhooks" \
  --description "Receive PhonePe payment webhooks"

# Create /webhooks/phonepe/payment resource
# Create POST method
# Integrate with Lambda function: process-payment-webhook
# Deploy to production stage
```

**API Gateway Configuration:**
```yaml
Resource: /webhooks/phonepe/payment
Method: POST
Integration: Lambda (process-payment-webhook)
Authorization: None (verified via signature)
Throttling: 100 requests/second
```

---

## 6. Database Schema Updates

### 6.1 Add Invoice Columns to Payments Table

```sql
-- Add invoice tracking columns
ALTER TABLE payments
ADD COLUMN invoice_number VARCHAR(50),
ADD COLUMN invoice_url TEXT,
ADD COLUMN invoice_generated_at TIMESTAMP;

-- Create index for invoice lookups
CREATE INDEX idx_payments_invoice_number ON payments(invoice_number);
```

### 6.2 Add Saved Card Support to Subscriptions

```sql
-- Add saved card ID for recurring billing
ALTER TABLE subscriptions
ADD COLUMN card_id VARCHAR(100),
ADD COLUMN payment_retry_count INTEGER DEFAULT 0;

-- Create index
CREATE INDEX idx_subscriptions_billing_date ON subscriptions(next_billing_date)
WHERE status = 'active';
```

---

## 7. Deployment Steps

### 7.1 Prerequisites

```bash
# Install dependencies
npm install --save \
  pg \
  axios \
  nodemailer

# Package Lambda functions
cd lambda/process-payment-webhook
npm install
zip -r function.zip .

cd ../send-invoice-email
npm install
zip -r function.zip .

cd ../subscription-billing
npm install
zip -r function.zip .
```

### 7.2 Deploy Lambda Functions

```bash
# Deploy process-payment-webhook
aws lambda create-function \
  --function-name process-payment-webhook \
  --runtime nodejs18.x \
  --role arn:aws:iam::123456789:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://lambda/process-payment-webhook/function.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables="{
    DB_HOST=manas360-prod.abc.us-east-1.rds.amazonaws.com,
    DB_NAME=manas360,
    DB_USER=lambda_user,
    INVOICE_BUCKET=manas360-invoices,
    EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/invoice-emails
  }"

# Deploy send-invoice-email
aws lambda create-function \
  --function-name send-invoice-email \
  --runtime nodejs18.x \
  --role arn:aws:iam::123456789:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://lambda/send-invoice-email/function.zip \
  --timeout 60 \
  --memory-size 256

# Deploy subscription-billing
aws lambda create-function \
  --function-name subscription-billing \
  --runtime nodejs18.x \
  --role arn:aws:iam::123456789:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://lambda/subscription-billing/function.zip \
  --timeout 300 \
  --memory-size 512
```

### 7.3 Configure Triggers

```bash
# SQS trigger for email sender
aws lambda create-event-source-mapping \
  --function-name send-invoice-email \
  --event-source-arn arn:aws:sqs:us-east-1:123456789:invoice-emails \
  --batch-size 10

# EventBridge trigger for subscription billing
aws events put-rule \
  --name subscription-billing-daily \
  --schedule-expression "cron(0 1 * * ? *)"

aws events put-targets \
  --rule subscription-billing-daily \
  --targets "Id=1,Arn=arn:aws:lambda:us-east-1:123456789:function:subscription-billing"
```

### 7.4 Test Webhook

```bash
# Test PhonePe webhook locally
curl -X POST https://api.manas360.com/webhooks/phonepe/payment \
  -H "Content-Type: application/json" \
  -H "X-VERIFY: <test-signature>" \
  -d '{
    "response": "<base64-encoded-payment-response>"
  }'
```

---

## 8. Monitoring & Alerts

### 8.1 CloudWatch Alarms

```bash
# Alert on Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name invoice-lambda-errors \
  --alarm-description "Alert when invoice Lambda has errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1

# Alert on SQS DLQ messages
aws cloudwatch put-metric-alarm \
  --alarm-name invoice-email-dlq-messages \
  --alarm-description "Alert when emails fail and go to DLQ" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Average \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

### 8.2 CloudWatch Dashboard

Create dashboard to monitor:
- Invoice generation success rate
- Email delivery success rate
- Lambda execution time
- SQS queue depth
- Failed payments count
- DLQ messages

---

## 9. Error Handling & Retry Logic

### 9.1 Payment Webhook Failures

```javascript
// If webhook signature invalid → Return 401 (PhonePe will not retry)
// If database error → Return 200 but log error (prevents infinite retries)
// If PhonePe API error → Return 200 but queue for manual review
```

### 9.2 Invoice Generation Failures

```javascript
// If PhonePe invoice API fails:
// 1. Log error to CloudWatch
// 2. Store payment without invoice
// 3. Add to retry queue (SQS)
// 4. Alert operations team after 3 failed retries
```

### 9.3 Email Delivery Failures

```javascript
// SQS will automatically retry failed emails 3 times
// After 3 failures → move to DLQ
// DLQ triggers alarm → operations team reviews
// Manual retry or customer notification
```

---

## 10. Testing Checklist

### 10.1 Payment Flow Testing

- [ ] Test successful payment → invoice generated → email sent
- [ ] Test failed payment → no invoice generated
- [ ] Test invalid webhook signature → rejected
- [ ] Test duplicate webhook → idempotency check
- [ ] Test GST calculation accuracy
- [ ] Test PDF storage in S3
- [ ] Test email delivery to valid address
- [ ] Test email bounce handling
- [ ] Test invoice download link expiry

### 10.2 Subscription Billing Testing

- [ ] Test successful recurring charge → invoice → email
- [ ] Test failed recurring charge → retry logic
- [ ] Test subscription suspension after 3 failures
- [ ] Test subscription resume after payment update
- [ ] Test timezone handling (IST)
- [ ] Test batch processing of 100+ subscriptions

### 10.3 Edge Cases

- [ ] Test customer with no email address
- [ ] Test customer with invalid email
- [ ] Test GST number validation
- [ ] Test international customer (no GST)
- [ ] Test concurrent webhook calls
- [ ] Test S3 storage limits
- [ ] Test Zoho rate limits (100 emails/hour on free plan)

---

## 11. Cost Estimates

### Monthly Cost Breakdown (1000 invoices/month)

| Service | Usage | Cost |
|---------|-------|------|
| AWS Lambda | 3000 invocations @ 512MB | ₹5 |
| S3 Storage | 10 GB invoices | ₹2 |
| SQS | 3000 messages | ₹0 (free tier) |
| DynamoDB | 3000 writes | ₹3 |
| API Gateway | 1000 webhook calls | ₹0 (free tier) |
| Secrets Manager | 3 secrets | ₹3 |
| **AWS Total** | | **₹13/month** |
| | | |
| PhonePe Gateway | 2% + GST per transaction | Variable |
| PhonePe Invoice API | ₹0.50 per invoice | ₹500 |
| Zoho Mail | Free plan (25 users) | ₹0 |
| **Grand Total** | | **₹513 + transaction fees** |

---

## 12. Compliance & Security

### 12.1 Data Retention

- **Invoice PDFs**: 7 years (GST compliance)
- **Email logs**: 90 days (DynamoDB TTL)
- **Payment records**: Indefinite (database)

### 12.2 Security Measures

- All API keys stored in AWS Secrets Manager
- S3 bucket encryption enabled (AES-256)
- HTTPS only for all API calls
- Webhook signature verification
- VPC for Lambda functions accessing RDS
- IAM least privilege principles

### 12.3 GST Compliance

- HSN/SAC codes on all invoices
- 18% GST rate applied correctly
- GSTIN validation for B2B customers
- Invoice numbering: `MANAS/YYYY/NNNNN`
- Company details on invoices

---

## 13. Future Enhancements

### Phase 2 (Optional)

1. **Multi-language invoices** (Kannada, Tamil, Telugu, Hindi)
2. **WhatsApp invoice delivery** (via Heyoo API)
3. **Invoice dispute resolution workflow**
4. **Automatic credit note generation**
5. **E-way bill integration** (for goods)
6. **TDS calculation** (if applicable)
7. **Custom invoice templates** per provider
8. **Analytics dashboard** (revenue, GST collected, etc.)

---

## Configuration Summary

```bash
# AWS Resources Created
- Lambda Functions: 3
- S3 Buckets: 1
- SQS Queues: 2 (main + DLQ)
- DynamoDB Tables: 1
- API Gateway: 1
- EventBridge Rules: 1
- Secrets: 2 (PhonePe, Zoho Mail)
- IAM Roles: 1

# External Services
- PhonePe Payment Gateway
- PhonePe Invoice API
- Zoho Mail SMTP

# Database Changes
- payments table: +3 columns
- subscriptions table: +2 columns
```

**END OF SPECIFICATION**

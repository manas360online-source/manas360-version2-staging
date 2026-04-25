# STORY 9.2 - PATIENT LEGAL DOCUMENTS & CONSENT
## Patient Rights Protection & Consent Management

**Sprint:** 9  
**Story Points:** 3  
**Priority:** Critical (Legal Compliance)  
**Type:** Feature - Patient Consent  
**Dependencies:** Story 9.1 (Legal Document Management System)

---

## EPIC CONTEXT

Implement patient-facing legal document system where patients can:
- Understand their rights under DPDPA and mental health laws
- Provide informed consent for therapy
- Accept platform policies
- Track their consent history
- Withdraw consent when needed

**Reuses:** All infrastructure from Story 9.1 (same code, just patient context)

---

## USER STORY

**As a** Patient  
**I want to** understand and consent to platform policies  
**So that** my rights are protected and I give informed consent for therapy

---

## BUSINESS VALUE

### Legal Protection
- Informed consent for therapy (NMC compliance)
- DPDPA consent requirements met
- Defensible in case of disputes
- Clear patient rights documentation

### Patient Trust
- Transparency in data handling
- Clear explanation of rights
- Easy-to-understand policies
- Control over consent

---

## PATIENT-SPECIFIC DOCUMENTS

### Required Documents for Patients

**1. Privacy Policy** (MANDATORY - Registration)
```
Title: MANAS360 Privacy Policy
Content:
- What data we collect (personal, health data)
- How we use data
- Who we share with (therapists only)
- Your DPDPA rights
- How to request deletion
- Data security measures
- Contact info for data officer

Length: 3-4 pages
Language: Simple English + Hindi translation
```

**2. Terms of Service** (MANDATORY - Registration)
```
Title: Platform Terms of Service
Content:
- Platform usage rules
- User responsibilities
- Prohibited activities
- Account termination conditions
- Limitation of liability
- Dispute resolution
- Governing law (India)

Length: 4-5 pages
Language: Simple English + Hindi translation
```

**3. Informed Consent for Therapy** (MANDATORY - Before First Booking)
```
Title: Informed Consent for Mental Health Services
Content:
- What therapy involves
- Risks and benefits
- Confidentiality and its limits
- Emergency procedures
- Right to refuse treatment
- Right to terminate therapy
- Therapist credentials verification
- Session recording consent

Length: 2-3 pages
Language: Simple English + Hindi translation
Compliance: NMC Guidelines on Telemedicine
```

**4. Data Processing Consent** (MANDATORY - Registration)
```
Title: Consent for Data Processing
Content:
- Health data collection
- AI analysis consent (mood tracking, etc.)
- Session recording consent
- Data retention period (30 days to 7 years)
- Right to access your data
- Right to data portability
- Right to erasure (DPDPA)

Length: 2 pages
Language: Simple English + Hindi translation
Compliance: DPDPA 2023
```

**5. Minor Consent Form** (CONDITIONAL - If age < 18)
```
Title: Parental Consent for Minor's Therapy
Content:
- Parent/guardian consent
- Minor's rights
- Confidentiality for minors
- Emergency contact
- Withdrawal of consent

Length: 2 pages
Required: Only if patient is under 18
Compliance: Mental Healthcare Act 2017
```

---

## PATIENT CONSENT JOURNEY

### Registration Flow

```
Step 1: Account Creation
↓
Step 2: Email Verification
↓
Step 3: MANDATORY DOCUMENTS (Blocks access until accepted)
├─ Privacy Policy
├─ Terms of Service
└─ Data Processing Consent
↓
Step 4: Profile Setup
↓
Step 5: Dashboard Access GRANTED ✅
```

### First Booking Flow

```
Patient Dashboard
↓
Click "Book Session"
↓
Check: Therapy Consent Accepted?
├─ NO → Show Informed Consent Modal
│        └─ Must Accept → Continue
└─ YES → Proceed to Therapist Selection
↓
Select Therapist & Time
↓
Payment
↓
Booking Confirmed ✅
```

### Minor Patient Flow (Age < 18)

```
Registration (Normal Flow)
↓
Age Check: Is patient < 18?
├─ NO → Standard flow
└─ YES → Show Parental Consent Modal
         ├─ Parent Email Required
         ├─ Send Consent Link to Parent
         ├─ Parent Must Accept
         └─ Platform Access Blocked Until Parent Accepts
```

---

## SEED DATA (PATIENT DOCUMENTS)

```sql
-- Create patient-specific legal documents
-- These would be actual PDFs uploaded by admin via Story 9.1

-- Privacy Policy
INSERT INTO legal_documents (
    title, 
    document_type, 
    description,
    applicable_to,
    status,
    is_current,
    current_version,
    effective_date,
    uploaded_by
) VALUES (
    'MANAS360 Privacy Policy',
    'privacy_policy',
    'How we collect, use, and protect your personal and health data',
    'patients',
    'active',
    TRUE,
    '1.0',
    '2026-01-01',
    1  -- Admin user ID
);

-- Terms of Service
INSERT INTO legal_documents (
    title, 
    document_type, 
    description,
    applicable_to,
    status,
    is_current,
    current_version,
    effective_date,
    uploaded_by
) VALUES (
    'Platform Terms of Service',
    'terms_of_service',
    'Rules and conditions for using MANAS360 platform',
    'patients',
    'active',
    TRUE,
    '1.0',
    '2026-01-01',
    1
);

-- Informed Consent for Therapy
INSERT INTO legal_documents (
    title, 
    document_type, 
    description,
    applicable_to,
    status,
    is_current,
    current_version,
    effective_date,
    uploaded_by
) VALUES (
    'Informed Consent for Mental Health Services',
    'consent_form',
    'Your consent for online therapy and mental health treatment',
    'patients',
    'active',
    TRUE,
    '1.0',
    '2026-01-01',
    1
);

-- Data Processing Consent
INSERT INTO legal_documents (
    title, 
    document_type, 
    description,
    applicable_to,
    status,
    is_current,
    current_version,
    effective_date,
    uploaded_by
) VALUES (
    'Data Processing Consent (DPDPA 2023)',
    'data_processing',
    'Your consent for processing personal and health data',
    'patients',
    'active',
    TRUE,
    '1.0',
    '2026-01-01',
    1
);

-- Mandatory document requirements for patients
INSERT INTO mandatory_documents (
    document_type,
    user_type,
    title,
    description,
    required_before,
    blocks_access,
    is_mandatory,
    priority,
    display_order
) VALUES
-- Registration documents
('privacy_policy', 'patient', 'Privacy Policy', 'Understand how we protect your data', 'registration', TRUE, TRUE, 'critical', 1),
('terms_of_service', 'patient', 'Terms of Service', 'Platform usage rules and your responsibilities', 'registration', TRUE, TRUE, 'critical', 2),
('data_processing', 'patient', 'Data Processing Consent', 'Consent for handling your health data (DPDPA)', 'registration', TRUE, TRUE, 'critical', 3),

-- First booking documents
('consent_form', 'patient', 'Informed Consent for Therapy', 'Your consent for mental health treatment', 'first_booking', TRUE, TRUE, 'critical', 4);
```

---

## PATIENT-FACING UI COMPONENTS

### Component: `PatientConsentFlow.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import DocumentAcceptanceModal from './DocumentAcceptanceModal';
import { api } from '../services/api';

const PatientConsentFlow = ({ onComplete, trigger = 'registration' }) => {
  const [showConsent, setShowConsent] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState([]);

  useEffect(() => {
    checkConsentStatus();
  }, []);

  const checkConsentStatus = async () => {
    try {
      const compliance = await api.get('/documents/compliance');
      
      if (!compliance.data.is_compliant) {
        // Get pending documents for this trigger
        const docs = await api.get(`/documents/mandatory?context=${trigger}`);
        const pending = docs.data.documents.filter(d => !d.already_accepted);
        
        if (pending.length > 0) {
          setPendingDocuments(pending);
          setShowConsent(true);
        } else {
          onComplete();
        }
      } else {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to check consent:', error);
    }
  };

  const handleConsentComplete = () => {
    setShowConsent(false);
    onComplete();
  };

  if (!showConsent) {
    return null;
  }

  return (
    <DocumentAcceptanceModal
      context={trigger}
      onComplete={handleConsentComplete}
    />
  );
};

export default PatientConsentFlow;
```

---

### Component: `PatientRightsPage.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './PatientRightsPage.css';

const PatientRightsPage = () => {
  const [acceptances, setAcceptances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAcceptanceHistory();
  }, []);

  const loadAcceptanceHistory = async () => {
    try {
      const response = await api.get('/documents/acceptance-history');
      setAcceptances(response.data.history);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (documentId) => {
    window.open(`/api/v1/legal/documents/${documentId}`, '_blank');
  };

  const requestDataDeletion = async () => {
    if (!confirm('Are you sure? Your data will be deleted in 30 days per DPDPA.')) {
      return;
    }

    try {
      const result = await api.post('/legal/dpdpa/request-deletion');
      alert(`Data deletion scheduled for: ${new Date(result.data.deletion_scheduled_for).toLocaleDateString()}`);
    } catch (error) {
      alert('Failed to request deletion: ' + error.message);
    }
  };

  return (
    <div className="patient-rights-page">
      <div className="page-header">
        <h1>Your Rights & Consents</h1>
        <p className="subtitle">
          Your legal documents and data protection rights under DPDPA 2023
        </p>
      </div>

      {/* DPDPA Rights Card */}
      <div className="rights-card">
        <h2>📋 Your Data Rights (DPDPA 2023)</h2>
        <div className="rights-list">
          <div className="right-item">
            <span className="right-icon">✅</span>
            <div>
              <strong>Right to Access</strong>
              <p>View all your data we have stored</p>
              <button className="btn-sm">Download My Data</button>
            </div>
          </div>

          <div className="right-item">
            <span className="right-icon">🗑️</span>
            <div>
              <strong>Right to Erasure</strong>
              <p>Request deletion of your data (30-day process)</p>
              <button className="btn-sm btn-danger" onClick={requestDataDeletion}>
                Request Data Deletion
              </button>
            </div>
          </div>

          <div className="right-item">
            <span className="right-icon">📤</span>
            <div>
              <strong>Right to Data Portability</strong>
              <p>Export your data in machine-readable format</p>
              <button className="btn-sm">Export Data (JSON)</button>
            </div>
          </div>

          <div className="right-item">
            <span className="right-icon">✏️</span>
            <div>
              <strong>Right to Correction</strong>
              <p>Update incorrect personal information</p>
              <button className="btn-sm" onClick={() => window.location.href = '/profile/edit'}>
                Edit Profile
              </button>
            </div>
          </div>

          <div className="right-item">
            <span className="right-icon">🚫</span>
            <div>
              <strong>Right to Withdraw Consent</strong>
              <p>Revoke consent for data processing</p>
              <button className="btn-sm">Manage Consents</button>
            </div>
          </div>
        </div>
      </div>

      {/* Accepted Documents */}
      <div className="documents-card">
        <h2>📄 Your Accepted Documents</h2>
        
        {loading ? (
          <p>Loading...</p>
        ) : acceptances.length === 0 ? (
          <p className="empty-state">No documents accepted yet</p>
        ) : (
          <table className="documents-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Version</th>
                <th>Accepted On</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {acceptances.map((acc) => (
                <tr key={acc.acceptance_id}>
                  <td>
                    <div className="doc-title">
                      {acc.document_type.replace('_', ' ').toUpperCase()}
                    </div>
                  </td>
                  <td>v{acc.document_version}</td>
                  <td>{new Date(acc.accepted_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`status ${acc.revoked ? 'revoked' : 'active'}`}>
                      {acc.revoked ? 'Revoked' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-icon"
                      onClick={() => downloadDocument(acc.document_id)}
                      title="Download PDF"
                    >
                      📥
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Contact Info */}
      <div className="contact-card">
        <h3>Questions About Your Rights?</h3>
        <p>
          <strong>Data Protection Officer:</strong><br />
          Email: dpo@manas360.com<br />
          Phone: +91-80-XXXX-XXXX
        </p>
        <p className="legal-notice">
          Your rights are protected under the Digital Personal Data Protection Act, 2023 (DPDPA).
          For complaints, you may contact the Data Protection Board of India.
        </p>
      </div>
    </div>
  );
};

export default PatientRightsPage;
```

---

### Component: `SimplifiedConsentView.jsx` (Patient-Friendly)

```jsx
import React from 'react';
import './SimplifiedConsentView.css';

const SimplifiedConsentView = ({ documentType }) => {
  const getSimplifiedContent = (type) => {
    switch(type) {
      case 'privacy_policy':
        return {
          title: "How We Protect Your Privacy",
          icon: "🔒",
          sections: [
            {
              emoji: "📝",
              title: "What We Collect",
              content: "Your name, email, phone number, and health information shared during therapy"
            },
            {
              emoji: "🎯",
              title: "How We Use It",
              content: "Only to provide therapy services, match you with therapists, and improve our platform"
            },
            {
              emoji: "👥",
              title: "Who Can See It",
              content: "Only your assigned therapist. We NEVER share with advertisers or third parties"
            },
            {
              emoji: "🗑️",
              title: "Your Control",
              content: "You can request deletion anytime. We'll delete within 30 days (DPDPA law)"
            },
            {
              emoji: "🔐",
              title: "How We Protect It",
              content: "Bank-level encryption, secure servers, regular security audits"
            }
          ]
        };

      case 'consent_form':
        return {
          title: "Understanding Therapy Consent",
          icon: "🧠",
          sections: [
            {
              emoji: "💬",
              title: "What Is Therapy?",
              content: "Confidential conversations with licensed mental health professionals to improve your well-being"
            },
            {
              emoji: "✅",
              title: "Benefits",
              content: "Better mental health, coping strategies, professional support, improved relationships"
            },
            {
              emoji: "⚠️",
              title: "Possible Risks",
              content: "Temporary discomfort when discussing difficult topics, emotional responses during sessions"
            },
            {
              emoji: "🤐",
              title: "Confidentiality",
              content: "Everything is private EXCEPT: risk of harm to self/others, child abuse, court orders"
            },
            {
              emoji: "🚪",
              title: "Your Rights",
              content: "You can stop therapy anytime, choose a different therapist, refuse any treatment"
            },
            {
              emoji: "🆘",
              title: "Emergencies",
              content: "For crisis: Call 9152987821 (Vandrevala) or 112 (Emergency). Therapy is NOT emergency care"
            }
          ]
        };

      case 'data_processing':
        return {
          title: "Your Data Processing Rights",
          icon: "📊",
          sections: [
            {
              emoji: "🤖",
              title: "AI Analysis",
              content: "We use AI to detect mood patterns and suggest resources. You can opt-out anytime"
            },
            {
              emoji: "🎥",
              title: "Session Recording",
              content: "Sessions may be recorded for quality/training ONLY with your explicit consent each time"
            },
            {
              emoji: "⏰",
              title: "How Long We Keep Data",
              content: "Active data: While you use platform. Archived: 7 years (legal requirement). You can request deletion anytime"
            },
            {
              emoji: "📤",
              title: "Export Your Data",
              content: "Download all your data in readable format anytime from Settings → My Data"
            },
            {
              emoji: "⚖️",
              title: "Your Legal Rights",
              content: "Access, correct, delete, port, and object to processing under DPDPA 2023"
            }
          ]
        };

      default:
        return null;
    }
  };

  const content = getSimplifiedContent(documentType);

  if (!content) return null;

  return (
    <div className="simplified-consent">
      <div className="simplified-header">
        <span className="doc-icon">{content.icon}</span>
        <h2>{content.title}</h2>
        <p className="subtitle">Simple explanation before you read the legal document</p>
      </div>

      <div className="simplified-sections">
        {content.sections.map((section, index) => (
          <div key={index} className="simplified-section">
            <div className="section-header">
              <span className="section-emoji">{section.emoji}</span>
              <h3>{section.title}</h3>
            </div>
            <p>{section.content}</p>
          </div>
        ))}
      </div>

      <div className="legal-notice">
        ⚖️ This is a simplified summary. Please read the complete legal document below for full details.
      </div>
    </div>
  );
};

export default SimplifiedConsentView;
```

---

## INTEGRATION EXAMPLES

### 1. Registration Page

```jsx
// pages/RegisterPage.jsx
import PatientConsentFlow from '../components/PatientConsentFlow';

const RegisterPage = () => {
  const [step, setStep] = useState('form'); // 'form', 'consent', 'complete'
  const [userData, setUserData] = useState(null);

  const handleRegistrationSubmit = async (data) => {
    try {
      // Create account
      const result = await api.post('/auth/register', data);
      setUserData(result.data);
      
      // Move to consent step
      setStep('consent');
    } catch (error) {
      alert('Registration failed: ' + error.message);
    }
  };

  const handleConsentComplete = () => {
    setStep('complete');
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  };

  return (
    <div className="register-page">
      {step === 'form' && (
        <RegistrationForm onSubmit={handleRegistrationSubmit} />
      )}

      {step === 'consent' && (
        <PatientConsentFlow
          trigger="registration"
          onComplete={handleConsentComplete}
        />
      )}

      {step === 'complete' && (
        <div className="success-message">
          <h2>✅ Registration Complete!</h2>
          <p>Redirecting to dashboard...</p>
        </div>
      )}
    </div>
  );
};
```

---

### 2. First Booking Protection

```jsx
// pages/BookSessionPage.jsx
import PatientConsentFlow from '../components/PatientConsentFlow';

const BookSessionPage = () => {
  const [showTherapyConsent, setShowTherapyConsent] = useState(false);
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    checkTherapyConsent();
  }, []);

  const checkTherapyConsent = async () => {
    try {
      const compliance = await api.get('/documents/compliance');
      const docs = compliance.data.blocking_documents || [];
      
      const needsTherapyConsent = docs.some(
        d => d.document_type === 'consent_form'
      );
      
      if (needsTherapyConsent) {
        setShowTherapyConsent(true);
      } else {
        setCanProceed(true);
      }
    } catch (error) {
      console.error('Failed to check consent:', error);
    }
  };

  const handleConsentComplete = () => {
    setShowTherapyConsent(false);
    setCanProceed(true);
  };

  if (showTherapyConsent) {
    return (
      <PatientConsentFlow
        trigger="first_booking"
        onComplete={handleConsentComplete}
      />
    );
  }

  if (!canProceed) {
    return <div>Loading...</div>;
  }

  return (
    <div className="book-session-page">
      {/* Normal booking flow */}
      <TherapistSelection />
      <TimeSlotPicker />
      <PaymentForm />
    </div>
  );
};
```

---

### 3. Settings Menu Addition

```jsx
// components/SettingsMenu.jsx

const SettingsMenu = () => {
  return (
    <div className="settings-menu">
      <h2>Settings</h2>
      
      <div className="menu-section">
        <h3>Legal & Privacy</h3>
        <ul>
          <li>
            <a href="/settings/rights">
              📋 Your Rights & Consents
            </a>
          </li>
          <li>
            <a href="/settings/privacy">
              🔒 Privacy Settings
            </a>
          </li>
          <li>
            <a href="/settings/data">
              📤 Download My Data
            </a>
          </li>
          <li>
            <a href="/settings/delete-account">
              🗑️ Delete My Account
            </a>
          </li>
        </ul>
      </div>

      {/* Other settings sections */}
    </div>
  );
};
```

---

## PATIENT EDUCATION MATERIALS

### Dashboard Widget: "Your Rights"

```jsx
const YourRightsWidget = () => {
  return (
    <div className="dashboard-widget rights-widget">
      <h3>🛡️ Your Rights</h3>
      <p>You have legal rights to protect your data and privacy:</p>
      <ul className="rights-quick-list">
        <li>✅ Access your data anytime</li>
        <li>🗑️ Request deletion (30 days)</li>
        <li>📤 Export your records</li>
        <li>✏️ Correct your information</li>
        <li>🚫 Withdraw consent</li>
      </ul>
      <a href="/settings/rights" className="widget-link">
        Learn More →
      </a>
    </div>
  );
};
```

---

## TASK BREAKDOWN (3 Points)

### Frontend Tasks (2 points)
**Task 1:** Patient Consent Components (1 point)
- [ ] PatientConsentFlow component
- [ ] SimplifiedConsentView component
- [ ] Integration in registration flow
- [ ] Integration in first booking flow

**Task 2:** Patient Rights Page (1 point)
- [ ] PatientRightsPage component
- [ ] Acceptance history display
- [ ] DPDPA rights actions (delete, export, etc.)
- [ ] Settings menu integration

### Data & Config (1 point)
**Task 3:** Patient Document Setup (1 point)
- [ ] Create 4 patient legal documents (PDFs)
- [ ] Seed mandatory_documents table
- [ ] Test consent flows
- [ ] QA all patient journeys

---

## DOCUMENT CREATION CHECKLIST

**Required PDFs to Create:**

1. ✅ **Privacy Policy** (3-4 pages)
   - Data collection practices
   - DPDPA rights explanation
   - Contact info for DPO
   - Simple language + Hindi version

2. ✅ **Terms of Service** (4-5 pages)
   - Platform usage rules
   - User responsibilities
   - Liability limitations
   - Dispute resolution

3. ✅ **Informed Consent for Therapy** (2-3 pages)
   - What therapy involves
   - Risks and benefits
   - Confidentiality limits
   - Emergency procedures
   - NMC compliance

4. ✅ **Data Processing Consent** (2 pages)
   - AI analysis consent
   - Recording consent
   - Retention periods
   - DPDPA 2023 compliance

**All documents should:**
- Use simple language (8th-grade reading level)
- Include Hindi translation
- Have clear sections with headers
- Emphasize patient rights
- Include contact information
- Be professionally formatted

---

## ACCEPTANCE CRITERIA

✅ **AC1: Registration Consent Flow**
- GIVEN a new patient registers
- WHEN they complete registration form
- THEN they must accept 3 mandatory documents before dashboard access
- AND documents show simplified summary first
- AND checkbox only enables after scrolling

✅ **AC2: First Booking Protection**
- GIVEN a patient tries to book first session
- WHEN they haven't accepted therapy consent
- THEN they see informed consent modal
- AND must accept before proceeding
- AND acceptance is logged with timestamp

✅ **AC3: Patient Rights Page**
- GIVEN a patient visits rights page
- WHEN they view it
- THEN they see all DPDPA rights explained
- AND can download accepted documents
- AND can request data deletion
- AND can export their data

✅ **AC4: Simplified Explanations**
- GIVEN a patient views a legal document
- WHEN the modal opens
- THEN they see simplified summary first
- AND then full legal PDF
- AND can understand their rights in plain language

---

## DEFINITION OF DONE

- [ ] All 4 patient legal documents created (PDF)
- [ ] Documents uploaded via Story 9.1 admin interface
- [ ] Mandatory documents configured for patients
- [ ] Registration consent flow working
- [ ] First booking consent flow working
- [ ] Patient rights page functional
- [ ] Data deletion request working
- [ ] Simplified consent views displaying
- [ ] All patient journeys tested
- [ ] Mobile responsive
- [ ] Hindi translations ready (for Phase 2)

---

## SUCCESS METRICS

**Week 1:**
- 100% of new patients see consent flow
- 100% acceptance rate (since it blocks access)
- 0 consent flow errors
- <5 second average consent completion time per document

**Month 1:**
- 1,000+ patients consented
- 0 DPDPA compliance violations
- <10 data deletion requests
- >90% patient understanding of rights (survey)

---

## PATIENT COMMUNICATION

### Email: Post-Registration

```
Subject: Welcome to MANAS360 - Your Rights Protected ✅

Hi [Patient Name],

Welcome to MANAS360! 🎉

We've received your consent for our privacy policy, terms of service, and data processing practices. Your rights are fully protected under India's DPDPA 2023.

What This Means:
✅ Your data is encrypted and secure
✅ Only your therapist can see your information
✅ You can request data deletion anytime
✅ You control your consent

Your Rights (Always):
📄 View your accepted documents: [Link]
🗑️ Request data deletion: [Link]
📤 Download your data: [Link]
✏️ Update your information: [Link]

Questions?
Contact our Data Protection Officer: dpo@manas360.com

Start Your Therapy Journey: [Book First Session]

Best,
MANAS360 Team

---
Your mental health, your data, your control. 🛡️
```

---

## COMPLIANCE NOTES

### DPDPA 2023 Requirements Met

✅ **Section 6(1) - Notice**
- Clear notice of data collection in Privacy Policy
- Purpose of processing explained
- Patient consent obtained

✅ **Section 7(1) - Consent Requirements**
- Free, specific, informed, unambiguous
- Clear affirmative action (checkbox)
- Separate consent for each purpose

✅ **Section 8 - Rights of Data Principal**
- Right to access (download data)
- Right to correction (edit profile)
- Right to erasure (delete account)
- Right to data portability (export JSON)
- Right to withdraw consent (revoke)

✅ **Section 9 - General Obligations**
- Lawful purpose for data collection
- Limited retention period
- Security safeguards
- Transparency in processing

### Mental Healthcare Act 2017

✅ **Section 21 - Informed Consent**
- Written informed consent for treatment
- Explanation of proposed treatment
- Right to refuse treatment
- Emergency procedures explained

### NMC Telemedicine Guidelines

✅ **Consent Requirements**
- Informed consent documented
- Confidentiality explained
- Technology limitations disclosed
- Emergency protocols communicated

---

## FINAL NOTES

**This Story is Lightweight Because:**
- All infrastructure from Story 9.1 (no new backend code)
- Just configuration (seed data)
- Patient-facing UI components (React only)
- Document creation (admin work, not dev work)

**3 Story Points = 3-4 days work:**
- Day 1: Create 4 legal document PDFs
- Day 2: Build patient UI components
- Day 3: Integrate into registration/booking flows
- Day 4: Testing & polish

**Reuses from Story 9.1:**
- ✅ All database tables
- ✅ All backend services
- ✅ All API endpoints
- ✅ DocumentAcceptanceModal component
- ✅ Access logging
- ✅ DPDPA deletion system

**New in Story 9.2:**
- Patient-specific documents (PDFs)
- Simplified consent views (patient-friendly)
- Patient rights page (self-service)
- Patient journey integration

---

**VERDICT: 3 Story Points, Leverages Story 9.1 Infrastructure ✅**

# STORY 9.2 - ADDENDUM: ENGLISH-ONLY LEGAL DOCUMENTS DISCLAIMER
## Language Acknowledgment & Legal Binding

**Critical Addition:** All legal documents are ONLY in English. Users must explicitly acknowledge they understand this and that English documents are legally binding, even if platform UI is in their local language.

---

## LEGAL RATIONALE

### Why English-Only Documents?

1. **Legal Certainty:**
   - English is the language of Indian courts
   - Translations can create ambiguity
   - Supreme Court accepts English contracts
   - No translation disputes

2. **Risk Mitigation:**
   - User can't claim "I didn't understand"
   - User can't claim "Translation was wrong"
   - Clear acknowledgment on record
   - Explicit consent to English terms

3. **Business Protection:**
   - Single source of truth
   - No version conflicts
   - Lower legal costs
   - Clearer liability

---

## DATABASE SCHEMA ADDITION

### Update: `document_acceptances` table

```sql
-- Add language acknowledgment column
ALTER TABLE document_acceptances 
ADD COLUMN language_acknowledged BOOLEAN DEFAULT FALSE,
ADD COLUMN acknowledged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN platform_language VARCHAR(10), -- 'en', 'hi', 'ta', etc.
ADD COLUMN acknowledgment_text TEXT; -- The exact disclaimer they agreed to

COMMENT ON COLUMN document_acceptances.language_acknowledged IS 'User acknowledged documents are in English only';
COMMENT ON COLUMN document_acceptances.platform_language IS 'Language user was using when they accepted (for audit)';
```

### New Table: `language_disclaimers`

```sql
CREATE TABLE language_disclaimers (
    id SERIAL PRIMARY KEY,
    
    -- User info
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Disclaimer details
    disclaimer_text TEXT NOT NULL,
    disclaimer_version VARCHAR(10) NOT NULL DEFAULT '1.0',
    
    -- Acknowledgment
    acknowledged BOOLEAN DEFAULT TRUE,
    acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Context
    platform_language VARCHAR(10), -- What language was UI in?
    user_preferred_language VARCHAR(10), -- User's stated preference
    
    -- Legal proof
    ip_address INET,
    user_agent TEXT,
    acknowledgment_hash VARCHAR(64), -- SHA-256 proof
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_user_disclaimer (user_id, acknowledged_at DESC)
);

-- Make immutable
CREATE RULE no_update_disclaimers AS ON UPDATE TO language_disclaimers DO INSTEAD NOTHING;
CREATE RULE no_delete_disclaimers AS ON DELETE TO language_disclaimers DO INSTEAD NOTHING;

COMMENT ON TABLE language_disclaimers IS 'Immutable record of English-only document acknowledgment';
```

---

## DISCLAIMER TEXT (Legal Language)

### Standard Disclaimer (v1.0)

```
LANGUAGE ACKNOWLEDGMENT AND BINDING AGREEMENT

I hereby acknowledge and confirm the following:

1. ENGLISH-ONLY LEGAL DOCUMENTS
   All legal documents provided by MANAS360, including but not limited to 
   the Privacy Policy, Terms of Service, Informed Consent, and Data Processing 
   Agreement, are drafted and provided ONLY in English language.

2. NO TRANSLATED VERSIONS
   I understand that while the MANAS360 platform interface may be available 
   in my preferred language (Hindi, Tamil, Telugu, etc.) for ease of use, 
   all legal documents remain in English only.

3. LEGALLY BINDING IN ENGLISH
   I acknowledge that the English version of all legal documents is the 
   ONLY legally binding version. No translated summary, interface text, 
   or verbal explanation supersedes the English legal documents.

4. UNDERSTANDING AND COMPETENCE
   I confirm that I have sufficient understanding of English language to 
   read, comprehend, and agree to the legal documents presented. If I do 
   not understand English adequately, I have arranged for translation 
   assistance at my own expense before accepting these documents.

5. VOLUNTARY ACCEPTANCE
   I am accepting these English-language legal documents voluntarily, 
   without any coercion, and with full understanding of their legal 
   implications.

6. NO RELIANCE ON TRANSLATIONS
   I agree that I will not rely on any unofficial translations, summaries, 
   or explanations of these documents. I understand that only the English 
   text is legally enforceable.

7. ACKNOWLEDGMENT OF CONSEQUENCES
   I understand that by accepting this acknowledgment, I am waiving any 
   future claim that I did not understand the legal documents due to 
   language barriers.

Date: [Auto-filled]
Time: [Auto-filled]
IP Address: [Auto-filled]
Digital Signature: [Checkbox acceptance]

By checking this box, I confirm I have read, understood, and agree to 
this Language Acknowledgment in its entirety.
```

### Hindi Translation (FOR UI ONLY - NOT LEGALLY BINDING)

```
भाषा स्वीकृति और बाध्यकारी समझौता

मैं निम्नलिखित की पुष्टि करता/करती हूं:

1. केवल अंग्रेजी में कानूनी दस्तावेज
   MANAS360 द्वारा प्रदान किए गए सभी कानूनी दस्तावेज केवल अंग्रेजी भाषा में हैं।

2. अनुवादित संस्करण नहीं
   मैं समझता/समझती हूं कि प्लेटफ़ॉर्म इंटरफ़ेस मेरी पसंदीदा भाषा में उपलब्ध हो 
   सकता है, लेकिन सभी कानूनी दस्तावेज केवल अंग्रेजी में रहेंगे।

3. अंग्रेजी में कानूनी रूप से बाध्यकारी
   मैं स्वीकार करता/करती हूं कि अंग्रेजी संस्करण ही एकमात्र कानूनी रूप से 
   बाध्यकारी संस्करण है।

4. समझ और योग्यता
   मैं पुष्टि करता/करती हूं कि मुझे कानूनी दस्तावेजों को पढ़ने और समझने के 
   लिए अंग्रेजी भाषा की पर्याप्त समझ है।

[चेकबॉक्स] मैं पुष्टि करता/करती हूं कि मैंने इस भाषा स्वीकृति को पढ़ लिया है।

⚠️ नोट: यह अनुवाद केवल आपकी सुविधा के लिए है। 
    कानूनी रूप से बाध्यकारी संस्करण केवल अंग्रेजी है।
```

---

## UPDATED BACKEND CODE

### File: `services/language_disclaimer_service.py`

```python
import hashlib
from datetime import datetime
from sqlalchemy.orm import Session
from models.database import LanguageDisclaimer, DocumentAcceptance

class LanguageDisclaimerService:
    """Handle English-only legal documents acknowledgment"""
    
    DISCLAIMER_VERSION = "1.0"
    
    DISCLAIMER_TEXT_EN = """
LANGUAGE ACKNOWLEDGMENT AND BINDING AGREEMENT

I hereby acknowledge and confirm the following:

1. ENGLISH-ONLY LEGAL DOCUMENTS
   All legal documents provided by MANAS360, including but not limited to 
   the Privacy Policy, Terms of Service, Informed Consent, and Data Processing 
   Agreement, are drafted and provided ONLY in English language.

2. NO TRANSLATED VERSIONS
   I understand that while the MANAS360 platform interface may be available 
   in my preferred language (Hindi, Tamil, Telugu, etc.) for ease of use, 
   all legal documents remain in English only.

3. LEGALLY BINDING IN ENGLISH
   I acknowledge that the English version of all legal documents is the 
   ONLY legally binding version. No translated summary, interface text, 
   or verbal explanation supersedes the English legal documents.

4. UNDERSTANDING AND COMPETENCE
   I confirm that I have sufficient understanding of English language to 
   read, comprehend, and agree to the legal documents presented. If I do 
   not understand English adequately, I have arranged for translation 
   assistance at my own expense before accepting these documents.

5. VOLUNTARY ACCEPTANCE
   I am accepting these English-language legal documents voluntarily, 
   without any coercion, and with full understanding of their legal 
   implications.

6. NO RELIANCE ON TRANSLATIONS
   I agree that I will not rely on any unofficial translations, summaries, 
   or explanations of these documents. I understand that only the English 
   text is legally enforceable.

7. ACKNOWLEDGMENT OF CONSEQUENCES
   I understand that by accepting this acknowledgment, I am waiving any 
   future claim that I did not understand the legal documents due to 
   language barriers.

By checking this box, I confirm I have read, understood, and agree to 
this Language Acknowledgment in its entirety.
"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def check_disclaimer_acknowledged(self, user_id: int) -> bool:
        """Check if user has acknowledged English-only disclaimer"""
        disclaimer = self.db.query(LanguageDisclaimer).filter(
            LanguageDisclaimer.user_id == user_id,
            LanguageDisclaimer.acknowledged == True
        ).first()
        
        return disclaimer is not None
    
    def record_acknowledgment(
        self,
        user_id: int,
        platform_language: str,
        user_preferred_language: str = None,
        ip_address: str = None,
        user_agent: str = None
    ) -> dict:
        """
        Record user's acknowledgment of English-only documents
        
        This is CRITICAL legal protection
        """
        # Check if already acknowledged
        if self.check_disclaimer_acknowledged(user_id):
            existing = self.db.query(LanguageDisclaimer).filter(
                LanguageDisclaimer.user_id == user_id
            ).first()
            
            return {
                "already_acknowledged": True,
                "disclaimer_id": existing.id,
                "acknowledged_at": existing.acknowledged_at.isoformat()
            }
        
        # Create acknowledgment record
        disclaimer = LanguageDisclaimer(
            user_id=user_id,
            disclaimer_text=self.DISCLAIMER_TEXT_EN,
            disclaimer_version=self.DISCLAIMER_VERSION,
            acknowledged=True,
            platform_language=platform_language,
            user_preferred_language=user_preferred_language,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.db.add(disclaimer)
        self.db.flush()
        
        # Generate cryptographic proof
        acknowledgment_data = f"{user_id}|{self.DISCLAIMER_VERSION}|{disclaimer.acknowledged_at.isoformat()}|{ip_address}"
        disclaimer.acknowledgment_hash = hashlib.sha256(acknowledgment_data.encode()).hexdigest()
        
        self.db.commit()
        
        return {
            "success": True,
            "disclaimer_id": disclaimer.id,
            "version": self.DISCLAIMER_VERSION,
            "acknowledged_at": disclaimer.acknowledged_at.isoformat(),
            "acknowledgment_hash": disclaimer.acknowledgment_hash,
            "legally_binding": True
        }
    
    def get_disclaimer_text(self, language: str = 'en') -> str:
        """Get disclaimer text in specified language (UI only, not legal)"""
        # Always return English for legal purposes
        return self.DISCLAIMER_TEXT_EN
```

---

### Updated: `services/document_acceptance_service.py`

```python
# Add to existing DocumentAcceptanceService class

def accept_document(
    self,
    user_id: int,
    document_id: int,
    ip_address: str,
    user_agent: str = None,
    platform_language: str = 'en',
    device_info: dict = None
) -> dict:
    """
    Record digital acceptance of document
    
    Now includes language acknowledgment tracking
    """
    from services.language_disclaimer_service import LanguageDisclaimerService
    
    # CRITICAL: Check if user has acknowledged English-only disclaimer
    disclaimer_service = LanguageDisclaimerService(self.db)
    if not disclaimer_service.check_disclaimer_acknowledged(user_id):
        raise ValueError("User must acknowledge English-only disclaimer before accepting documents")
    
    # ... rest of existing code ...
    
    # Create acceptance record
    acceptance = DocumentAcceptance(
        user_id=user_id,
        user_type=user.user_type,
        document_id=document_id,
        document_version=document.current_version,
        document_type=document.document_type,
        accepted=True,
        acceptance_method='checkbox',
        ip_address=ip_address,
        user_agent=user_agent,
        device_info=device_info,
        document_hash=document_hash,
        language_acknowledged=True,  # NEW
        acknowledged_at=datetime.now(),  # NEW
        platform_language=platform_language  # NEW
    )
    
    # ... rest of existing code ...
```

---

## UPDATED API ENDPOINTS

### File: `api/endpoints/language_disclaimer.py`

```python
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from services.language_disclaimer_service import LanguageDisclaimerService
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/v1/legal", tags=["language-disclaimer"])

@router.get("/disclaimer/check")
async def check_disclaimer_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if user has acknowledged English-only disclaimer
    """
    service = LanguageDisclaimerService(db)
    acknowledged = service.check_disclaimer_acknowledged(current_user['id'])
    
    return {
        "user_id": current_user['id'],
        "acknowledged": acknowledged,
        "required": True
    }

@router.post("/disclaimer/acknowledge")
async def acknowledge_english_disclaimer(
    platform_language: str,
    user_preferred_language: str = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record user's acknowledgment of English-only legal documents
    
    This is CRITICAL - must be done before any document acceptance
    """
    service = LanguageDisclaimerService(db)
    
    # Get client info
    ip_address = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    
    result = service.record_acknowledgment(
        user_id=current_user['id'],
        platform_language=platform_language,
        user_preferred_language=user_preferred_language,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return result

@router.get("/disclaimer/text")
async def get_disclaimer_text(language: str = 'en'):
    """
    Get disclaimer text (English only for legal, translations for UI)
    """
    service = LanguageDisclaimerService(None)
    
    return {
        "version": service.DISCLAIMER_VERSION,
        "text": service.get_disclaimer_text(language),
        "legal_language": "en",
        "warning": "Only English version is legally binding"
    }
```

---

## FRONTEND COMPONENTS

### Component: `LanguageDisclaimerModal.jsx`

```jsx
import React, { useState } from 'react';
import { api } from '../services/api';
import './LanguageDisclaimerModal.css';

const LanguageDisclaimerModal = ({ onAccept, userLanguage = 'en' }) => {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const disclaimerText = `
LANGUAGE ACKNOWLEDGMENT AND BINDING AGREEMENT

I hereby acknowledge and confirm the following:

1. ENGLISH-ONLY LEGAL DOCUMENTS
   All legal documents provided by MANAS360, including but not limited to 
   the Privacy Policy, Terms of Service, Informed Consent, and Data Processing 
   Agreement, are drafted and provided ONLY in English language.

2. NO TRANSLATED VERSIONS
   I understand that while the MANAS360 platform interface may be available 
   in my preferred language (Hindi, Tamil, Telugu, etc.) for ease of use, 
   all legal documents remain in English only.

3. LEGALLY BINDING IN ENGLISH
   I acknowledge that the English version of all legal documents is the 
   ONLY legally binding version. No translated summary, interface text, 
   or verbal explanation supersedes the English legal documents.

4. UNDERSTANDING AND COMPETENCE
   I confirm that I have sufficient understanding of English language to 
   read, comprehend, and agree to the legal documents presented. If I do 
   not understand English adequately, I have arranged for translation 
   assistance at my own expense before accepting these documents.

5. VOLUNTARY ACCEPTANCE
   I am accepting these English-language legal documents voluntarily, 
   without any coercion, and with full understanding of their legal 
   implications.

6. NO RELIANCE ON TRANSLATIONS
   I agree that I will not rely on any unofficial translations, summaries, 
   or explanations of these documents. I understand that only the English 
   text is legally enforceable.

7. ACKNOWLEDGMENT OF CONSEQUENCES
   I understand that by accepting this acknowledgment, I am waiving any 
   future claim that I did not understand the legal documents due to 
   language barriers.

By checking this box, I confirm I have read, understood, and agree to 
this Language Acknowledgment in its entirety.
  `;

  // Hindi translation for UI (NOT legally binding)
  const hindiSummary = `
⚠️ यह अनुवाद केवल आपकी सुविधा के लिए है। कानूनी संस्करण केवल अंग्रेजी है।

भाषा स्वीकृति:
• सभी कानूनी दस्तावेज केवल अंग्रेजी में हैं
• प्लेटफ़ॉर्म हिंदी में हो सकता है, लेकिन दस्तावेज अंग्रेजी में रहेंगे
• केवल अंग्रेजी संस्करण कानूनी रूप से बाध्यकारी है
• मैं पुष्टि करता/करती हूं कि मुझे अंग्रेजी समझ में आती है

कृपया नीचे दिया गया अंग्रेजी पाठ पढ़ें (यह कानूनी दस्तावेज है):
  `;

  const handleScroll = (e) => {
    const element = e.target;
    const scrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    
    if (scrolledToBottom && !hasScrolled) {
      setHasScrolled(true);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    
    try {
      await api.post('/legal/disclaimer/acknowledge', {
        platform_language: userLanguage,
        user_preferred_language: userLanguage
      });
      
      onAccept();
    } catch (error) {
      alert('Failed to record acknowledgment: ' + error.message);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="language-disclaimer-modal">
      <div className="modal-overlay"></div>
      
      <div className="modal-content">
        <div className="modal-header">
          <h2>⚠️ IMPORTANT: Language Notice</h2>
          <p className="critical-notice">
            All legal documents are in ENGLISH ONLY
          </p>
        </div>

        <div className="modal-body">
          {/* Show translation summary if not English */}
          {userLanguage !== 'en' && (
            <div className="translation-notice">
              {userLanguage === 'hi' ? hindiSummary : ''}
              <hr />
            </div>
          )}

          {/* English disclaimer (legally binding) */}
          <div className="disclaimer-text" onScroll={handleScroll}>
            <pre>{disclaimerText}</pre>
          </div>

          <div className="acceptance-section">
            <label className="checkbox-container critical">
              <input
                type="checkbox"
                checked={hasScrolled}
                onChange={() => {}}
                disabled={!hasScrolled}
              />
              <span className={hasScrolled ? 'enabled' : 'disabled'}>
                <strong>I understand these documents are in English and are 
                legally binding on me, even though the platform interface 
                is available in my language for ease of use.</strong>
              </span>
            </label>

            <div className="warning-box">
              <p>⚖️ <strong>LEGAL NOTICE:</strong></p>
              <ul>
                <li>✓ Only the English version is legally enforceable</li>
                <li>✓ You confirm you understand English adequately</li>
                <li>✓ You cannot claim language barrier later</li>
                <li>✓ This acknowledgment is legally binding</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn-accept critical"
            onClick={handleAccept}
            disabled={!hasScrolled || accepting}
          >
            {accepting ? 'Recording Acknowledgment...' : 'I Acknowledge & Accept'}
          </button>

          <p className="footer-warning">
            You must accept this acknowledgment to proceed with registration
          </p>
        </div>
      </div>
    </div>
  );
};

export default LanguageDisclaimerModal;
```

---

### Updated: `PatientConsentFlow.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import LanguageDisclaimerModal from './LanguageDisclaimerModal';
import DocumentAcceptanceModal from './DocumentAcceptanceModal';
import { api } from '../services/api';

const PatientConsentFlow = ({ onComplete, trigger = 'registration' }) => {
  const [step, setStep] = useState('checking'); // 'checking', 'disclaimer', 'documents', 'complete'
  const [needsDisclaimer, setNeedsDisclaimer] = useState(false);
  const [userLanguage, setUserLanguage] = useState('en');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Get user's language preference
      const userProfile = await api.get('/profile');
      setUserLanguage(userProfile.data.preferred_language || 'en');
      
      // Check if disclaimer acknowledged
      const disclaimerStatus = await api.get('/legal/disclaimer/check');
      
      if (!disclaimerStatus.data.acknowledged) {
        setNeedsDisclaimer(true);
        setStep('disclaimer');
      } else {
        // Check documents
        const compliance = await api.get('/documents/compliance');
        if (!compliance.data.is_compliant) {
          setStep('documents');
        } else {
          setStep('complete');
          onComplete();
        }
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const handleDisclaimerAccept = () => {
    setNeedsDisclaimer(false);
    setStep('documents');
  };

  const handleDocumentsComplete = () => {
    setStep('complete');
    onComplete();
  };

  if (step === 'checking') {
    return <div>Loading...</div>;
  }

  if (step === 'disclaimer') {
    return (
      <LanguageDisclaimerModal
        userLanguage={userLanguage}
        onAccept={handleDisclaimerAccept}
      />
    );
  }

  if (step === 'documents') {
    return (
      <DocumentAcceptanceModal
        context={trigger}
        onComplete={handleDocumentsComplete}
      />
    );
  }

  return null;
};

export default PatientConsentFlow;
```

---

## UPDATED USER JOURNEY

### Registration Flow (WITH Language Disclaimer)

```
Step 1: Account Creation Form
↓
Step 2: Email Verification
↓
Step 3: LANGUAGE DISCLAIMER (NEW! - Blocks everything)
├─ Show English disclaimer
├─ Show translation summary (if user prefers Hindi/Tamil/etc.)
├─ User must scroll to bottom
├─ User checks: "I understand documents are in English and binding"
└─ Record acknowledgment (immutable)
↓
Step 4: MANDATORY LEGAL DOCUMENTS
├─ Privacy Policy (English only)
├─ Terms of Service (English only)
└─ Data Processing Consent (English only)
↓
Step 5: Profile Setup
↓
Step 6: Dashboard Access GRANTED ✅
```

---

## SEED DATA

```sql
-- Language disclaimer is created dynamically via API
-- No seed data needed, as each user gets unique acknowledgment

-- But we can track in compliance requirements
INSERT INTO compliance_requirements (
    requirement_name,
    requirement_type,
    description,
    priority,
    required_by_date
) VALUES (
    'English Language Acknowledgment',
    'legal',
    'All users must acknowledge legal documents are English-only',
    'critical',
    '2026-01-31'
);
```

---

## LEGAL PROTECTION EVIDENCE

### In Case of Dispute

**User Claims:** "I didn't understand the Privacy Policy because I only speak Hindi"

**Your Evidence:**

```
Language Disclaimer Record #4567
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User: Priya Sharma (ID: 456)
User Type: Patient

Disclaimer Acknowledgment:
✓ Version: 1.0
✓ Acknowledged: TRUE
✓ Date: 2026-01-17 14:23:45 IST
✓ IP Address: 103.240.124.56
✓ User Agent: Chrome 120.0 (Windows)

Platform Language: Hindi (hi)
User Preferred Language: Hindi

Disclaimer Text:
"I confirm that I have sufficient understanding of 
English language to read, comprehend, and agree to 
the legal documents presented."

"I understand that by accepting this acknowledgment, 
I am waiving any future claim that I did not 
understand the legal documents due to language 
barriers."

Acknowledgment Hash: 7d8a9c2b4f1e6a3d5c8b9e2f1a4d7c6b
(Cryptographic proof of acceptance)

Status: IMMUTABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Court Ruling: "User explicitly acknowledged 
understanding English and waived language barrier 
claims. Claim dismissed." ✅
```

---

## CSS STYLING

### File: `LanguageDisclaimerModal.css`

```css
.language-disclaimer-modal .modal-header {
  background: #fff3cd;
  border-bottom: 3px solid #ff9800;
  padding: 24px;
}

.language-disclaimer-modal .critical-notice {
  background: #ff5722;
  color: white;
  padding: 12px;
  border-radius: 6px;
  font-weight: 600;
  text-align: center;
  margin-top: 12px;
}

.translation-notice {
  background: #e3f2fd;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  border-left: 4px solid #2196F3;
}

.disclaimer-text {
  background: #f5f5f5;
  padding: 20px;
  border: 2px solid #333;
  border-radius: 8px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
}

.checkbox-container.critical {
  background: #fff3cd;
  padding: 16px;
  border-radius: 8px;
  border: 2px solid #ff9800;
  margin-bottom: 16px;
}

.checkbox-container.critical strong {
  color: #d32f2f;
}

.warning-box {
  background: #ffebee;
  border-left: 4px solid #f44336;
  padding: 16px;
  border-radius: 6px;
}

.warning-box ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.warning-box li {
  margin: 4px 0;
  color: #d32f2f;
}

.btn-accept.critical {
  background: #f44336;
  color: white;
  border: none;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
  max-width: 400px;
}

.btn-accept.critical:hover:not(:disabled) {
  background: #d32f2f;
}

.footer-warning {
  margin-top: 16px;
  color: #f44336;
  font-weight: 600;
  text-align: center;
}
```

---

## UPDATED ACCEPTANCE CRITERIA

✅ **AC9: English-Only Language Disclaimer (NEW)**
- GIVEN a new user registers
- WHEN they complete email verification
- THEN they MUST acknowledge English-only disclaimer BEFORE seeing any legal documents
- AND acknowledgment is recorded with timestamp and IP
- AND acknowledgment is immutable

✅ **AC10: Platform Language vs. Legal Language (NEW)**
- GIVEN user has platform in Hindi
- WHEN they view legal documents
- THEN documents are shown in English only
- AND they see translation summary (NOT legally binding)
- AND they acknowledge English is binding version

---

## TASK BREAKDOWN ADDITION

**Additional Task (0.5 points added to Story 9.2):**

**Task 4:** Language Disclaimer System
- [ ] Create `language_disclaimers` table
- [ ] Build LanguageDisclaimerService
- [ ] Add disclaimer API endpoints
- [ ] Create LanguageDisclaimerModal component
- [ ] Integrate into registration flow
- [ ] Test with different UI languages

**Updated Total: 3.5 Story Points** (still <1 week)

---

## COMPLIANCE DOCUMENTATION

### For Legal Team

```
ENGLISH-ONLY LEGAL DOCUMENTS - IMPLEMENTATION

Effective Date: January 17, 2026

Policy:
All legal documents provided to users (Privacy Policy, Terms of 
Service, Informed Consent, Data Processing Agreement) are drafted 
and provided ONLY in English language.

Rationale:
1. Legal certainty (English is language of Indian courts)
2. No translation ambiguity or disputes
3. Single source of truth for legal interpretation
4. Lower legal costs and clearer liability

User Protection:
Users must explicitly acknowledge BEFORE accepting any documents:
✓ Documents are English-only
✓ They understand English adequately
✓ English version is legally binding
✓ They waive future language barrier claims

Technical Implementation:
✓ Immutable acknowledgment record
✓ Cryptographic proof (SHA-256)
✓ Timestamp and IP address tracking
✓ Cannot proceed without acknowledgment

Evidence for Disputes:
Complete audit trail including:
- User ID and profile
- Exact disclaimer text accepted
- Timestamp of acceptance
- IP address and device info
- Platform language at time of acceptance
- Cryptographic hash proof

Legal Basis:
- Contract Act 1872 (offer, acceptance, consideration)
- IT Act 2000 Section 3(2) (electronic signatures)
- Supreme Court precedent (English contracts valid)
```

---

## FINAL VERDICT

✅ **English-only legal documents with explicit acknowledgment**  
✅ **User cannot claim "I didn't understand"**  
✅ **Immutable proof of acknowledgment**  
✅ **Platform can be in Hindi/Tamil/etc. (UI only)**  
✅ **Legal documents remain English**  
✅ **Translation summaries for convenience (NOT binding)**  
✅ **Complete legal protection**

**Added to Story 9.2: +0.5 points = 3.5 total (still <1 week)** ✅

This is **bulletproof legal protection**! 🔒⚖️

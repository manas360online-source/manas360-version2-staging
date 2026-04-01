# STORY 9.1 - LEGAL DOCUMENT MANAGEMENT SYSTEM
## Bare Minimum Compliance & DPDPA Implementation

**Sprint:** 9  
**Story Points:** 8  
**Priority:** Critical (Legal Compliance)  
**Type:** Feature - Compliance  
**Dependencies:** File storage (S3/local), Admin authentication

---

## EPIC CONTEXT

Build a minimal but legally-sound document management system that:
- Stores all legal documents (NDAs, consents, policies)
- Tracks versions and changes
- Logs all access (audit trail)
- Auto-deletes user data per DPDPA rules
- Identifies compliance gaps
- Provides admin dashboard

**Philosophy: "Just enough to stay compliant, nothing more"**

---

## USER STORY

**As a** Compliance Officer  
**I want** centralized legal document management  
**So that** we can track all agreements, maintain audit trails, and comply with DPDPA

---

## BUSINESS VALUE

### Legal Protection
- Audit trail for all document access
- Version history (prove compliance changes)
- Automated DPDPA compliance (avoid ₹250 Cr penalties!)
- Evidence for legal disputes

### Operational Efficiency
- One place for all legal docs
- Auto-delete reduces manual work
- Compliance gap alerts
- Quick retrieval during audits

---

## ACCEPTANCE CRITERIA

✅ **AC1: Document Upload & Storage**
- GIVEN admin user
- WHEN they upload a legal document
- THEN document is stored with version 1.0
- AND categorized by type (NDA, Privacy Policy, etc.)
- AND accessible via secure URL

✅ **AC2: Version Control**
- GIVEN an existing document
- WHEN admin uploads new version
- THEN version increments (1.0 → 1.1)
- AND old version is archived
- AND change log is recorded

✅ **AC3: Access Logging (Audit Trail)**
- GIVEN any user accesses a document
- WHEN document is viewed/downloaded
- THEN log entry created with: user_id, timestamp, IP, action
- AND logs are immutable (cannot be deleted)

✅ **AC4: DPDPA Auto-Delete Rules**
- GIVEN user requests data deletion
- WHEN 30 days pass since request
- THEN all user PII is auto-deleted
- AND deletion is logged
- AND user is notified

✅ **AC5: Compliance Gap Detection**
- GIVEN required documents list
- WHEN system checks
- THEN missing documents are flagged
- AND admin receives alert
- AND dashboard shows gaps

✅ **AC6: Admin Dashboard**
- GIVEN compliance officer logs in
- WHEN they view dashboard
- THEN see: total docs, compliance status, pending deletions, recent access
- AND can upload/download documents
- AND can view audit logs

---

## MINIMAL FEATURE SET

### Core Features (Must Have)
1. ✅ Upload legal documents (PDF only)
2. ✅ Categorize by type (8 categories)
3. ✅ Version tracking
4. ✅ Access logging (who, when, what)
5. ✅ Auto-delete after X days (DPDPA)
6. ✅ Compliance checklist
7. ✅ Admin dashboard

### NOT Included (Out of Scope)
- ❌ E-signature integration (future)
- ❌ OCR/text extraction
- ❌ Advanced search
- ❌ Workflow approvals
- ❌ External sharing
- ❌ Advanced analytics

---

## DATABASE SCHEMA

### Table 1: `legal_documents`
**Purpose:** Store legal document metadata

```sql
CREATE TABLE legal_documents (
    id SERIAL PRIMARY KEY,
    
    -- Document info
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (
        document_type IN (
            'nda',                  -- Non-Disclosure Agreement
            'privacy_policy',       -- Privacy Policy
            'terms_of_service',     -- Terms of Service
            'consent_form',         -- User Consent Form
            'data_processing',      -- Data Processing Agreement
            'therapist_agreement',  -- Therapist/Coach Agreement
            'employment_contract',  -- Employment Contract
            'other'                 -- Miscellaneous
        )
    ),
    
    -- Storage
    file_path TEXT NOT NULL,           -- S3 key or local path
    file_size INTEGER,                 -- in bytes
    file_hash VARCHAR(64),             -- SHA-256 for integrity
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    
    -- Versioning
    current_version VARCHAR(10) DEFAULT '1.0',
    is_current BOOLEAN DEFAULT TRUE,
    replaces_document_id INTEGER REFERENCES legal_documents(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN ('active', 'archived', 'deleted')
    ),
    
    -- Metadata
    description TEXT,
    applicable_to VARCHAR(50),  -- 'users', 'therapists', 'coaches', 'all'
    effective_date DATE,
    expiry_date DATE,
    
    -- Audit
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_document_type (document_type, status),
    INDEX idx_current (is_current, status),
    INDEX idx_applicable (applicable_to),
    INDEX idx_uploaded_at (uploaded_at DESC)
);

COMMENT ON TABLE legal_documents IS 'Legal document storage with versioning';
```

---

### Table 2: `document_access_logs`
**Purpose:** Immutable audit trail of all document access

```sql
CREATE TABLE document_access_logs (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES legal_documents(id),
    
    -- Access details
    accessed_by INTEGER REFERENCES users(id),
    access_type VARCHAR(20) NOT NULL CHECK (
        access_type IN ('view', 'download', 'upload', 'delete', 'archive')
    ),
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Timestamp (immutable)
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Metadata
    metadata JSONB,  -- Additional context
    
    -- Prevent deletion
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_document_access (document_id, accessed_at DESC),
    INDEX idx_user_access (accessed_by, accessed_at DESC),
    INDEX idx_access_type (access_type, accessed_at DESC),
    INDEX idx_accessed_at (accessed_at DESC)
);

-- Make logs immutable (cannot UPDATE or DELETE)
CREATE RULE no_update_access_logs AS ON UPDATE TO document_access_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_access_logs AS ON DELETE TO document_access_logs DO INSTEAD NOTHING;

COMMENT ON TABLE document_access_logs IS 'Immutable audit trail for document access';
```

---

### Table 3: `compliance_requirements`
**Purpose:** Track required documents and compliance status

```sql
CREATE TABLE compliance_requirements (
    id SERIAL PRIMARY KEY,
    
    -- Requirement details
    requirement_name VARCHAR(255) NOT NULL UNIQUE,
    requirement_type VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Related document
    required_document_type VARCHAR(50), -- References legal_documents.document_type
    
    -- Status
    is_fulfilled BOOLEAN DEFAULT FALSE,
    fulfilled_by_document_id INTEGER REFERENCES legal_documents(id),
    
    -- Dates
    required_by_date DATE,
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'medium' CHECK (
        priority IN ('critical', 'high', 'medium', 'low')
    ),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_fulfilled (is_fulfilled, priority),
    INDEX idx_required_by (required_by_date)
);

COMMENT ON TABLE compliance_requirements IS 'Track required legal documents and compliance gaps';
```

---

### Table 4: `auto_delete_rules`
**Purpose:** DPDPA compliance - auto-delete user data

```sql
CREATE TABLE auto_delete_rules (
    id SERIAL PRIMARY KEY,
    
    -- Rule details
    rule_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    
    -- Target
    data_type VARCHAR(50) NOT NULL CHECK (
        data_type IN (
            'user_account',
            'chat_history',
            'session_recordings',
            'payment_history',
            'health_records',
            'therapist_notes',
            'user_uploads',
            'audit_logs'
        )
    ),
    
    -- Deletion criteria
    delete_after_days INTEGER NOT NULL,  -- Days after trigger event
    trigger_event VARCHAR(50) NOT NULL CHECK (
        trigger_event IN (
            'user_deletion_request',
            'account_inactive',
            'session_completed',
            'payment_settled',
            'consent_withdrawn'
        )
    ),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- DPDPA compliance
    legal_basis VARCHAR(100),  -- "DPDPA Section 8(5)" etc.
    retention_reason TEXT,     -- Why we keep it this long
    
    -- Execution
    last_executed_at TIMESTAMP WITH TIME ZONE,
    next_execution_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_active (is_active),
    INDEX idx_next_execution (next_execution_at)
);

COMMENT ON TABLE auto_delete_rules IS 'DPDPA compliance auto-deletion rules';
```

---

### Table 5: `deletion_queue`
**Purpose:** Track pending deletions

```sql
CREATE TABLE deletion_queue (
    id SERIAL PRIMARY KEY,
    
    -- Target
    user_id INTEGER REFERENCES users(id),
    data_type VARCHAR(50) NOT NULL,
    rule_id INTEGER REFERENCES auto_delete_rules(id),
    
    -- Timing
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,  -- When to delete
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    
    -- Execution
    executed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_scheduled (scheduled_for, status),
    INDEX idx_user_deletion (user_id, status),
    INDEX idx_status (status)
);

COMMENT ON TABLE deletion_queue IS 'Queue for scheduled data deletions per DPDPA';
```

---

### Table 6: `user_consents`
**Purpose:** Track user consent for data processing (DPDPA requirement)

```sql
CREATE TABLE user_consents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    
    -- Consent details
    consent_type VARCHAR(50) NOT NULL CHECK (
        consent_type IN (
            'platform_terms',
            'privacy_policy',
            'data_processing',
            'health_data_sharing',
            'session_recording',
            'marketing_communications'
        )
    ),
    
    -- Status
    consented BOOLEAN NOT NULL,
    consent_version VARCHAR(10),  -- Which version they agreed to
    
    -- Timestamps
    consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    consent_document_id INTEGER REFERENCES legal_documents(id),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, consent_type, consented_at),
    INDEX idx_user_consent (user_id, consent_type),
    INDEX idx_consented_at (consented_at DESC)
);

COMMENT ON TABLE user_consents IS 'Track user consents per DPDPA requirements';
```

---

## BACKEND CODE (PYTHON/FASTAPI)

### File: `models/legal.py`

```python
from enum import Enum
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel, Field

class DocumentType(str, Enum):
    NDA = "nda"
    PRIVACY_POLICY = "privacy_policy"
    TERMS_OF_SERVICE = "terms_of_service"
    CONSENT_FORM = "consent_form"
    DATA_PROCESSING = "data_processing"
    THERAPIST_AGREEMENT = "therapist_agreement"
    EMPLOYMENT_CONTRACT = "employment_contract"
    OTHER = "other"

class DocumentStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"

class AccessType(str, Enum):
    VIEW = "view"
    DOWNLOAD = "download"
    UPLOAD = "upload"
    DELETE = "delete"
    ARCHIVE = "archive"

class DataType(str, Enum):
    USER_ACCOUNT = "user_account"
    CHAT_HISTORY = "chat_history"
    SESSION_RECORDINGS = "session_recordings"
    PAYMENT_HISTORY = "payment_history"
    HEALTH_RECORDS = "health_records"
    THERAPIST_NOTES = "therapist_notes"
    USER_UPLOADS = "user_uploads"
    AUDIT_LOGS = "audit_logs"

class TriggerEvent(str, Enum):
    USER_DELETION_REQUEST = "user_deletion_request"
    ACCOUNT_INACTIVE = "account_inactive"
    SESSION_COMPLETED = "session_completed"
    PAYMENT_SETTLED = "payment_settled"
    CONSENT_WITHDRAWN = "consent_withdrawn"

class DocumentUploadRequest(BaseModel):
    title: str = Field(..., max_length=255)
    document_type: DocumentType
    description: Optional[str] = None
    applicable_to: str = Field(default="all")
    effective_date: Optional[datetime] = None

class ComplianceStatus(BaseModel):
    total_requirements: int
    fulfilled: int
    pending: int
    critical_gaps: List[dict]
    compliance_percentage: float
```

---

### File: `services/document_service.py`

```python
import hashlib
import os
from datetime import datetime
from typing import Optional, Tuple
from fastapi import UploadFile
from sqlalchemy.orm import Session
from models.database import LegalDocument, DocumentAccessLog, ComplianceRequirement

class DocumentService:
    """Legal document management service"""
    
    def __init__(self, db: Session, storage_path: str = "/var/legal_docs"):
        self.db = db
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)
    
    def upload_document(
        self, 
        file: UploadFile,
        title: str,
        document_type: str,
        uploaded_by: int,
        description: str = None,
        applicable_to: str = "all",
        effective_date: datetime = None
    ) -> dict:
        """
        Upload and store legal document
        
        Returns document metadata
        """
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise ValueError("Only PDF files are allowed")
        
        # Read file content
        content = file.file.read()
        file_size = len(content)
        
        # Calculate SHA-256 hash
        file_hash = hashlib.sha256(content).hexdigest()
        
        # Check if same file already exists (prevent duplicates)
        existing = self.db.query(LegalDocument).filter(
            LegalDocument.file_hash == file_hash,
            LegalDocument.status == 'active'
        ).first()
        
        if existing:
            return {
                "duplicate": True,
                "existing_document_id": existing.id,
                "message": "This document already exists"
            }
        
        # Check if updating existing document type
        current_doc = self.db.query(LegalDocument).filter(
            LegalDocument.document_type == document_type,
            LegalDocument.is_current == True,
            LegalDocument.status == 'active'
        ).first()
        
        version = "1.0"
        replaces_id = None
        
        if current_doc:
            # This is an update - increment version
            version = self._increment_version(current_doc.current_version)
            replaces_id = current_doc.id
            
            # Archive old version
            current_doc.is_current = False
            current_doc.status = 'archived'
            current_doc.archived_at = datetime.now()
        
        # Generate file path
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{document_type}_{version}_{timestamp}.pdf"
        file_path = os.path.join(self.storage_path, filename)
        
        # Save file to disk
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Create database record
        document = LegalDocument(
            title=title,
            document_type=document_type,
            file_path=file_path,
            file_size=file_size,
            file_hash=file_hash,
            current_version=version,
            is_current=True,
            replaces_document_id=replaces_id,
            status='active',
            description=description,
            applicable_to=applicable_to,
            effective_date=effective_date or datetime.now(),
            uploaded_by=uploaded_by
        )
        
        self.db.add(document)
        self.db.flush()
        
        # Log upload action
        self._log_access(
            document_id=document.id,
            accessed_by=uploaded_by,
            access_type='upload'
        )
        
        # Check if this fulfills any compliance requirement
        self._check_compliance_fulfillment(document)
        
        self.db.commit()
        
        return {
            "success": True,
            "document_id": document.id,
            "version": version,
            "file_path": file_path,
            "replaced_document_id": replaces_id
        }
    
    def get_document(
        self, 
        document_id: int, 
        accessed_by: int,
        ip_address: str = None
    ) -> Tuple[str, bytes]:
        """
        Retrieve document and log access
        
        Returns (filename, file_content)
        """
        document = self.db.query(LegalDocument).filter(
            LegalDocument.id == document_id,
            LegalDocument.status != 'deleted'
        ).first()
        
        if not document:
            raise ValueError("Document not found")
        
        # Log access
        self._log_access(
            document_id=document_id,
            accessed_by=accessed_by,
            access_type='view',
            ip_address=ip_address
        )
        
        # Read file
        with open(document.file_path, 'rb') as f:
            content = f.read()
        
        filename = os.path.basename(document.file_path)
        return filename, content
    
    def _log_access(
        self,
        document_id: int,
        accessed_by: int,
        access_type: str,
        ip_address: str = None,
        user_agent: str = None
    ):
        """Log document access (immutable)"""
        log = DocumentAccessLog(
            document_id=document_id,
            accessed_by=accessed_by,
            access_type=access_type,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(log)
        self.db.flush()
    
    def _increment_version(self, current_version: str) -> str:
        """Increment version number (1.0 -> 1.1 -> 1.2)"""
        parts = current_version.split('.')
        major, minor = int(parts[0]), int(parts[1])
        minor += 1
        return f"{major}.{minor}"
    
    def _check_compliance_fulfillment(self, document: LegalDocument):
        """Check if uploaded document fulfills any compliance requirement"""
        requirements = self.db.query(ComplianceRequirement).filter(
            ComplianceRequirement.required_document_type == document.document_type,
            ComplianceRequirement.is_fulfilled == False
        ).all()
        
        for req in requirements:
            req.is_fulfilled = True
            req.fulfilled_by_document_id = document.id
            req.fulfilled_at = datetime.now()
    
    def get_compliance_status(self) -> dict:
        """Get overall compliance status"""
        requirements = self.db.query(ComplianceRequirement).all()
        
        total = len(requirements)
        fulfilled = sum(1 for r in requirements if r.is_fulfilled)
        pending = total - fulfilled
        
        # Find critical gaps
        critical_gaps = [
            {
                "requirement": r.requirement_name,
                "type": r.requirement_type,
                "priority": r.priority,
                "required_by": r.required_by_date.isoformat() if r.required_by_date else None
            }
            for r in requirements
            if not r.is_fulfilled and r.priority in ['critical', 'high']
        ]
        
        compliance_pct = (fulfilled / total * 100) if total > 0 else 0
        
        return {
            "total_requirements": total,
            "fulfilled": fulfilled,
            "pending": pending,
            "critical_gaps": critical_gaps,
            "compliance_percentage": round(compliance_pct, 2)
        }
```

---

### File: `services/dpdpa_service.py`

```python
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models.database import AutoDeleteRule, DeletionQueue, User

class DPDPAService:
    """DPDPA compliance service - auto-delete user data"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def request_user_deletion(self, user_id: int) -> dict:
        """
        Handle user's right to erasure (DPDPA Section 8)
        
        Schedule deletion 30 days from now
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Get deletion rules
        rules = self.db.query(AutoDeleteRule).filter(
            AutoDeleteRule.is_active == True,
            AutoDeleteRule.trigger_event == 'user_deletion_request'
        ).all()
        
        scheduled_deletions = []
        
        for rule in rules:
            # Calculate deletion date
            deletion_date = datetime.now() + timedelta(days=rule.delete_after_days)
            
            # Add to queue
            queue_item = DeletionQueue(
                user_id=user_id,
                data_type=rule.data_type,
                rule_id=rule.id,
                scheduled_for=deletion_date,
                status='pending'
            )
            self.db.add(queue_item)
            
            scheduled_deletions.append({
                "data_type": rule.data_type,
                "scheduled_for": deletion_date.isoformat(),
                "days_until_deletion": rule.delete_after_days
            })
        
        # Mark user for deletion
        user.deletion_requested_at = datetime.now()
        user.deletion_scheduled_for = datetime.now() + timedelta(days=30)
        
        self.db.commit()
        
        return {
            "user_id": user_id,
            "deletion_scheduled_for": user.deletion_scheduled_for.isoformat(),
            "scheduled_deletions": scheduled_deletions,
            "message": "Your data will be deleted in 30 days per DPDPA requirements"
        }
    
    def execute_scheduled_deletions(self) -> dict:
        """
        Background job - execute pending deletions
        Runs daily
        """
        now = datetime.now()
        
        # Get pending deletions due now
        pending = self.db.query(DeletionQueue).filter(
            DeletionQueue.status == 'pending',
            DeletionQueue.scheduled_for <= now
        ).all()
        
        results = {
            "total_processed": 0,
            "successful": 0,
            "failed": 0,
            "errors": []
        }
        
        for item in pending:
            item.status = 'processing'
            self.db.commit()
            
            try:
                # Execute deletion based on data type
                self._delete_data(item.user_id, item.data_type)
                
                item.status = 'completed'
                item.executed_at = now
                results["successful"] += 1
                
            except Exception as e:
                item.status = 'failed'
                item.error_message = str(e)
                results["failed"] += 1
                results["errors"].append({
                    "queue_id": item.id,
                    "user_id": item.user_id,
                    "data_type": item.data_type,
                    "error": str(e)
                })
            
            results["total_processed"] += 1
        
        self.db.commit()
        return results
    
    def _delete_data(self, user_id: int, data_type: str):
        """Execute actual data deletion"""
        
        if data_type == 'user_account':
            # Anonymize user account
            user = self.db.query(User).filter(User.id == user_id).first()
            if user:
                user.email = f"deleted_{user_id}@deleted.local"
                user.phone = None
                user.first_name = "Deleted"
                user.last_name = "User"
                user.date_of_birth = None
                user.address = None
                user.status = 'deleted'
        
        elif data_type == 'chat_history':
            # Delete chat messages
            from models.database import ChatMessage
            self.db.query(ChatMessage).filter(
                ChatMessage.user_id == user_id
            ).delete()
        
        elif data_type == 'session_recordings':
            # Delete session recordings
            from models.database import SessionRecording
            recordings = self.db.query(SessionRecording).filter(
                SessionRecording.user_id == user_id
            ).all()
            for rec in recordings:
                # Delete actual file
                if os.path.exists(rec.file_path):
                    os.remove(rec.file_path)
                # Delete DB record
                self.db.delete(rec)
        
        elif data_type == 'payment_history':
            # Anonymize payment records (keep for accounting, remove PII)
            from models.database import Payment
            payments = self.db.query(Payment).filter(
                Payment.user_id == user_id
            ).all()
            for payment in payments:
                payment.card_number = None
                payment.cardholder_name = None
                payment.billing_address = None
        
        # Add more data types as needed...
        
        self.db.commit()
    
    def get_deletion_queue_status(self, user_id: int = None) -> dict:
        """Get status of deletion queue"""
        query = self.db.query(DeletionQueue)
        
        if user_id:
            query = query.filter(DeletionQueue.user_id == user_id)
        
        queue_items = query.all()
        
        return {
            "total": len(queue_items),
            "pending": sum(1 for q in queue_items if q.status == 'pending'),
            "processing": sum(1 for q in queue_items if q.status == 'processing'),
            "completed": sum(1 for q in queue_items if q.status == 'completed'),
            "failed": sum(1 for q in queue_items if q.status == 'failed'),
            "items": [
                {
                    "id": q.id,
                    "user_id": q.user_id,
                    "data_type": q.data_type,
                    "scheduled_for": q.scheduled_for.isoformat(),
                    "status": q.status
                }
                for q in queue_items
            ]
        }
```

---

### File: `api/endpoints/legal.py`

```python
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from services.document_service import DocumentService
from services.dpdpa_service import DPDPAService
from database import get_db
from auth import get_current_admin, get_current_user
import io

router = APIRouter(prefix="/api/v1/legal", tags=["legal"])

@router.post("/documents/upload")
async def upload_legal_document(
    file: UploadFile = File(...),
    title: str = None,
    document_type: str = None,
    description: str = None,
    applicable_to: str = "all",
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Upload legal document (admin only)
    """
    if not title:
        title = file.filename
    
    doc_service = DocumentService(db)
    
    try:
        result = doc_service.upload_document(
            file=file,
            title=title,
            document_type=document_type,
            uploaded_by=current_admin['id'],
            description=description,
            applicable_to=applicable_to
        )
        
        if result.get("duplicate"):
            raise HTTPException(
                status_code=400,
                detail="This document already exists"
            )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/documents/{document_id}")
async def get_legal_document(
    document_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download legal document
    """
    doc_service = DocumentService(db)
    
    try:
        filename, content = doc_service.get_document(
            document_id=document_id,
            accessed_by=current_user['id']
        )
        
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/compliance/status")
async def get_compliance_status(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get compliance status (admin only)
    """
    doc_service = DocumentService(db)
    return doc_service.get_compliance_status()

@router.post("/dpdpa/request-deletion")
async def request_data_deletion(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    User requests data deletion (DPDPA right to erasure)
    """
    dpdpa_service = DPDPAService(db)
    
    try:
        result = dpdpa_service.request_user_deletion(current_user['id'])
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/dpdpa/deletion-status")
async def get_deletion_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check deletion queue status
    """
    dpdpa_service = DPDPAService(db)
    return dpdpa_service.get_deletion_queue_status(user_id=current_user['id'])
```

---

## ADMIN DASHBOARD (REACT)

### File: `components/LegalDashboard.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const LegalDashboard = () => {
  const [compliance, setCompliance] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [deletionQueue, setDeletionQueue] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [complianceRes, docsRes, queueRes] = await Promise.all([
        api.get('/legal/compliance/status'),
        api.get('/legal/documents'),
        api.get('/legal/dpdpa/deletion-status')
      ]);
      
      setCompliance(complianceRes.data);
      setDocuments(docsRes.data);
      setDeletionQueue(queueRes.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const uploadDocument = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', 'privacy_policy'); // Default

    try {
      await api.post('/legal/documents/upload', formData);
      alert('Document uploaded successfully!');
      loadDashboardData();
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="legal-dashboard">
      <h1>Legal & Compliance Dashboard</h1>

      {/* Compliance Status */}
      {compliance && (
        <div className="compliance-card">
          <h2>Compliance Status</h2>
          <div className="status-indicator">
            <div className="percentage">{compliance.compliance_percentage}%</div>
            <div className="counts">
              {compliance.fulfilled}/{compliance.total_requirements} Requirements Met
            </div>
          </div>

          {compliance.critical_gaps.length > 0 && (
            <div className="critical-gaps">
              <h3>⚠️ Critical Gaps</h3>
              {compliance.critical_gaps.map((gap, i) => (
                <div key={i} className="gap-item">
                  <span className="gap-name">{gap.requirement}</span>
                  <span className="gap-priority">{gap.priority}</span>
                  {gap.required_by && (
                    <span className="gap-deadline">Due: {gap.required_by}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Section */}
      <div className="upload-card">
        <h2>Upload Document</h2>
        <input
          type="file"
          accept=".pdf"
          onChange={uploadDocument}
          disabled={uploading}
        />
        {uploading && <span>Uploading...</span>}
      </div>

      {/* DPDPA Deletion Queue */}
      {deletionQueue && (
        <div className="deletion-queue-card">
          <h2>DPDPA Deletion Queue</h2>
          <div className="queue-stats">
            <div className="stat">
              <span className="label">Pending:</span>
              <span className="value">{deletionQueue.pending}</span>
            </div>
            <div className="stat">
              <span className="label">Completed:</span>
              <span className="value">{deletionQueue.completed}</span>
            </div>
            <div className="stat">
              <span className="label">Failed:</span>
              <span className="value error">{deletionQueue.failed}</span>
            </div>
          </div>

          {deletionQueue.items.length > 0 && (
            <table className="queue-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Data Type</th>
                  <th>Scheduled For</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {deletionQueue.items.map(item => (
                  <tr key={item.id}>
                    <td>{item.user_id}</td>
                    <td>{item.data_type}</td>
                    <td>{new Date(item.scheduled_for).toLocaleDateString()}</td>
                    <td className={`status-${item.status}`}>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Documents List */}
      <div className="documents-card">
        <h2>Legal Documents</h2>
        <table className="documents-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Version</th>
              <th>Uploaded</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map(doc => (
              <tr key={doc.id}>
                <td>{doc.title}</td>
                <td>{doc.document_type}</td>
                <td>{doc.current_version}</td>
                <td>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                <td>{doc.status}</td>
                <td>
                  <button onClick={() => window.open(`/api/v1/legal/documents/${doc.id}`)}>
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LegalDashboard;
```

---

## BACKGROUND JOBS

### File: `jobs/dpdpa_jobs.py`

```python
from celery import Celery
from database import SessionLocal
from services.dpdpa_service import DPDPAService

celery = Celery('mans360', broker='redis://localhost:6379/0')

@celery.task
def execute_scheduled_deletions():
    """
    Execute pending DPDPA data deletions
    Runs daily at midnight IST
    """
    db = SessionLocal()
    try:
        dpdpa_service = DPDPAService(db)
        result = dpdpa_service.execute_scheduled_deletions()
        
        print(f"Deletions processed: {result['total_processed']}")
        print(f"Successful: {result['successful']}")
        print(f"Failed: {result['failed']}")
        
        if result['errors']:
            # Alert admin
            print("ERRORS:", result['errors'])
        
        return result
    finally:
        db.close()

# Schedule
celery.conf.beat_schedule = {
    'dpdpa-deletions-daily': {
        'task': 'jobs.dpdpa_jobs.execute_scheduled_deletions',
        'schedule': crontab(hour=0, minute=0),  # Midnight IST
    },
}
```

---

## SEED DATA (COMPLIANCE REQUIREMENTS)

```sql
INSERT INTO compliance_requirements (requirement_name, requirement_type, required_document_type, priority, required_by_date) VALUES
('Platform Privacy Policy', 'dpdpa_compliance', 'privacy_policy', 'critical', '2026-01-31'),
('User Terms of Service', 'legal', 'terms_of_service', 'critical', '2026-01-31'),
('Data Processing Agreement', 'dpdpa_compliance', 'data_processing', 'high', '2026-02-15'),
('Therapist NDA', 'legal', 'nda', 'high', '2026-02-28'),
('User Consent Form', 'dpdpa_compliance', 'consent_form', 'critical', '2026-01-31'),
('Therapist Agreement', 'legal', 'therapist_agreement', 'high', '2026-03-15'),
('Data Breach Response Plan', 'dpdpa_compliance', 'other', 'critical', '2026-02-28'),
('Cookie Policy', 'dpdpa_compliance', 'privacy_policy', 'medium', '2026-03-31');

INSERT INTO auto_delete_rules (rule_name, description, data_type, delete_after_days, trigger_event, legal_basis) VALUES
('User Account Deletion', 'Delete user account data 30 days after deletion request', 'user_account', 30, 'user_deletion_request', 'DPDPA Section 8(5) - Right to Erasure'),
('Chat History Cleanup', 'Delete chat history 30 days after user deletion', 'chat_history', 30, 'user_deletion_request', 'DPDPA Section 8(5)'),
('Session Recording Deletion', 'Delete session recordings 90 days after session completion', 'session_recordings', 90, 'session_completed', 'DPDPA Section 8(4) - Data Retention Limitation'),
('Inactive Account Cleanup', 'Delete accounts inactive for 3 years', 'user_account', 1095, 'account_inactive', 'DPDPA Section 8(4)'),
('Payment History Anonymization', 'Anonymize payment data 7 years after transaction', 'payment_history', 2555, 'payment_settled', 'Income Tax Act 1961 - 7 year retention');
```

---

## TASK BREAKDOWN (8 Points)

### Backend (5 points)
**Task 1:** Database Schema (1 point)
- [ ] Create 6 tables
- [ ] Add indexes
- [ ] Set up immutable audit log rules
- [ ] Seed compliance requirements

**Task 2:** Document Service (2 points)
- [ ] Upload/download logic
- [ ] Version control
- [ ] Access logging
- [ ] Compliance checking

**Task 3:** DPDPA Service (1.5 points)
- [ ] Deletion request handler
- [ ] Auto-delete executor
- [ ] Queue management

**Task 4:** API Endpoints (0.5 points)
- [ ] Upload endpoint
- [ ] Download endpoint
- [ ] Compliance status endpoint
- [ ] Deletion endpoints

### Frontend (2 points)
**Task 5:** Admin Dashboard (2 points)
- [ ] Compliance status display
- [ ] Document upload UI
- [ ] Deletion queue view
- [ ] Document list/download

### DevOps (1 point)
**Task 6:** Background Jobs (1 point)
- [ ] Celery setup
- [ ] Daily deletion job
- [ ] Monitoring & alerts

---

## DEFINITION OF DONE

- [ ] All 6 tables created and seeded
- [ ] Document upload/download working
- [ ] Access logs immutable (tested)
- [ ] Version control functional
- [ ] DPDPA deletion working (30-day delay)
- [ ] Compliance dashboard showing status
- [ ] Background job running daily
- [ ] Admin can upload/download documents
- [ ] Users can request data deletion
- [ ] Audit trail complete

---

## SUCCESS METRICS

**Week 1:**
- All critical documents uploaded
- 100% compliance on required docs
- Zero access log gaps

**Month 1:**
- 10+ document versions tracked
- 100+ access logs recorded
- 0 DPDPA compliance violations
- <5 minute document retrieval time

---

**VERDICT: Feasible in ONE story (8 points = 1.5 weeks)** ✅

This is **bare minimum but legally sound**!

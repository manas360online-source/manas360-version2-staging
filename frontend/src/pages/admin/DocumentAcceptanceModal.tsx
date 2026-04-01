import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

type DocumentAcceptanceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
  initialStepIndex?: number;
  showComplianceSequence?: boolean;
  showHeader?: boolean;
};

const STEPS = [
  { id: 'language-notice', title: 'Language Notice', status: 'COMPLETED' },
  { id: 'jurisdiction', title: 'Jurisdiction', status: 'IN PROGRESS' },
  { id: 'binding-docs', title: 'Binding Docs', status: 'PENDING' },
  { id: 'complete', title: 'Complete', status: 'PENDING' },
];

const STEP_CONTENT = {
  'language-notice': {
    hindi: `
भाषा सूचना (Language Notice)

यह दस्तावेज अंग्रेजी में है। कृपया ध्यान दीजिए कि MANAS360 प्लेटफॉर्म पर सभी कानूनी दस्तावेज अंग्रेजी में उपलब्ध हैं।

आपके अधिकार:
• आप इस प्लेटफॉर्म का उपयोग करके सहमत हैं
• आपके व्यक्तिगत डेटा की सुरक्षा हमारी प्राथमिकता है
• आप किसी भी समय अपनी सहमति वापस ले सकते हैं

डेटा सुरक्षा:
MANAS360 आपके डेटा की सर्वोच्च स्तर की सुरक्षा सुनिश्चित करता है। हम Digital Personal Data Protection Act, 2023 के अनुसार कार्य करते हैं।

गोपनीयता:
आपकी सभी जानकारी सुरक्षित और गोपनीय रखी जाती है। हम तीसरे पक्ष के साथ आपकी जानकारी साझा नहीं करते।
    `,
    english: `
Language Notice

This document is in English. Please note that all legal documents on the MANAS360 platform are available in English only.

Your Rights:
• By using this platform, you agree to the terms stated herein
• The security of your personal data is our top priority
• You can withdraw your consent at any time

Data Security:
MANAS360 ensures the highest level of security for your data. We operate in accordance with the Digital Personal Data Protection Act, 2023.

Privacy:
All your information is kept secure and confidential. We do not share your information with any third parties without your explicit consent.
    `,
    banner: 'ALL LEGAL DOCUMENTS ARE IN ENGLISH ONLY',
    locationBanner: null,
  },
  'jurisdiction': {
    hindi: `
भारतीय अधिकार क्षेत्र स्वीकृति

आप भारत के बाहर से एक्सेस कर रहे हैं। आप सभी कानूनी मामलों के लिए भारतीय अधिकार क्षेत्र को स्वीकार करना चाहिए।

1. शासन कानून
यह समझौता और MANAS360 द्वारा प्रदान की गई सभी सेवाएं भारत के कानूनों के अनुसार शासित होंगी।

2. एक्सक्लूसिव अधिकार क्षेत्र - बेंगलुरु अदालतें
मैं बेंगलुरु शहरी जिला की सत्र अदालतों के एक्सक्लूसिव अधिकार क्षेत्र को अनिवार्य रूप से और बिना शर्त स्वीकार करता हूं।

3. विदेशी अधिकार क्षेत्र में छूट
MANAS360 सेवाओं के उपयोग से संबंधित सभी विवादों, दावों या कानूनी कार्यवाही के लिए।
    `,
    english: `
IN ACCEPTANCE OF INDIAN JURISDICTION

You are accessing from outside India. You must accept Indian jurisdiction for all legal matters.

1. GOVERNING LAW
This agreement and all services provided by MANAS360 shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles.

2. EXCLUSIVE JURISDICTION - BENGALURU COURTS
I hereby irrevocably and unconditionally submit to the EXCLUSIVE jurisdiction of: a) Session Courts of Bengaluru Urban District, Karnataka, India b) High Court of Karnataka at Bengaluru, India. For all disputes, claims, or legal proceedings arising from or relating to my use of MANAS360 services.

3. WAIVER OF FOREIGN JURISDICTION
I waive any and all rights to seek dispute resolution in any jurisdiction outside of India.
    `,
    banner: 'ALL LEGAL DOCUMENTS ARE IN ENGLISH ONLY',
    locationBanner: 'INTERNATIONAL USER: Legal Requirements',
    locationSubtext: 'ACCESSING FROM: UNITED STATES (142.250.185.78)',
  },
  'binding-docs': {
    hindi: `
बाध्यकारी दस्तावेज़

यह चरण सभी बाध्यकारी कानूनी दस्तावेजों की समीक्षा करता है।
    `,
    english: `
BINDING DOCUMENTS

This step reviews all binding legal documents that you must accept to use the platform.
    `,
    banner: 'REVIEW BINDING DOCUMENTS CAREFULLY',
    locationBanner: null,
  },
  'complete': {
    hindi: `
पूर्ण

आपने सभी कानूनी दस्तावेजों को सफलतापूर्वक स्वीकार कर लिया है।
    `,
    english: `
COMPLETE

You have successfully accepted all legal documents.
    `,
    banner: 'ONBOARDING COMPLETE',
    locationBanner: null,
  },
};

const JURISDICTION_PAGES = [
  {
    alertTitle: 'IN ACCEPTANCE OF INDIAN JURISDICTION',
    alertText: 'You are accessing from outside India. You must accept Indian jurisdiction for all legal matters.',
    documentText: `1. GOVERNING LAW
This agreement and all services provided by MANAS360 shall be governed by and construed in accordance with the laws of India.

2. EXCLUSIVE JURISDICTION - BENGALURU COURTS
I hereby irrevocably and unconditionally submit to the exclusive jurisdiction of Session Courts of Bengaluru Urban District and the High Court of Karnataka at Bengaluru.

3. WAIVER OF FOREIGN JURISDICTION
I waive any and all rights to seek dispute resolution in any jurisdiction outside India.

4. IP ADDRESS TRACKING ACKNOWLEDGMENT
I acknowledge that my current IP address indicates I am accessing MANAS360 from outside India and I explicitly agree to Indian jurisdiction for all legal matters.`,
    checkboxLabel:
      'I accept Indian jurisdiction (Bengaluru Session Courts / Karnataka High Court) for all legal disputes, even though I am in United States.',
    nextLabel: 'NEXT: MEDICAL LIABILITY WAIVER',
  },
  {
    alertTitle: 'MEDICAL LIABILITY WAIVER / RELEASE OF LIABILITY',
    alertText: 'You must understand and accept limitations of telemedicine and release certain liability claims.',
    documentText: `1. NATURE OF TELEMEDICINE SERVICES
I understand that MANAS360 provides online mental health services through licensed therapists, psychiatrists, and wellness coaches via video, audio, and text communication.

2. TELEMEDICINE LIMITATIONS
I acknowledge limitations including internet connectivity risks, technology failures, reduced physical examination, and potential diagnostic constraints.

3. CROSS-BORDER CARE UNDERSTANDING
I understand risks associated with receiving services while located outside India and agree to comply with all platform requirements.

4. RELEASE OF LIABILITY - PLATFORM
To the fullest extent permitted by law, I release MANAS360 and associated providers from claims arising from known telemedicine limitations, except where prohibited by law.`,
    checkboxLabel:
      'I accept this Medical Liability Waiver and Release of Liability. I understand the risks of cross-border telemedicine.',
    nextLabel: 'NEXT: DIGITAL SIGNATURE',
  },
  {
    alertTitle: 'Digital Signature Required',
    alertText: 'By typing your full legal name below, you are digitally signing both waivers.',
    summaryPoints: [
      'Indian Jurisdiction: Disputes resolved in Bengaluru Courts only.',
      'No Foreign Lawsuits: You waive the right to sue in United States.',
      'Medical Liability: You release MANAS360 from platform-related claims.',
      'Cross-Border Risks: You assume all risks of using telemedicine internationally.',
      'Not for Emergencies: You confirm this is not for emergency crisis care.',
    ],
    nextLabel: 'SIGN & ACCEPT (LEGALLY BINDING)',
    kind: 'signature',
  },
];

const BINDING_DOCS = [
  {
    title: 'MANAS360 Privacy Policy',
    revision: 'REV. 1.2',
    securityId: 'M360-S-1',
    notice: 'Regulatory Protocol: Full scroll required before digital signature can be authorized.',
    sectionTitle: 'BINDING ELECTRONIC CONSENT',
    content: `This agreement is legally binding under the Information Technology Act, 2000. By checking the box below, you provide a valid electronic signature as per Section 3.

1. Data Consent
I hereby grant MANAS360 permission to process my health data for the sole purpose of providing therapeutic and coaching services.

2. Confidentiality
I understand that my records are maintained under strict confidentiality protocols and applicable data protection laws.

3. Processing Purpose
I consent to analysis, storage, and access of health information by authorized professionals involved in my care.

4. Data Retention
I understand records may be retained for legal and clinical compliance requirements.

5. Terminus
Document Terminus - Authoritative Version`,
    checkboxLabel: 'I have read, understood, and accept the privacy policy (v1.2) as a legally binding signature.',
  },
  {
    title: 'MANAS360 Terms of Service',
    revision: 'REV. 1.1',
    securityId: 'M360-T-2',
    notice: 'Regulatory Protocol: Full scroll required before continuing to final consent.',
    sectionTitle: 'BINDING SERVICE TERMS',
    content: `By proceeding, you acknowledge acceptance of MANAS360 terms for platform use.

1. Platform Access
Access is granted for lawful personal care usage only.

2. Conduct
You agree not to misuse communication channels or platform resources.

3. Liability Framework
Service is provided as-is to the extent permitted by law.

4. Dispute Handling
All disputes are governed by platform policies and applicable Indian law.

5. Terminus
Document Terminus - Authoritative Version`,
    checkboxLabel: 'I accept the Terms of Service as a legally binding electronic agreement.',
  },
  {
    title: 'MANAS360 Informed Consent',
    revision: 'REV. 1.0',
    securityId: 'M360-C-3',
    notice: 'Regulatory Protocol: Full scroll required before final acceptance.',
    sectionTitle: 'INFORMED CONSENT AUTHORIZATION',
    content: `This consent confirms your understanding of tele-mental health participation.

1. Nature of Services
Services include counseling, psychiatry, and guided wellness interventions.

2. Risks and Limits
No emergency response is guaranteed by the platform.

3. Voluntary Participation
You may discontinue services subject to applicable policies.

4. Digital Signature Effect
Your acceptance carries the same legal standing as a handwritten signature.

5. Terminus
Document Terminus - Authoritative Version`,
    checkboxLabel: 'I consent to services and acknowledge this as my legally binding electronic authorization.',
  },
];

const AGREEMENT_HISTORY = [
  { name: 'Privacy Policy', version: '1.2', status: 'ACTIVE', hash: '4b29-92c1-a83d-0' },
  { name: 'Terms of Service', version: '1.0', status: 'ACTIVE', hash: '4b29-92c1-a83d-1' },
  { name: 'NRI Jurisdiction Waiver', version: '1.0', status: 'ACTIVE', hash: '4b29-92c1-a83d-2' },
];

const LEGAL_RIGHTS = [
  {
    title: 'Right to Portability',
    description: 'Download your complete medical and personal history in machine-readable JSON format.',
    cta: 'DOWNLOAD JSON DATA',
    tone: 'neutral',
  },
  {
    title: 'Right to Correction',
    description: 'Update incorrect personal data or add supplementary information to your legal record.',
    cta: 'UPDATE PROFILE RECORD',
    tone: 'neutral',
    meta: 'CURRENT: DEMO PATIENT',
  },
  {
    title: 'Withdraw Consent',
    description: 'Manage specific permissions for marketing, research, or third-party data sharing.',
    cta: 'GRANULAR CONTROLS',
    tone: 'neutral',
    meta: '2 ACTIVE',
  },
  {
    title: 'Right to Erasure',
    description: 'Revoke all consent and initiate 30-day "Right to be Forgotten" protocol under Sec 12.',
    cta: 'INITIATE DATA ERASURE',
    tone: 'danger',
  },
];

interface StepIndicatorProps {
  stepNumber: number;
  title: string;
  status: 'COMPLETED' | 'IN PROGRESS' | 'PENDING';
  isActive: boolean;
}

function StepIndicator({ stepNumber, title, status, isActive }: StepIndicatorProps) {
  return (
    <div className={`flex items-center space-x-3 py-3 px-4 rounded-lg transition-all ${isActive ? 'bg-blue-600/20' : ''}`}>
      <div className="relative flex-shrink-0">
        {status === 'COMPLETED' ? (
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        ) : status === 'IN PROGRESS' ? (
          <Circle className="h-6 w-6 text-blue-600 fill-blue-600" />
        ) : (
          <div className="h-6 w-6 rounded-full border-2 border-slate-400 flex items-center justify-center text-xs font-semibold text-slate-600">
            {stepNumber}
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${isActive ? 'text-blue-600' : status === 'COMPLETED' ? 'text-green-600' : 'text-slate-600'}`}>
          {title}
        </p>
        {status === 'IN PROGRESS' && (
          <p className="text-xs text-blue-600 font-medium">IN PROGRESS</p>
        )}
      </div>
    </div>
  );
}

function IdentityProofSection() {
  return (
    <div className="bg-slate-900/5 border border-slate-200 rounded-lg p-4 space-y-2">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Identity Proof Status</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">IPv4:</span>
          <span className="text-green-600 font-semibold">Verified</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">GEO:</span>
          <span className="text-green-600 font-semibold">Detected</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">SIGN:</span>
          <span className="text-amber-600 font-semibold">Awaiting</span>
        </div>
      </div>
    </div>
  );
}

export default function DocumentAcceptanceModal({ isOpen, onClose, onCompleted, initialStepIndex = 0, showComplianceSequence = true, showHeader = true }: DocumentAcceptanceModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
  const [jurisdictionPageIndex, setJurisdictionPageIndex] = useState(0);
  const [bindingDocIndex, setBindingDocIndex] = useState(0);
  const [signatureName, setSignatureName] = useState('');
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const currentStep = STEPS[currentStepIndex];
  const currentContent = STEP_CONTENT[currentStep.id as keyof typeof STEP_CONTENT];
  const isJurisdictionStep = currentStep.id === 'jurisdiction';
  const isBindingDocsStep = currentStep.id === 'binding-docs';
  const isCompleteStep = currentStep.id === 'complete';
  const currentJurisdictionPage = JURISDICTION_PAGES[jurisdictionPageIndex];
  const isLastJurisdictionPage = jurisdictionPageIndex === JURISDICTION_PAGES.length - 1;
  const currentBindingDoc = BINDING_DOCS[bindingDocIndex];
  const isLastBindingDoc = bindingDocIndex === BINDING_DOCS.length - 1;
  const isDigitalSignaturePage =
    isJurisdictionStep && currentJurisdictionPage.kind === 'signature';
  const signaturePreviewName = signatureName.trim() || 'Pending';
  const signatureTimestamp = new Date().toLocaleString();
  const canProceed = isJurisdictionStep
    ? isDigitalSignaturePage
      ? signatureName.trim().length >= 3
      : isCheckboxChecked
    : isBindingDocsStep
      ? isCheckboxChecked
    : isCheckboxChecked;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  useEffect(() => {
    setIsCheckboxChecked(false);
    setIsScrolledToBottom(false);
    // Reset scroll position when step changes
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentStepIndex]);

  useEffect(() => {
    if (currentStep.id !== 'jurisdiction') {
      setJurisdictionPageIndex(0);
    }
  }, [currentStep.id]);

  useEffect(() => {
    if (currentStep.id !== 'binding-docs') {
      setBindingDocIndex(0);
    }
  }, [currentStep.id]);

  useEffect(() => {
    if (currentStep.id === 'jurisdiction') {
      setIsCheckboxChecked(false);
      setIsScrolledToBottom(false);
      if (currentJurisdictionPage.kind !== 'signature') {
        setSignatureName('');
      }
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  }, [jurisdictionPageIndex, currentStep.id, currentJurisdictionPage.kind]);

  useEffect(() => {
    if (currentStep.id === 'binding-docs') {
      setIsCheckboxChecked(false);
      setIsScrolledToBottom(false);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  }, [bindingDocIndex, currentStep.id]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentStepIndex(initialStepIndex);
    setJurisdictionPageIndex(0);
    setBindingDocIndex(0);
    setSignatureName('');
    setIsCheckboxChecked(false);
    setIsScrolledToBottom(false);
  }, [isOpen, initialStepIndex]);

  useEffect(() => {
    if (!isOpen || isJurisdictionStep || isBindingDocsStep || isCompleteStep || isDigitalSignaturePage) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (!contentRef.current) return;
      const { scrollHeight, clientHeight } = contentRef.current;
      // If there is no overflow, user has effectively seen all content.
      setIsScrolledToBottom(scrollHeight <= clientHeight + 1);
    });

    return () => cancelAnimationFrame(frame);
  }, [
    isOpen,
    isJurisdictionStep,
    isBindingDocsStep,
    isCompleteStep,
    isDigitalSignaturePage,
    currentStepIndex,
  ]);

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = contentRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
      setIsScrolledToBottom(isAtBottom);
    }
  };

  const handleAccept = () => {
    if (!canProceed) return;

    if (isJurisdictionStep && !isLastJurisdictionPage) {
      setJurisdictionPageIndex(jurisdictionPageIndex + 1);
      return;
    }

    if (isBindingDocsStep && !isLastBindingDoc) {
      setBindingDocIndex(bindingDocIndex + 1);
      return;
    }

    if (isBindingDocsStep && isLastBindingDoc && onCompleted) {
      onCompleted();
      return;
    }

    if (isLastStep) {
      setCurrentStepIndex(initialStepIndex);
      setJurisdictionPageIndex(0);
      setBindingDocIndex(0);
      setSignatureName('');
      setIsCheckboxChecked(false);
      setIsScrolledToBottom(false);
      onClose();
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    if (isJurisdictionStep && jurisdictionPageIndex > 0) {
      setJurisdictionPageIndex(jurisdictionPageIndex - 1);
      return;
    }

    if (isBindingDocsStep && bindingDocIndex > 0) {
      setBindingDocIndex(bindingDocIndex - 1);
      return;
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100">
      <div className="relative h-full w-full bg-white flex flex-col overflow-hidden">
        {showHeader && (
          <div className="border-b border-slate-200 bg-slate-50 px-8 py-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Onboarding</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-slate-200 transition-colors"
            >
              <X className="h-6 w-6 text-slate-600" />
            </button>
          </div>
        )}

        {/* Main Content - Two Column Layout */}
        <div className="flex flex-1 overflow-hidden">
          {showComplianceSequence && (
            <div className="w-80 bg-slate-900 text-white overflow-y-auto flex flex-col">
              <div className="flex-shrink-0 p-6 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
                  Legal Compliance Sequence
                </h3>
              </div>

              <div className="flex-1 px-4 py-6 space-y-2">
                {STEPS.map((step, index) => {
                  let stepStatus: 'COMPLETED' | 'IN PROGRESS' | 'PENDING' = 'PENDING';
                  if (index < currentStepIndex) {
                    stepStatus = 'COMPLETED';
                  } else if (index === currentStepIndex) {
                    stepStatus = 'IN PROGRESS';
                  }
                  return (
                    <StepIndicator
                      key={step.id}
                      stepNumber={index + 1}
                      title={step.title}
                      status={stepStatus}
                      isActive={index === currentStepIndex}
                    />
                  );
                })}
              </div>

              <div className="flex-shrink-0 px-4 py-6 border-t border-slate-800">
                <IdentityProofSection />
              </div>
            </div>
          )}

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col">
            {!isBindingDocsStep && !isCompleteStep && (
              <>
                {/* Yellow Warning Banner */}
                <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900">Please Review Carefully</p>
                    <p className="text-xs text-yellow-800 mt-1">This is a legal document. Please read through all content before accepting.</p>
                  </div>
                </div>

                {/* Red Language/Banner Notice */}
                <div className="bg-red-50 border-b border-red-200 px-6 py-3">
                  <p className="text-sm font-bold text-red-700">
                    ⚠️ {currentContent.banner}
                  </p>
                </div>

                {/* Step Header */}
                <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    STEP {currentStepIndex + 1} OF {STEPS.length}: {currentStep.title.toUpperCase()}
                  </p>
                </div>
              </>
            )}

            {/* Two Column Content - Hindi and English */}
            <div
              className="flex-1 overflow-y-auto"
            >
              {isCompleteStep ? (
                <div className="mx-auto w-full max-w-[1120px] px-8 py-10 space-y-8 font-sans">
                  <div>
                    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold tracking-wider text-blue-600 uppercase">
                      DPDPA Right To Transparency
                    </span>
                    <h3 className="mt-3 text-[56px] leading-[1.05] font-bold tracking-tight text-slate-900">Your Data Privacy Hub</h3>
                    <p className="mt-2 max-w-4xl text-[20px] leading-8 text-slate-600">
                      Manage your binding agreements and exercise your rights under the Digital Personal Data Protection Act, 2023.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 rounded-2xl bg-blue-600 p-6 text-white shadow-lg">
                      <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">Authorized Legal Identity</p>
                      <h4 className="mt-3 text-4xl font-bold">Demo Patient</h4>
                      <p className="mt-2 text-[36px] text-blue-100">patient@example.com</p>
                      <p className="mt-1 text-lg text-blue-100">+91 98765 43210</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-semibold">DPDPA Verified</span>
                        <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-semibold">2 Consents Active</span>
                        <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-semibold">Karnataka Jurisdiction</span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
                      <h4 className="text-5xl font-bold">Legal Contact</h4>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-blue-300">Data Protection Officer</p>
                      <p className="mt-1 text-xl font-semibold">Mahan S.</p>
                      <p className="text-lg text-slate-300">Compliance & Privacy Lead</p>
                      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-blue-300">Inquiries</p>
                      <p className="mt-1 text-[34px] font-semibold">privacy@manas360.com</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="text-[42px] font-bold text-slate-900">Binding Agreements History</h4>
                      <div className="mt-5 space-y-4">
                        <div className="grid grid-cols-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                          <span>Agreement Name</span>
                          <span>Version</span>
                          <span>Status</span>
                          <span>Verification</span>
                        </div>
                        {AGREEMENT_HISTORY.map((agreement) => (
                          <div key={agreement.name} className="grid grid-cols-4 items-center border-t border-slate-100 pt-4">
                            <div>
                              <p className="text-xl font-semibold text-blue-700">{agreement.name}</p>
                              <p className="text-xs text-slate-500">HASH: {agreement.hash}</p>
                            </div>
                            <span className="text-base text-slate-600">{agreement.version}</span>
                            <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">{agreement.status}</span>
                            <button className="w-fit text-sm font-bold text-blue-600 hover:text-blue-700">VIEW COPY</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                      <p className="text-sm font-bold uppercase tracking-wider text-amber-700">Important Note</p>
                      <p className="mt-3 text-sm leading-relaxed text-amber-800">
                        Exercising the "Right to Erasure" will result in immediate termination of the platform license.
                        Mandatory clinical records are retained for 7 years as per Indian Health Ministry guidelines and cannot be erased by request.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h4 className="text-[42px] font-bold text-slate-900">Exercise Your Legal Rights</h4>
                    <div className="mt-5 grid grid-cols-2 gap-4">
                      {LEGAL_RIGHTS.map((right) => (
                        <div
                          key={right.title}
                          className={`rounded-xl border p-4 ${
                            right.tone === 'danger' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <p className={`text-2xl font-semibold ${right.tone === 'danger' ? 'text-red-700' : 'text-slate-900'}`}>
                            {right.title}
                          </p>
                          <p className={`mt-2 text-sm leading-6 ${right.tone === 'danger' ? 'text-red-700' : 'text-slate-600'}`}>
                            {right.description}
                          </p>
                          {right.meta && <p className="mt-3 text-xs font-bold uppercase tracking-wider text-blue-600">{right.meta}</p>}
                          <button
                            className={`mt-4 rounded-full border px-4 py-2 text-sm font-bold ${
                              right.tone === 'danger'
                                ? 'border-red-200 text-red-700 hover:bg-red-100'
                                : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                            }`}
                          >
                            {right.cta}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-5">
                {isJurisdictionStep && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm font-bold text-red-700">⚖️ INTERNATIONAL USER: Legal Requirements</p>
                    <p className="mt-1 text-xs font-semibold text-red-700">ACCESSING FROM: UNITED STATES (142.250.185.78)</p>
                    <p className="mt-2 text-sm font-semibold text-red-900">{currentJurisdictionPage.alertTitle}</p>
                    <p className="mt-1 text-sm text-red-800">{currentJurisdictionPage.alertText}</p>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  {isBindingDocsStep ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Current Agreement</p>
                        <div className="mt-1 flex items-center justify-between">
                          <h3 className="text-4xl font-bold text-slate-900">{currentBindingDoc.title}</h3>
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">{currentBindingDoc.revision}</span>
                        </div>
                        <div className="mt-3 h-2 w-full rounded bg-slate-200">
                          <div className="h-2 rounded bg-blue-500" style={{ width: `${((bindingDocIndex + 1) / BINDING_DOCS.length) * 100}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <span>Security ID: {currentBindingDoc.securityId}</span>
                          <span className="text-blue-600">Document {bindingDocIndex + 1} of {BINDING_DOCS.length}</span>
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                        📖 {currentBindingDoc.notice}
                      </div>

                      <div
                        ref={contentRef}
                        onScroll={handleScroll}
                        className="max-h-[300px] overflow-y-auto rounded-lg border border-slate-200 p-5"
                      >
                        <h4 className="text-2xl font-bold text-slate-900">{currentBindingDoc.sectionTitle}</h4>
                        <div className="mt-4 border-t border-slate-200 pt-4 prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                          {currentBindingDoc.content}
                        </div>
                      </div>

                      <label className="flex items-start space-x-3 rounded-lg border border-slate-200 bg-slate-50 p-4 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={!isScrolledToBottom}
                          checked={isCheckboxChecked}
                          onChange={(e) => setIsCheckboxChecked(e.target.checked)}
                          className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className={`text-sm font-medium ${isScrolledToBottom ? 'text-slate-900' : 'text-slate-500'}`}>
                          {currentBindingDoc.checkboxLabel}
                        </span>
                      </label>
                    </div>
                  ) : isDigitalSignaturePage ? (
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Summary of what you're signing:</p>
                        <div className="mt-3 rounded-lg bg-slate-50 p-4">
                          <ul className="space-y-2 text-sm text-slate-700">
                            {currentJurisdictionPage.summaryPoints?.map((point) => (
                              <li key={point}>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Type your full legal name to sign:</p>
                        <input
                          type="text"
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          placeholder="Your Full Name (e.g., John D'Souza)"
                          className="mt-3 w-full rounded-xl border-2 border-blue-400 px-5 py-4 text-lg font-semibold text-slate-800 outline-none focus:border-blue-600"
                        />
                        <p className="mt-2 text-xs text-slate-500">This is your digital signature. It has the same legal effect as a handwritten signature under IT Act 2000.</p>
                      </div>

                      <div className="rounded-xl bg-slate-900 p-4 text-white">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-300">Legal Proof Generated:</p>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-300">Signature:</span>
                            <span className="font-semibold text-blue-200">{signaturePreviewName}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-300">Date & Time:</span>
                            <span className="font-semibold">{signatureTimestamp}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-300">Location:</span>
                            <span className="font-semibold">San Francisco, United States</span>
                          </div>
                          <div className="flex items-center justify-between pb-1">
                            <span className="text-slate-300">IP Address:</span>
                            <span className="font-semibold">142.250.185.78</span>
                          </div>
                        </div>
                        <div className="mt-3 rounded bg-slate-800 px-3 py-2 text-center text-xs font-semibold text-blue-200">
                          IMMUTABLE LEGAL RECORD CREATED
                        </div>
                      </div>
                    </div>
                  ) : isJurisdictionStep ? (
                    <>
                      <div
                        ref={contentRef}
                        onScroll={handleScroll}
                        className="max-h-[260px] overflow-y-auto rounded-lg border border-slate-200 p-4"
                      >
                        <div className="prose prose-sm max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {currentJurisdictionPage.documentText}
                        </div>
                      </div>
                      <label className="mt-4 flex items-start space-x-3 rounded-lg border border-slate-200 bg-slate-50 p-4 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={!isScrolledToBottom}
                          checked={isCheckboxChecked}
                          onChange={(e) => setIsCheckboxChecked(e.target.checked)}
                          className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className={`text-sm font-medium ${isScrolledToBottom ? 'text-slate-900' : 'text-slate-500'}`}>
                          {currentJurisdictionPage.checkboxLabel}
                        </span>
                      </label>
                    </>
                  ) : (
                    <div
                      ref={contentRef}
                      onScroll={handleScroll}
                      className="max-h-[300px] overflow-y-auto rounded-lg border border-slate-200 p-4"
                    >
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Hindi Column */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">हिंदी (Hindi)</h4>
                          <div className="prose prose-sm max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {currentContent.hindi}
                          </div>
                        </div>

                        {/* English Column */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">English</h4>
                          <div className="prose prose-sm max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {currentContent.english}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>

            {/* Footer */}
            {!isCompleteStep && (
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 space-y-4">
              {/* Scroll Indicator */}
              {!isBindingDocsStep && !isDigitalSignaturePage && !isScrolledToBottom && (
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-600 bg-blue-50 rounded-lg py-2">
                  <span>↓ Scroll to bottom to enable acceptance</span>
                </div>
              )}

              {!isJurisdictionStep && !isBindingDocsStep && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isScrolledToBottom}
                    checked={isCheckboxChecked}
                    onChange={(e) => setIsCheckboxChecked(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm font-medium ${isScrolledToBottom ? 'text-slate-900' : 'text-slate-500'}`}>
                    I have read and understand all terms and conditions
                  </span>
                </label>
              )}

              {/* Action Buttons */}
              {isBindingDocsStep ? (
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleAccept}
                    disabled={!canProceed}
                    className={`min-w-[320px] px-6 py-3 rounded-full font-semibold text-white transition-all ${
                      canProceed
                        ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-lg'
                        : 'bg-slate-300 cursor-not-allowed opacity-60'
                    }`}
                  >
                    ACCEPT & PROCEED TO NEXT
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={handleBack}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                  >
                    {isJurisdictionStep && jurisdictionPageIndex > 0
                      ? 'Back'
                      : 'Cancel'}
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={!canProceed}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold text-white transition-all ${
                      canProceed
                        ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-lg'
                        : 'bg-slate-300 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isJurisdictionStep
                      ? currentJurisdictionPage.nextLabel
                      : isLastStep
                        ? 'Complete Onboarding'
                        : 'Accept & Continue'}
                  </button>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';

export default function TechnologyPartnerAgreement() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MANAS360 - Technology Partner / Vendor Agreement</h1>
        <p className="text-sm text-gray-600 mb-8">Between: MANAS360 Private Limited and [Vendor Name] (Vendor)</p>
        <div className="prose prose-lg max-w-none">
          <h2>1. SCOPE</h2>
          <p>
            1.1 The Vendor shall provide technology, integration, infrastructure, or other services as described in
            the mutually executed Statement of Work (SOW) and shall perform such services in accordance with the
            technical, operational, and security standards specified by MANAS360.
          </p>

          <h2>2. DATA PROTECTION</h2>
          <p>
            2.1 If the Vendor processes, accesses, or stores any personal data on behalf of MANAS360, the Vendor
            shall: (a) Process personal data only in accordance with written instructions issued by MANAS360; (b)
            implement industry-standard security measures (encryption, access controls, audit logging); (c) Not engage
            any subcontractor or sub-processor without prior written approval from MANAS360; (d) Comply with all
            applicable data protection obligations under DPDPA 2023 and all applicable data protection laws; (e) store
            data only on Indian servers unless explicitly authorized; (f) Notify MANAS360 of any confirmed or
            reasonably suspected data breach within 12 hours of detection; (g) Return, securely transfer, or
            permanently delete all MANAS360 data upon termination or expiry of the Agreement.
          </p>

          <h2>3. SECURITY REQUIREMENTS</h2>
          <p>
            3.1 The Vendor shall: (a) maintain SOC 2 Type II compliance or equivalent industry-recognized security
            frameworks; (b) conduct annual penetration testing and share reports; (c) encrypt all data in transit (TLS
            1.3) and at rest (AES-256); (d) implement role-based access controls; (e) maintain detailed access logs for
            audit purposes.
          </p>

          <h2>4. INTELLECTUAL PROPERTY</h2>
          <p>
            4.1 All custom development, integration work, and deliverables specifically created for MANAS360 shall be
            the exclusive intellectual property of MANAS360.
          </p>
          <p>
            4.2 The Vendor shall retain ownership of its pre-existing intellectual property and hereby grants MANAS360
            a perpetual, worldwide, royalty-free, and non-exclusive license to use such intellectual property within
            the Platform for the purpose of service delivery.
          </p>

          <h2>5. SERVICE LEVELS</h2>
          <p>
            5.1 Uptime: Platform uptime shall be targeted at ninety-nine-point five percent (99.5%) measured on a
            monthly basis.
          </p>
          <p>
            5.2 Support response: Critical issues within 1-hour, high priority within 4 hours, standard within 24
            hours.
          </p>
          <p>5.3 Any service level penalties for SLA violations shall be specified in the SOW.</p>

          <h2>6. CONFIDENTIALITY</h2>
          <p>
            6.1 The Vendor shall maintain confidentiality of all MANAS360 information, including business plans,
            technical architecture, user data, and Provider network.
          </p>
          <p>6.2 Confidentiality obligations survive for 5 years after termination.</p>

          <h2>7. LIABILITY AND INDEMNIFICATION</h2>
          <p>
            7.1 The Vendor shall indemnify MANAS360 against claims arising from: (a) data breaches caused by Vendor
            negligence or failure of security controls; (b) DPDPA violations by the Vendor; (c) IP infringement arising
            from Vendor deliverables.
          </p>
          <p>7.2 Vendor's aggregate liability shall not exceed 12 months of fees paid under this Agreement.</p>

          <h2>8. TERM AND TERMINATION</h2>
          <p>8.1 The term of this Agreement shall be governed by the SOW or as mutually agreed in writing.</p>
          <p>
            8.2 Either Party may terminate the Agreement for material breach by providing thirty (30) days' written
            notice and opportunity to cure the breach.
          </p>
          <p>
            8.3 MANAS360 reserves the right to terminate the Agreement with immediate effect in the event of a
            confirmed or high-risk data breach involving MANAS360 data.
          </p>

          <h2>9. GOVERNING LAW</h2>
          <p>
            9.1 This Agreement shall be governed by the laws of India. The courts of Bengaluru, Karnataka shall have
            exclusive jurisdiction over disputes arising under this Agreement.
          </p>
        </div>
      </div>
    </div>
  );
}

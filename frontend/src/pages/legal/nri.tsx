import { useEffect, useRef, useState } from 'react';

export interface NriConsentState {
  nri_declared: boolean;
  nri_tos_accepted: boolean;
  nri_tos_accepted_at: string;
}

interface NriPatchProps {
  onChange?: (state: NriConsentState) => void;
  blockSubmitButtons?: boolean;
}

export default function NriPatch({ onChange, blockSubmitButtons = true }: NriPatchProps) {
  const [nriDeclared, setNriDeclared] = useState(false);
  const [nriTosAccepted, setNriTosAccepted] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState('');

  const tosBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onChange) return;
    onChange({
      nri_declared: nriDeclared,
      nri_tos_accepted: nriTosAccepted,
      nri_tos_accepted_at: acceptedAt,
    });
  }, [nriDeclared, nriTosAccepted, acceptedAt, onChange]);

  useEffect(() => {
    if (!blockSubmitButtons) return;
    const submitBtn = document.querySelector<HTMLButtonElement>(
      'button[type="submit"], #submitBtn, .submit-btn'
    );
    if (!submitBtn) return;

    if (nriDeclared && !nriTosAccepted) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.4';
      submitBtn.style.cursor = 'not-allowed';
      submitBtn.title = 'Please review and accept NRI Terms of Service first';
    } else {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      submitBtn.title = '';
    }
  }, [nriDeclared, nriTosAccepted, blockSubmitButtons]);

  const toggleNri = () => {
    const next = !nriDeclared;
    setNriDeclared(next);

    if (!next) {
      setNriTosAccepted(false);
      setAcceptedAt('');
    }
  };

  const openTos = () => {
    setOverlayOpen(true);
    setScrolledToEnd(false);
    setTimeout(() => {
      if (tosBodyRef.current) tosBodyRef.current.scrollTop = 0;
    }, 0);
  };

  const closeTos = () => {
    setOverlayOpen(false);
  };

  const handleTosScroll = () => {
    const body = tosBodyRef.current;
    if (!body || scrolledToEnd) return;

    const scrollPercent = (body.scrollTop + body.clientHeight) / body.scrollHeight;
    if (scrollPercent >= 0.95) {
      setScrolledToEnd(true);
    }
  };

  const acceptTos = (checked: boolean) => {
    setNriTosAccepted(checked);
    if (checked) {
      setAcceptedAt(new Date().toISOString());
      closeTos();
      return;
    }
    setAcceptedAt('');
  };

  return (
    <>
      <style>{`
        .nri-patch{margin:16px 0;font-family:inherit}
        .nri-row{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fafafa;cursor:pointer;transition:all .2s}
        .nri-row:hover{border-color:#C4956A;background:#fffbf5}
        .nri-row.on{border-color:#E65100;background:#fff3e0}
        .nri-row input[type=checkbox]{width:18px;height:18px;margin-top:2px;accent-color:#E65100;cursor:pointer;flex-shrink:0}
        .nri-lbl{font-size:13px;color:#1a1a1a;line-height:1.5}
        .nri-lbl strong{color:#E65100}
        .nri-lbl .sm{font-size:11px;color:#6b7280;display:block;margin-top:2px}
        .nri-review-btn{display:none;margin-top:10px;padding:10px 16px;background:linear-gradient(135deg,#fff3e0,#ffe0b2);border:1.5px solid #ff9800;border-radius:10px;font-size:12px;font-weight:600;color:#bf360c;cursor:pointer;transition:all .2s;text-align:center}
        .nri-review-btn:hover{background:#ffe0b2;transform:scale(1.02)}
        .nri-review-btn.show{display:block}
        .nri-status{display:none;align-items:center;gap:6px;margin-top:8px;font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px}
        .nri-status.ok{display:flex;color:#2e7d32;background:#e8f5e9}
        .nri-status.wait{display:flex;color:#c62828;background:#ffebee}
        .nri-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(3px)}
        .nri-overlay.open{display:flex}
        .nri-modal{background:#fff;border-radius:14px;width:92%;max-width:620px;max-height:82vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.2);overflow:hidden}
        .nri-mh{background:linear-gradient(135deg,#bf360c,#e65100);color:#fff;padding:16px 20px;display:flex;align-items:center;justify-content:space-between}
        .nri-mh h3{font-size:15px;font-weight:700}
        .nri-mx{background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:14px;cursor:pointer}
        .nri-mb{flex:1;overflow-y:auto;padding:20px 24px;font-size:12px;line-height:1.8;color:#374151}
        .nri-mb h4{font-size:13px;font-weight:700;color:#1a1a1a;margin:14px 0 4px}
        .nri-mb ol,.nri-mb ul{padding-left:18px;margin:6px 0}
        .nri-mb li{margin:3px 0}
        .nri-mf{padding:14px 20px;border-top:1.5px solid #e5e7eb;background:#fafafa;display:flex;align-items:center;gap:10px}
        .nri-mf input[type=checkbox]{width:18px;height:18px;accent-color:#E65100;cursor:pointer}
        .nri-mf label{font-size:12px;color:#374151;cursor:pointer;flex:1}
        .nri-mf label.disabled{color:#9ca3af}
        .nri-scroll-hint{font-size:10px;color:#9ca3af;text-align:center;padding:4px;background:#f3f4f6;display:none}
        .nri-scroll-hint.show{display:block}
      `}</style>

      <div className="nri-patch" id="nriPatch">
        <div
          className={`nri-row ${nriDeclared ? 'on' : ''}`}
          id="nriRow"
          onClick={toggleNri}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleNri();
            }
          }}
        >
          <input
            type="checkbox"
            id="nriCheck"
            checked={nriDeclared}
            onClick={(e) => e.stopPropagation()}
            onChange={toggleNri}
          />
          <div className="nri-lbl">
            <strong>I am an NRI / residing outside India</strong>
            <span className="sm">
              If checked, you will need to review and accept NRI-specific Terms of Service. All services are governed
              by Indian law and Bengaluru jurisdiction.
            </span>
          </div>
        </div>

        <div
          className="nri-review-btn"
          id="nriSimHelper"
          style={{
            display: nriDeclared ? 'block' : 'none',
            background: '#e8f5e9',
            borderColor: '#4caf50',
            color: '#2e7d32',
            cursor: 'default',
            fontSize: '11px',
            lineHeight: '1.5',
          }}
        >
          <strong>Indian phone number (+91) required for all users including NRIs.</strong> MANAS360 uses OTP via SMS
          for authentication. If you do not have an active Indian SIM, get an Airtel/Jio e-SIM from your country
          before registering. All payments, sessions, and data stay within India.
        </div>

        <button
          type="button"
          className={`nri-review-btn ${nriDeclared ? 'show' : ''}`}
          id="nriReviewBtn"
          onClick={openTos}
        >
          {nriTosAccepted ? 'NRI Terms Accepted - Review Again' : 'Review NRI Terms of Service (required before proceeding)'}
        </button>

        {nriDeclared && !nriTosAccepted ? (
          <div className="nri-status wait" id="nriStatusWait" style={{ display: 'flex' }}>
            NRI Terms of Service review required before you can proceed
          </div>
        ) : null}

        {nriDeclared && nriTosAccepted ? (
          <div className="nri-status ok" id="nriStatusOk" style={{ display: 'flex' }}>
            NRI Terms of Service accepted
          </div>
        ) : null}

        <input type="hidden" name="nri_declared" id="nriDeclaredField" value={String(nriDeclared)} />
        <input type="hidden" name="nri_tos_accepted" id="nriTosAcceptedField" value={String(nriTosAccepted)} />
        <input type="hidden" name="nri_tos_accepted_at" id="nriTosTimestampField" value={acceptedAt} />
      </div>

      <div className={`nri-overlay ${overlayOpen ? 'open' : ''}`} id="nriOverlay" onClick={closeTos}>
        <div className="nri-modal" onClick={(e) => e.stopPropagation()}>
          <div className="nri-mh">
            <h3>NRI Terms of Service - MANAS360</h3>
            <button type="button" className="nri-mx" onClick={closeTos}>
              x
            </button>
          </div>

          <div className={`nri-scroll-hint ${scrolledToEnd ? '' : 'show'}`} id="nriScrollHint">
            Please scroll to the end to enable acceptance
          </div>

          <div className="nri-mb" id="nriTosBody" ref={tosBodyRef} onScroll={handleTosScroll}>
            <h4>1. APPLICABILITY</h4>
            <p>
              These NRI-specific Terms of Service (&quot;NRI ToS&quot;) apply to any user of MANAS360 who self-declares as a
              Non-Resident Indian (NRI), Person of Indian Origin (PIO), or Overseas Citizen of India (OCI), or who
              resides outside the territory of India at the time of registration or service use.
            </p>
            <p>
              These NRI ToS are supplementary to and shall be read in conjunction with the general MANAS360 Terms of
              Service. In the event of any conflict between the general ToS and these NRI ToS, the NRI ToS shall
              prevail for NRI users.
            </p>

            <h4>2. JURISDICTION AND GOVERNING LAW</h4>
            <ol>
              <li>All services are governed exclusively by the laws of India.</li>
              <li>
                Any dispute, claim, or controversy arising out of or relating to these terms or the use of MANAS360
                shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka, India.
              </li>
              <li>The user irrevocably waives any objection to the venue or jurisdiction of such courts.</li>
              <li>No court or tribunal outside India has jurisdiction for MANAS360 service disputes.</li>
              <li>DPDPA 2023 governs processing, storage, and protection of personal data.</li>
            </ol>

            <h4>3. PAYMENT TERMS</h4>
            <ol>
              <li>Payments are processed via PhonePe or other designated Indian gateways.</li>
              <li>All charges are in INR. Currency conversion is the user&apos;s responsibility.</li>
              <li>NRI session fees (INR 2,999 to INR 3,599) reflect IST-compatible scheduling needs.</li>
              <li>
                Refunds, if applicable, are processed in INR to the original payment source. MANAS360 is not
                responsible for exchange rate differences between payment and refund dates.
              </li>
              <li>Invoices and financial records are maintained in India per Indian laws.</li>
            </ol>

            <h4>4. DATA RESIDENCY AND PRIVACY</h4>
            <ol>
              <li>Personal and health data are stored and processed in India (AWS Mumbai).</li>
              <li>
                Data is not transferred outside India unless explicitly required for service delivery with informed
                consent.
              </li>
              <li>
                NRI status is based solely on user self-declaration. MANAS360 does not use IP tracking or geolocation
                to determine residency status.
              </li>
              <li>Data Protection Officer operations are based in Bengaluru, India.</li>
            </ol>

            <h4>5. THERAPIST-PATIENT RELATIONSHIP</h4>
            <ol>
              <li>Providers are licensed/registered in India as applicable.</li>
              <li>Therapist-patient relationship is governed by Indian frameworks.</li>
              <li>MANAS360 acts as a technology aggregator (not a healthcare provider).</li>
              <li>Prescription validity outside India is user responsibility.</li>
              <li>
                In a crisis, MANAS360 follows Indian emergency procedures. Users may need to separately contact local
                emergency services in their country of residence.
              </li>
            </ol>

            <h4>6. LIMITATIONS OF LIABILITY</h4>
            <ol>
              <li>MANAS360 is not liable for regulatory differences between jurisdictions.</li>
              <li>Services are delivered to Indian clinical standards.</li>
              <li>Total liability is capped at fees paid in preceding 12 months.</li>
            </ol>

            <h4>7. COMMUNICATION</h4>
            <ol>
              <li>Official communication is in English or Hindi.</li>
              <li>Channels: WhatsApp, email, in-app notifications.</li>
              <li>Reminders and notices are sent to registered phone number.</li>
            </ol>

            <h4>8. TERMINATION</h4>
            <ol>
              <li>Either party may terminate with 30 days&apos; written notice.</li>
              <li>Data portability requests are processed per DPDPA requirements.</li>
              <li>MANAS360 may terminate for violations of Indian law.</li>
            </ol>

            <h4>9. DISPUTE RESOLUTION</h4>
            <ol>
              <li>Disputes should first attempt mediation with seat in Bengaluru, India.</li>
              <li>
                If mediation fails within 30 days, disputes proceed to arbitration under the Arbitration and
                Conciliation Act, 1996 with seat in Bengaluru.
              </li>
              <li>Arbitration language is English.</li>
              <li>Award is final and enforceable in Indian courts.</li>
            </ol>

            <h4>10. ACCEPTANCE</h4>
            <ul>
              <li>You have read and understood these NRI Terms of Service.</li>
              <li>You voluntarily self-declare NRI status.</li>
              <li>You agree to exclusive Indian jurisdiction (Bengaluru).</li>
              <li>You accept INR-only processing via Indian payment infrastructure.</li>
              <li>You consent to India-based data storage/processing under DPDPA 2023.</li>
              <li>You waive any claim to jurisdiction outside India for matters arising from MANAS360 services.</li>
            </ul>
            <p style={{ marginTop: '16px', padding: '10px', background: '#fff3e0', borderRadius: '8px', fontWeight: 600, color: '#bf360c' }}>
              Document version: 1.0 | Effective: April 2026 | Governing law: India | Jurisdiction: Bengaluru,
              Karnataka
            </p>
          </div>

          <div className="nri-mf" id="nriFooter">
            <input
              type="checkbox"
              id="nriAcceptCheck"
              disabled={!scrolledToEnd}
              checked={nriTosAccepted}
              onChange={(e) => acceptTos(e.target.checked)}
            />
            <label htmlFor="nriAcceptCheck" id="nriAcceptLabel" className={scrolledToEnd ? '' : 'disabled'}>
              I have read the NRI Terms of Service and accept all conditions including Indian jurisdiction, INR
              payments, and Indian data residency.
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

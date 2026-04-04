import { useEffect } from 'react';

export default function AcceptableUsePolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">MANAS360 - Acceptable Use Policy</h1>
        <div className="prose prose-lg max-w-none">
          <h2>1. PURPOSE</h2>
          <p>
            1.1 This Policy sets forth the acceptable and prohibited uses of the MANAS360 Platform and is intended to
            ensure a safe, respectful, supportive, and therapeutically appropriate environment for all Users.
          </p>

          <h2>2. PROHIBITED ACTIVITIES</h2>
          <p>2.1 Users shall NOT:</p>
          <p>
            (a) Use the Platform for any purpose other than seeking, providing, or supporting legitimate mental health
            or wellness services;
          </p>
          <p>(b) Use the Platform for unlawful, fraudulent, deceptive, or harmful activities;</p>
          <p>
            (c) Harass, threaten, abuse, stalk, intimidate, or exploit any User, Provider, or Platform personnel;
          </p>
          <p>
            (d) Share sexually explicit, pornographic, violent, self-harm-promoting, or otherwise harmful content
            unrelated to therapeutic objectives;
          </p>
          <p>
            (e) Impersonate a mental health professional, medical professional, or any other person;
          </p>
          <p>
            (f) Attempt to contact Providers outside the Platform for the purpose of circumventing Platform fees;
          </p>
          <p>
            (g) Share, distribute, or sell any therapeutic content, session recordings, or proprietary content from
            the Platform;
          </p>
          <p>
            (h) Use the Platform to promote products, services, or ideologies unrelated to mental health;
          </p>
          <p>(i) Introduce viruses, malware, ransomware, spyware, or any harmful code;</p>
          <p>(j) Collect, scrape, crawl, extract or harvest data from the Platform;</p>
          <p>(k) Create fake accounts, bots, scripts, or automated systems to interact with the Platform;</p>
          <p>(l) Use AI-generated content to falsely represent human interaction in group sessions.</p>

          <h2>3. ENFORCEMENT</h2>
          <p>
            3.1 Violations may result in: warning, temporary suspension, permanent ban, initiate legal proceedings or
            referral to law enforcement.
          </p>
          <p>
            3.2 MANAS360 reserves the right to investigate suspected violations and take appropriate action without
            prior notice.
          </p>
          <p>
            3.3 Decisions regarding enforcement shall be made at MANAS360&apos;s reasonable discretion, based on severity,
            recurrence, and risk to Platform safety.
          </p>

          <h2>4. REPORTING</h2>
          <p>
            4.1 Users may report violations via the in-app reporting feature, email (report@manas360.com), or by
            contacting support.
          </p>

          <h2>5. CHANGES TO THIS POLICY</h2>
          <p>
            5.1 We may update this Policy periodically to reflect legal, technical, or operational changes. Material
            changes will be notified via email and in-app notification. Continued accessing or using the Platform
            after notification constitutes acceptance of the revised Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';

export default function CommunityGuidelines() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MANAS360 - Community Guidelines</h1>
        <p className="text-sm text-gray-600 mb-8">For Group Therapy Sessions, Forums, and Community Features</p>
        <div className="prose prose-lg max-w-none">
          <h2>1. PURPOSE AND APPLICABILITY</h2>
          <p>
            These Community Guidelines govern all Users and Providers who access or participate in group therapy
            sessions, peer-support forums, moderated discussions, or any other interactive community feature made
            available on the MANAS360 Platform. These Guidelines operate in addition to, and shall be read together
            with, the Terms of Service, Acceptable Use Policy, and Privacy Policy; in the event of any inconsistency,
            the stricter provision shall prevail and apply. Participation in community features is a privilege and not
            an inherent right, and MANAS360 reserves the sole discretion and authority to restrict, suspend, or revoke
            access where necessary to preserve therapeutic integrity, community safety, and compliance with applicable
            standards.
          </p>

          <h2>2. OUR COMMUNITY VALUES</h2>
          <p>
            2.1 MANAS360 community spaces are founded upon the core principles of empathy, respect, psychological
            safety, non-judgment, confidentiality, and ethical therapeutic conduct. All Users and Providers
            participating in community features are expected to uphold these values in every interaction and to
            conduct themselves in a manner that preserves the dignity, privacy, and overall well-being of all
            participants.
          </p>

          <h2>3. GUIDELINES</h2>
          <p>
            3.1 <strong>Be Respectful:</strong> Treat every member with dignity and respect. Diverse backgrounds,
            experiences, identities, and perspectives are welcomed.
          </p>
          <p>
            3.2 <strong>Maintain Confidentiality:</strong> What is shared in group sessions stays in group sessions. Do
            not share other members&apos; personal stories, identities, or health information outside the group.
            Unauthorized disclosure of another participant&apos;s personal data may constitute a violation of applicable
            data protection laws.
          </p>
          <p>
            3.3 <strong>Use Supportive Language:</strong> Avoid judgment, criticism, or unsolicited advice. Use &quot;I&quot;
            statements when sharing experiences.
          </p>
          <p>
            3.4 <strong>Respect Boundaries:</strong> If someone does not wish to share, respect their choice. Do not
            pressure, interrogate, or coerce others into disclosure.
          </p>
          <p>
            3.5 <strong>No Promotion or Solicitation:</strong> Do not promote or solicit products, services,
            alternative treatments, financial schemes, religious campaigns, or political ideologies.
          </p>
          <p>
            3.6 <strong>Crisis Protocol:</strong> If a member expresses suicidal thoughts or imminent danger, alert the
            session facilitator immediately. Do not attempt to manage a crisis independently. Facilitators may
            activate internal escalation protocols where required.
          </p>
          <p>3.7 <strong>One Voice at a Time:</strong> In group sessions, allow each person to speak without interruption.</p>
          <p>
            3.8 <strong>No Recording:</strong> Audio recording, video recording, livestreaming, screenshot capture,
            transcription, or external broadcasting of sessions or forums is strictly prohibited.
          </p>

          <h2>4. MODERATION</h2>
          <p>4.1 Group sessions are facilitated by licensed therapists or trained coaches who moderate interactions.</p>
          <p>4.2 Forum posts are reviewed by AI moderation and human moderators.</p>
          <p>4.3 Violations result in removal from the session/forum and potential account action.</p>

          <h2>5. DISCLAIMER</h2>
          <p>
            5.1 Community forums and peer discussions are not substitutes for individualized clinical diagnosis or
            emergency medical care.
          </p>
          <p>
            5.2 Views expressed by participants (other than designated facilitators) are personal opinions and do not
            represent the views of MANAS360.
          </p>

          <h2>6. CHANGES TO THIS POLICY</h2>
          <p>
            6.1 We may update this Policy periodically to reflect legal, technical, or operational changes. Material
            changes will be notified via email and in-app notification. Continued accessing or using the Platform
            after notification constitutes acceptance of the revised Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

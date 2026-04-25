import { useEffect } from 'react';

export default function TherapistCodeOfConduct() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">MANAS360 - Professional Code of Conduct for Providers</h1>
        <div className="prose prose-lg max-w-none">
          <h2>1. CLINICAL STANDARDS</h2>
          <p>
            1.1 All clinical practice shall conform to the ethical and clinical guidelines of the Rehabilitation
            Council of India (RCI), National Medical Commission (NMC), and the Mental Healthcare Act, 2017 and
            relevant professional guidelines.
          </p>
          <p>
            1.2 Providers shall deliver services strictly within the scope of their professional training, licensure,
            and clinical competence. If a patient&apos;s clinical needs exceed the Provider&apos;s expertise, the Provider
            shall make an appropriate referral recommendation.
          </p>
          <p>
            1.3 Providers shall maintain accurate, contemporaneous session records using MANAS360&apos;s documentation
            system.
          </p>

          <h2>2. PATIENT RIGHTS</h2>
          <p>
            2.1 Providers shall respect patient autonomy, informed consent, and the right to refuse or discontinue
            treatment.
          </p>
          <p>
            2.2 Providers shall not discriminate based on race, religion, caste, gender, sexual orientation,
            disability, age, or socioeconomic status.
          </p>
          <p>2.3 Providers shall maintain patient confidentiality in accordance with the NDA and DPA.</p>

          <h2>3. PROFESSIONAL BOUNDARIES</h2>
          <p>
            3.1 Providers shall NOT engage in dual relationships with patients (personal, social, financial, or
            sexual).
          </p>
          <p>
            3.2 Providers shall not accept gifts, favors, or benefits from patients if the value exceeds INR 500, or
            if acceptance may reasonably be perceived as influencing clinical judgment or professional integrity.
          </p>
          <p>
            3.3 Providers shall not provide clinical services to immediate family members, close personal
            acquaintances, or individuals where a conflict of interest may exist.
          </p>
          <p>
            3.4 Providers shall maintain professional appearance, communication standards, and appropriate clinical
            environment settings during video-based consultations, including maintaining an appropriate and
            distraction-free background.
          </p>
          <p>
            3.5 Providers shall refrain from engaging in any conduct, action, or communication that may compromise
            therapeutic neutrality, professional integrity, clinical objectivity, or patient safety, whether during
            Platform interactions or in any context connected to services delivered through the Platform.
          </p>

          <h2>4. PLATFORM CONDUCT</h2>
          <p>
            4.1 Providers shall respond to messages and booking requests within 4 hours during stated availability.
          </p>
          <p>4.2 Providers shall maintain a cancellation rate of less than 5% and a no-show rate less than 2%.</p>
          <p>
            4.3 Providers shall participate in mandatory training programs, compliance refreshers, and quality
            assurance updates conducted by MANAS360 on a quarterly basis or as required.
          </p>
          <p>
            4.4 Providers shall not solicit, divert, or encourage patients to obtain services outside the Platform or
            share personal contact details for off-platform consultation.
          </p>

          <h2>5. CRISIS MANAGEMENT</h2>
          <p>
            5.1 If a patient presents with imminent risk of suicide or harm, the Provider shall: (a) assess risk level
            using validated clinical tools; (b) activate MANAS360&apos;s crisis intervention protocol; (c) ensure the
            patient has access to emergency contacts; (d) document the assessment and intervention in session notes
            within 1 hour; (e) follow up within 24 hours.
          </p>
          <p>5.2 Providers shall act in good faith to prioritize patient safety in emergency situations.</p>

          <h2>6. VIOLATIONS</h2>
          <p>
            6.1 Any violation of this Code of Conduct may result in corrective actions including mandatory retraining,
            temporary suspension, or permanent removal from the Platform, and may also be reported to relevant
            regulatory authorities including professional councils such as RCI or NMC, where applicable, and other
            legal enforcement agencies as deemed necessary.
          </p>
        </div>
      </div>
    </div>
  );
}

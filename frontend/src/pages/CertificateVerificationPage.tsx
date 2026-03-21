import React, { useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, ShieldCheck, XCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useEnrollmentStore } from '../store/CertificationEnrollmentStore';
import { Enrollment } from '../CertificationTypes';

function calcFontVw(name: string): number {
    return Math.min(56 / (name.length * 0.60), 1.75);
}

const CertificateVerificationPage: React.FC = () => {
    const { certId } = useParams<{ certId: string }>();
    const certificateRef = useRef<HTMLDivElement>(null);
    const { enrollments } = useEnrollmentStore();

    /**
     * THE FIX: Match ONLY on the stored e.certId field.
     *
     * The old code had a "Pass 2" fallback that re-derived certId from
     * enrollmentId using a hash — this hash collides across users
     * (both AVinay and vinay2 hash to "72ZLBN"), so it returned the wrong person.
     *
     * The ONLY safe lookup is: certId stored on the enrollment === certId in URL.
     * No hash fallback. No Zustand loop with derived IDs.
     *
     * For this to work, CertificationCertificatePage MUST call updateEnrollment()
     * to store certId on the enrollment when the cert is first viewed.
     * See CertificationCertificatePage.tsx for that change.
     */
    const enrollment: Enrollment | undefined = useMemo(() => {
        if (!certId) return undefined;
        const upper = certId.toUpperCase();
        return enrollments.find(
            (e: Enrollment) => e.certId && e.certId.toUpperCase() === upper
        );
    }, [certId, enrollments]);

    const verifyUrl = `${window.location.origin}/#/verify/${certId}`;
    const fontVw = enrollment ? calcFontVw(enrollment.certificationName) : 1.75;

    const handleDownloadPDF = async () => {
        if (!certificateRef.current) return;
        try {
            const canvas = await html2canvas(certificateRef.current, {
                scale: 3, useCORS: true, allowTaint: true,
                backgroundColor: null, logging: false,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape', unit: 'px',
                format: [canvas.width / 3, canvas.height / 3],
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 3, canvas.height / 3);
            pdf.save(`Certificate-${enrollment?.certificationName || 'Manas360'}-${certId}.pdf`);
        } catch (err) {
            console.error('PDF generation failed:', err);
        }
    };

    return (
        <div className="min-h-screen bg-[#111827] py-10 px-4 flex flex-col items-center">

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Cinzel:wght@400;600&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; padding: 0; }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>

            {/* ── Top Bar ── */}
            <div className="no-print w-full max-w-[980px] mb-6">
                <div className="flex items-center justify-between">


                    {enrollment ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900/50 border border-emerald-500/40 rounded-full">
                            <ShieldCheck size={16} className="text-emerald-400" />
                            <span className="text-emerald-300 text-sm font-semibold">
                                Certificate Verified — ID:{' '}
                                <span className="font-mono tracking-widest text-emerald-200">
                                    {certId?.toUpperCase()}
                                </span>
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-900/50 border border-red-500/40 rounded-full">
                            <XCircle size={16} className="text-red-400" />
                            <span className="text-red-300 text-sm font-semibold">
                                Certificate not found — ID:{' '}
                                <span className="font-mono tracking-widest">{certId?.toUpperCase()}</span>
                            </span>
                        </div>
                    )}

                    {enrollment && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 border border-white/20 transition text-sm"
                            >
                                <Printer size={16} /> Print
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-white text-sm transition hover:brightness-110 shadow-lg"
                                style={{ background: 'linear-gradient(135deg,#c5a059,#8a6d3b)' }}
                            >
                                <Download size={16} /> Download PDF
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Not Found State ── */}
            {!enrollment && (
                <div className="w-full max-w-[980px] bg-[#1a2235] rounded-2xl p-12 text-center border border-slate-700">
                    <div className="text-5xl mb-4">🔍</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Certificate Not Found</h2>
                    <p className="text-slate-400 mb-3">
                        No certificate found for ID:{' '}
                        <span className="font-mono text-amber-400 tracking-widest font-bold">
                            {certId?.toUpperCase()}
                        </span>
                    </p>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                        Please open the certificate page first so your certificate gets registered,
                        then use the verification link from there.
                    </p>
                </div>
            )}

            {/* ── Certificate ── */}
            {enrollment && (
                <>
                    <div
                        ref={certificateRef}
                        className="relative w-full max-w-[980px] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden"
                        style={{ aspectRatio: '2340 / 1655' }}
                    >
                        <img
                            src="/Certificate.png"
                            alt="Certificate background"
                            className="absolute inset-0 w-full h-full"
                            style={{ objectFit: 'fill' }}
                            crossOrigin="anonymous"
                        />

                        <div
                            className="absolute bg-white"
                            style={{
                                top: '3%', right: '1.5%',
                                width: '8%', aspectRatio: '1 / 1',
                                padding: '0.4%', boxSizing: 'border-box',
                            }}
                        >
                            <QRCodeSVG
                                value={verifyUrl}
                                size={256}
                                fgColor="#0a1630"
                                bgColor="#ffffff"
                                includeMargin={false}
                                style={{ width: '100%', height: '100%', display: 'block' }}
                            />
                        </div>

                        <div
                            className="absolute flex items-center justify-center"
                            style={{ top: '36%', left: '4%', width: '58%', height: '16%' }}
                        >
                            <span style={{
                                fontFamily: "'Great Vibes', cursive",
                                color: '#c5a059',
                                fontSize: `clamp(1rem, ${Math.min(5.4, 58 / ((enrollment.userName || 'Recipient Name').length * 0.55))}vw, 4.2rem)`,
                                lineHeight: 1.1,
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                                textShadow: '0 2px 16px rgba(197,160,89,0.5)',
                            }}>
                                {enrollment.userName || 'Recipient Name'}
                            </span>
                        </div>

                        <div
                            className="absolute flex items-center justify-center"
                            style={{ top: '63.5%', left: '4%', width: '56%', height: '4.5%' }}
                        >
                            <span style={{
                                fontFamily: "'Cinzel', serif",
                                fontWeight: 600,
                                color: '#c9b87a',
                                fontSize: `${fontVw}vw`,
                                letterSpacing: '0.02em',
                                whiteSpace: 'nowrap',
                                display: 'block',
                                lineHeight: 1,
                                textAlign: 'center',
                                width: '100%',
                            }}>
                                {enrollment.certificationName}
                            </span>
                        </div>

                        <div
                            className="absolute flex items-center"
                            style={{ top: '83.44%', left: '30.5%', height: '2.48%' }}
                        >
                            <span style={{
                                fontFamily: "'Cinzel', serif",
                                color: '#c5a059',
                                fontWeight: 600,
                                fontSize: '1.26vw',
                                letterSpacing: '0.18em',
                                whiteSpace: 'nowrap',
                                lineHeight: 1,
                            }}>
                                {' ' + certId?.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <div className="no-print mt-5 text-center space-y-1">
                        <p className="text-slate-400 text-xs">
                            Certificate ID:{' '}
                            <span className="text-amber-400 font-mono font-bold tracking-widest">
                                {certId?.toUpperCase()}
                            </span>
                            {' · '}
                            <span className="text-slate-500">
                                Issued to <span className="text-slate-300">{enrollment.userName}</span>
                                {' · '}
                                {enrollment.enrollmentDate}
                            </span>
                        </p>
                        <p className="text-slate-600 text-xs">
                            This certificate was issued by Manas360 Mental Wellness Pvt Ltd.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default CertificateVerificationPage;
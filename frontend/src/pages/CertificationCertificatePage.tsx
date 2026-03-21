import React, { useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEnrollmentStore } from '../store/CertificationEnrollmentStore';
import { Enrollment } from '../CertificationTypes';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ArrowLeft, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function generateCertId(enrollmentId: string): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let seed = 0;
    for (let i = 0; i < enrollmentId.length; i++) {
        seed = (seed * 31 + enrollmentId.charCodeAt(i)) >>> 0;
    }
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars[seed % chars.length];
        seed = (seed * 1664525 + 1013904223) >>> 0;
    }
    return result;
}

function calcFontVw(name: string): number {
    return Math.min(56 / (name.length * 0.60), 1.75);
}

const CertificationCertificatePage: React.FC = () => {
    const { enrollmentId } = useParams<{ enrollmentId: string }>();
    const navigate = useNavigate();
    const { enrollments, updateEnrollment } = useEnrollmentStore();
    const certificateRef = useRef<HTMLDivElement>(null);

    const enrollment = enrollments.find((e: Enrollment) => e.id === enrollmentId);

    const certId = enrollment?.certId ?? (enrollmentId ? generateCertId(enrollmentId) : 'MX0001');

    /**
     * THE KEY FIX: Write certId onto the enrollment record on first view.
     * The verification page matches ONLY on e.certId (no hash fallback),
     * so this stored value is the single source of truth.
     */
    useEffect(() => {
        if (enrollment && !enrollment.certId && updateEnrollment) {
            updateEnrollment(enrollment.id, { certId });
        }
    }, [enrollment, certId, updateEnrollment]);

    const qrValue = `${window.location.origin}/#/verify/${certId}`;
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

    if (!enrollment) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-800 mb-4">
                        Certification Details Not Loaded
                    </h2>
                    <button onClick={() => navigate(-1)} className="text-teal-600 font-bold hover:underline">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

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

            <div className="no-print max-w-[980px] w-full flex justify-between items-center mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-300 hover:text-white font-semibold transition text-sm"
                >
                    <ArrowLeft size={18} /> Back to Learning
                </button>
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
            </div>

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
                        value={qrValue} size={256}
                        fgColor="#0a1630" bgColor="#ffffff"
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
                    style={{ top: '84.1%', left: '30.4%', height: '2.48%' }}
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
                        {' ' + certId}
                    </span>
                </div>
            </div>

            <p className="no-print mt-4 text-slate-500 text-xs text-center">
                Certificate ID:{' '}
                <span className="text-amber-400 font-mono font-bold tracking-widest">{certId}</span>
                {' · '}Verify at{' '}
                <a href={qrValue} className="text-amber-400 underline underline-offset-2" target="_blank" rel="noreferrer">
                    {window.location.hostname}/#/verify/{certId}
                </a>
            </p>
        </div>
    );
};

export default CertificationCertificatePage;
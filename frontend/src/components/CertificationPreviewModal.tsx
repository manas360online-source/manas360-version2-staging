import React, { useState } from 'react';
import { Download, Check, QrCode } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificationName: string;
  studentName?: string;
  issueDate: string;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  isOpen,
  onClose,
  certificationName,
  studentName = "Sudhanshu",
  issueDate
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    const element = document.getElementById('certificate-download-view');
    
    if (element) {
        try {
            // High scale for better quality
            const canvas = await html2canvas(element, { 
                scale: 4, 
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfImgHeight);
            pdf.save(`${certificationName.replace(/\\s+/g, '_')}_Certificate.pdf`);
        } catch (error) {
            console.error("PDF Generation failed", error);
            alert("Failed to generate PDF. Please try again.");
        }
    }
    setIsDownloading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full pointer-events-none">
        
        {/* Scrollable area wrapper for small screens */}
        <div className="pointer-events-auto flex flex-col items-center w-full max-h-full overflow-y-auto p-4">
            
            {/* 
               Certificate Container 
            */}
            <div className="relative flex flex-col items-center justify-center mb-6 max-w-full">
                
                {/* 
                  The Visual Certificate 
                  Using a fixed pixel size for A4 (794px x 1123px at 96 DPI) to ensure exact PDF layout.
                  Scaled down via CSS transform for small screens if needed, but handled here via responsive constraints.
                */}
                <div 
                    id="certificate-download-view"
                    className="shadow-2xl relative flex flex-col box-border text-center overflow-hidden text-slate-900"
                    style={{
                        width: '794px', 
                        height: '1123px',
                        maxWidth: '100%',
                        margin: '0 auto',
                        padding: '45px',
                        background: 'linear-gradient(180deg, #6E67CC 0%, #695EC2 100%)'
                    }}
                >
                    {/* The White Paper Container */}
                    <div className="flex-1 bg-white relative flex flex-col items-center p-8 md:p-12 h-full shadow-lg">
                        
                        {/* Inner Decorative Border */}
                        <div className="absolute inset-3 border-[2px] border-[#6C63C8] opacity-20 pointer-events-none"></div>

                        {/* Verified Badge - Top Right */}
                        <div className="absolute top-8 right-8 z-20">
                            <span className="bg-[#6C63C8] text-white text-[10px] px-3 py-1 rounded-full uppercase font-bold tracking-widest flex items-center gap-1 shadow-sm">
                                <Check size={10} strokeWidth={4} /> Certified
                            </span>
                        </div>

                        {/* Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                             <div className="text-slate-100 text-[100px] md:text-[120px] font-bold uppercase -rotate-45 transform select-none opacity-60">Verified</div>
                        </div>

                        {/* Content Layer */}
                        <div className="relative z-10 w-full flex-1 flex flex-col items-center text-center pt-8">
                            
                            {/* Logo Section */}
                            <div className="mb-4">
                                <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#6C63C8] tracking-wide">MANAS360</h1>
                                <p className="text-[10px] md:text-xs text-slate-400 tracking-[0.3em] uppercase font-bold mt-3">Digital Mental Health Platform</p>
                            </div>

                            <div className="w-full flex-1 flex flex-col justify-center">
                                {/* Title */}
                                <div className="mb-10">
                                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#6C63C8]">
                                        Therapist Professional Certification
                                    </h2>
                                </div>

                                {/* Certify Text */}
                                <p className="text-slate-500 text-sm italic mb-8">This is to certify that</p>
                                
                                {/* Name */}
                                <div className="mb-10 relative inline-block">
                                    <h3 className="text-4xl md:text-5xl font-serif font-bold text-slate-800 px-8 pb-3 border-b-2 border-slate-200 inline-block min-w-[350px]">
                                        {studentName}
                                    </h3>
                                </div>

                                {/* Completed Text */}
                                <p className="text-slate-500 text-sm italic mb-8">has successfully completed the</p>

                                {/* Course Name */}
                                <div className="mb-10">
                                    <h3 className="text-2xl md:text-3xl font-serif font-bold text-[#6C63C8]">
                                        {certificationName}
                                    </h3>
                                </div>

                                {/* Description */}
                                <p className="text-slate-500 text-xs md:text-sm leading-relaxed max-w-lg mx-auto mb-16 px-4">
                                    and has demonstrated exceptional mastery in clinical mental health protocols, evidence-based therapeutic practices, and ethical standards of patient care.
                                </p>
                            </div>

                            {/* Signatures */}
                            <div className="w-full flex justify-between items-end px-4 mb-10 mt-auto gap-4">
                                <div className="text-center flex-1">
                                    <div className="border-b border-slate-300 pb-2 mb-2 flex justify-center items-end h-12">
                                         <img src="https://api.dicebear.com/7.x/initials/svg?seed=MG&fontFamily=Dancing%20Script" alt="Sig" className="h-10 opacity-80" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-800">Mahan Gupta</p>
                                    <p className="text-[10px] text-slate-500 font-serif italic">CEO & Founder</p>
                                </div>
                                <div className="text-center flex-1">
                                     <div className="border-b border-slate-300 pb-2 mb-2 flex justify-center items-end h-12">
                                         <img src="https://api.dicebear.com/7.x/initials/svg?seed=PS&fontFamily=Dancing%20Script" alt="Sig" className="h-10 opacity-80" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-800">Dr. Priya Sharma</p>
                                    <p className="text-[10px] text-slate-500 font-serif italic">Chief Medical Officer</p>
                                </div>
                                <div className="text-center flex-1">
                                     <div className="border-b border-slate-300 pb-2 mb-2 flex justify-center items-end h-12">
                                         <img src="https://api.dicebear.com/7.x/initials/svg?seed=AV&fontFamily=Dancing%20Script" alt="Sig" className="h-10 opacity-80" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-800">Ms. Anjali Verma</p>
                                    <p className="text-[10px] text-slate-500 font-serif italic">Head of Training</p>
                                </div>
                            </div>

                            {/* Footer Data */}
                            <div className="w-full flex justify-between items-end pt-2">
                                <div className="text-left text-[9px] text-slate-400 font-mono leading-tight">
                                    <p>Completion: 2026-01-16</p>
                                    <p>Issued: {issueDate}</p>
                                    <p>ID: MANAS360-CERT-2025-PENDING</p>
                                </div>
                                <div>
                                    <QrCode size={40} className="text-slate-800" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer actions */}
            <div className="flex gap-4 mb-4">
                <button 
                    onClick={onClose}
                    className="px-8 py-3 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition shadow-xl text-sm ring-1 ring-slate-200"
                >
                    Close
                </button>
                <button 
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="px-8 py-3 bg-[#6C63C8] text-white font-bold rounded-xl hover:bg-[#5a52b0] transition flex items-center gap-2 shadow-xl shadow-indigo-900/20 text-sm transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isDownloading ? (
                        <>Generating PDF...</>
                    ) : (
                        <>
                            <Download size={18} /> Download Certificate
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

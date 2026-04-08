import { useState } from 'react';

interface BulkPatientImportProps {
  clinicId: string;
}

export default function BulkPatientImport({ clinicId }: BulkPatientImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const downloadCSVTemplate = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Gender', 'Employee/Student ID', 'Department/Grade', 'Designation/Section'];
    const sampleRows = [
      ['John', 'Doe', 'john.doe@example.com', 'Male', 'E001', 'Sales', 'Manager'],
      ['Jane', 'Smith', 'jane.smith@example.com', 'Female', 'E002', 'HR', 'Executive'],
    ];

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `patient-import-template-${clinicId}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clinicId', clinicId);

      // Mock upload - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessage(`✓ File uploaded successfully for clinic ${clinicId}`);
      setFile(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setMessage(`✗ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Bulk Patient Import</h2>
      
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="mb-3 text-sm font-medium text-gray-900">Required Attributes:</p>
          <ul className="list-inside list-disc space-y-1 text-xs text-gray-600">
            <li>First Name (Letters & Spaces only)</li>
            <li>Last Name (Letters & Spaces only)</li>
            <li>Email (Must be unique)</li>
            <li>Gender (Male, Female, Other, PNT)</li>
            <li>Employee/Student ID (Case-insensitive)</li>
            <li>Department/Grade (Optional)</li>
            <li>Designation/Section (Optional)</li>
          </ul>
        </div>

        <button
          onClick={downloadCSVTemplate}
          className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          ⬇ Download CSV Template
        </button>

        <div className="rounded-lg border-2 border-dashed border-gray-300 p-6">
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileChange}
            disabled={isLoading}
            className="block w-full text-sm text-gray-600"
          />
          <p className="mt-2 text-xs text-gray-500">
            Supported formats: CSV, XLSX
          </p>
        </div>

        {file && (
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-sm text-blue-900">Selected: {file.name}</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={isLoading || !file}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-400"
        >
          {isLoading ? 'Uploading...' : 'Upload'}
        </button>

        {message && (
          <div className={`rounded-lg p-3 ${message.startsWith('✓') ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
            <p className="text-sm">{message}</p>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-600">
          <p className="font-medium">Clinic ID: {clinicId}</p>
        </div>
      </div>
    </div>
  );
}

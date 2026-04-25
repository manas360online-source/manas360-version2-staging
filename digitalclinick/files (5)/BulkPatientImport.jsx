import { useState, useCallback } from 'react';

const API_BASE = '/api/mdc';

export default function BulkPatientImport({ clinicId }) {
  const [stage, setStage] = useState('upload'); // upload | preview | importing | done
  const [parseResult, setParsResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const downloadTemplate = () => {
    const csv = [
      'Name,Phone,Email,Age,Gender,Issue,Status',
      'Priya Sharma,+91-98765-43210,priya@email.com,28,F,Anxiety,active',
      'Ravi Kumar,+91-98765-43211,ravi@email.com,34,M,Depression,active',
      'Meera Patel,+91-98765-43212,,22,F,OCD,active',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MyDigitalClinic_Patient_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadFile = useCallback(async (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setError('Please upload a .csv file');
      return;
    }
    setError(null);
    setStage('preview');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/patients/import/parse`, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setParsResult(data);
    } catch (err) {
      setError(err.message);
      setStage('upload');
    }
  }, []);

  const confirmImport = async () => {
    if (!parseResult?._parseToken) return;
    setStage('importing');
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/patients/import/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ parseToken: parseResult._parseToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportResult(data);
      setStage('done');
    } catch (err) {
      setError(err.message);
      setStage('preview');
    }
  };

  const reset = () => {
    setStage('upload');
    setParsResult(null);
    setImportResult(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    uploadFile(file);
  };

  return (
    <div className="rounded-xl border-2 border-[#4A6741] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4A6741] to-[#3a5631] text-white px-5 py-3 flex items-center gap-2">
        <span className="text-xl">📥</span>
        <h4 className="font-bold text-sm font-['Outfit']">Bulk Patient Import (CSV)</h4>
        <span className="ml-auto bg-white/20 px-3 py-0.5 rounded-full text-[10px] font-semibold">Max 500 patients</span>
      </div>

      <div className="p-5">
        {/* Template download */}
        <button onClick={downloadTemplate}
          className="bg-[#e8f0e5] text-[#4A6741] border border-[#d4ddd0] rounded-md px-4 py-1.5 text-xs font-semibold hover:bg-[#4A6741] hover:text-white transition mb-3">
          ⬇ Download CSV Template
        </button>
        <span className="text-[11px] text-gray-400 ml-2">Fill this template → upload below</span>

        {/* Upload zone */}
        {stage === 'upload' && (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition mt-3 ${
              dragOver ? 'border-[#4A6741] bg-[#e8f0e5]' : 'border-gray-300 bg-[#f4f8f2] hover:border-[#4A6741]'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csv-input').click()}
          >
            <div className="text-3xl mb-1">📁</div>
            <div className="text-sm font-medium text-gray-600">Drop your CSV file here or click to browse</div>
            <div className="text-[11px] text-gray-400 mt-1">
              Accepted: .csv · Max 500 rows · Columns: Name, Phone, Email, Age, Gender, Issue, Status
            </div>
            <input id="csv-input" type="file" accept=".csv" className="hidden"
              onChange={(e) => uploadFile(e.target.files[0])} />
          </div>
        )}

        {/* Preview */}
        {stage === 'preview' && parseResult && (
          <div className="mt-3">
            <div className="bg-[#d1fae5] text-[#065f46] px-4 py-2 rounded-lg text-xs font-semibold mb-3">
              ✅ {parseResult.validCount} patients ready to import
              {parseResult.errorCount > 0 && ` · ${parseResult.errorCount} rows have errors (will be skipped)`}
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#4A6741] text-white">
                    <th className="px-2 py-1.5 text-left font-semibold">#</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Name</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Phone</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Email</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Gender</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.validRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f4f8f2]'}>
                      <td className="px-2 py-1 font-bold text-[#4A6741]">{row.rowNumber}</td>
                      <td className="px-2 py-1">{row.name}</td>
                      <td className="px-2 py-1 font-mono text-[10px]">{row.phone}</td>
                      <td className="px-2 py-1">{row.email || '—'}</td>
                      <td className="px-2 py-1">{row.gender || '—'}</td>
                      <td className="px-2 py-1">{row.issue || '—'}</td>
                    </tr>
                  ))}
                  {parseResult.validCount > 10 && (
                    <tr><td colSpan={6} className="text-center text-gray-400 py-2 italic">
                      ...and {parseResult.validCount - 10} more patients
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Error rows */}
            {parseResult.errorRows.length > 0 && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-xs font-bold text-red-700 mb-1">⚠ Rows with errors (will be skipped):</div>
                {parseResult.errorRows.map((row, i) => (
                  <div key={i} className="text-[11px] text-red-600">
                    Row {row.rowNumber}: {row.errors.join(', ')}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={confirmImport}
                className="bg-[#4A6741] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-[#3a5631] transition">
                ✅ Import {parseResult.validCount} Patients
              </button>
              <button onClick={reset}
                className="bg-gray-100 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Importing */}
        {stage === 'importing' && (
          <div className="mt-3 text-center py-8">
            <div className="text-3xl animate-spin mb-2">⏳</div>
            <div className="text-sm font-semibold text-gray-600">Importing patients...</div>
          </div>
        )}

        {/* Done */}
        {stage === 'done' && importResult && (
          <div className="mt-3">
            <div className="bg-[#d1fae5] border border-green-300 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-lg font-bold text-[#065f46]">{importResult.imported} Patients Imported</div>
              <div className="text-xs text-green-700 mt-1">
                {importResult.skipped > 0 && `${importResult.skipped} duplicates skipped · `}
                {importResult.errors > 0 && `${importResult.errors} errors · `}
                Import ID: {importResult.importId}
              </div>
            </div>
            <button onClick={reset}
              className="mt-3 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 w-full">
              Import More Patients
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700 font-semibold">
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  );
}

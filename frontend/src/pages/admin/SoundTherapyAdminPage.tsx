import { useState, useEffect } from 'react';
import { api as adminApi } from '../../api/admin.api';
import { useAuth } from '../../context/AuthContext';

interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  description: string;
  frequency: string;
  duration: string;
  embedCode: string;
  isActive: boolean;
  createdAt: string;
}

export default function SoundTherapyAdminPage() {
  const { isAuthenticated } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    genre: 'healing_frequency',
    frequency: '',
    duration: '',
    description: '',
    embedCode: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchTracks();
    }
  }, [isAuthenticated]);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/admin/sound');
      setTracks(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.post('/admin/sound', formData);
      setFormData({
        title: '',
        genre: 'healing_frequency',
        frequency: '',
        duration: '',
        description: '',
        embedCode: '',
      });
      fetchTracks();
      alert('Audio uploaded successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload audio');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this track?')) return;
    try {
      await adminApi.delete(`/admin/sound/${id}`);
      fetchTracks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete track');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Audio Upload</h1>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Upload New Audio</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="w-full rounded-md border border-slate-300 p-2 text-sm"
                placeholder="e.g. 432 Hz Healing Frequency"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Genre *</label>
              <select
                name="genre"
                required
                value={formData.genre}
                onChange={handleInputChange}
                className="w-full rounded-md border border-slate-300 p-2 text-sm"
              >
                <option value="healing_frequency">Frequencies</option>
                <option value="indian_classical">Indian Classical</option>
                <option value="nature">Nature Sounds</option>
                <option value="sleep">Sleep Therapy</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                <input
                  type="text"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm"
                  placeholder="e.g. 432 Hz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                <input
                  type="text"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm"
                  placeholder="e.g. 10:00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full rounded-md border border-slate-300 p-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vimeo Embed Code *</label>
              <textarea
                name="embedCode"
                required
                rows={4}
                value={formData.embedCode}
                onChange={handleInputChange}
                className="w-full rounded-md border border-slate-300 p-2 text-sm font-mono text-xs"
                placeholder='<div style="padding:56.25% 0 0 0;..."><iframe src="..."></iframe></div>'
              />
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 text-white rounded-md py-2 text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Upload Audio
            </button>
          </form>
        </div>

        {/* Tracks List */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Uploaded Audios</h2>
          {loading ? (
            <div className="text-sm text-slate-500">Loading...</div>
          ) : tracks.length === 0 ? (
            <div className="text-sm text-slate-500">No audios uploaded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium">Genre</th>
                    <th className="pb-2 font-medium">Duration</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {tracks.map(track => (
                    <tr key={track.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900">{track.title}</div>
                        {track.frequency && <div className="text-xs text-slate-500">{track.frequency}</div>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{track.genre}</td>
                      <td className="py-3 px-4 text-slate-600">{track.duration || '—'}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(track.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-xs px-2 py-1 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

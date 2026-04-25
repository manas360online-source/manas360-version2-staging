import { useState, useEffect } from 'react';
import './SoundTherapyPage.css';

interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  frequency: string;
  duration: string;
  embedCode: string;
}

const GENRE_CONFIG: Record<string, { label: string; icon: string }> = {
  all: { label: 'All', icon: '🎵' },
  healing_frequency: { label: 'Frequencies', icon: '🎵' },
  indian_classical: { label: 'Indian Classical', icon: '🪕' },
  nature: { label: 'Nature', icon: '🌿' },
  sleep: { label: 'Sleep', icon: '🌙' },
};

export default function SoundTherapyPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      const res = await fetch('/api/v1/sounds/tracks');
      if (res.ok) {
        const json = await res.json();
        setTracks(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tracks', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTracks = currentFilter === 'all'
    ? tracks
    : tracks.filter(t => t.genre === currentFilter);

  const handlePlayToggle = (trackId: string) => {
    if (currentTrackId === trackId) {
      setCurrentTrackId(null);
    } else {
      setCurrentTrackId(trackId);
    }
  };

  const handleStopTrack = () => {
    setCurrentTrackId(null);
  };

  const currentTrack = tracks.find(t => t.id === currentTrackId);

  return (
    <div className="sound-therapy-container">
      {/* HERO */}
      <div className="st-hero">
        <div className="st-hero-eyebrow">Heal Through Sound</div>
        <h1>Sound <span>Therapy</span></h1>
        <p className="st-hero-sub">Healing frequencies, Indian classical ragas, nature soundscapes, and sleep audio — curated for mental wellness. Free and accessible to everyone.</p>
        
        <div className="st-hero-stats">
          <div className="st-hero-stat">
            <div className="num">{tracks.length}</div>
            <div className="label">Tracks</div>
          </div>
          <div className="st-hero-stat">
            <div className="num">Free</div>
            <div className="label">Access</div>
          </div>
          <div className="st-hero-stat">
            <div className="num">24/7</div>
            <div className="label">Available</div>
          </div>
        </div>

        <div className="st-neuro-row">
          <div className="st-neuro-pill">🧬 Dopamine</div>
          <div className="st-neuro-pill">🧬 Serotonin</div>
          <div className="st-neuro-pill">🧬 Oxytocin</div>
          <div className="st-neuro-pill">🧬 Cortisol ↓</div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="st-filter-bar">
        <button
          className={`st-filter-chip ${currentFilter === 'all' ? 'active' : ''}`}
          onClick={() => setCurrentFilter('all')}
        >
          All
        </button>
        {Object.entries(GENRE_CONFIG)
          .filter(([key]) => key !== 'all')
          .map(([key, config]) => (
            <button
              key={key}
              className={`st-filter-chip ${currentFilter === key ? 'active' : ''}`}
              onClick={() => setCurrentFilter(key)}
            >
              {config.icon} {config.label}
            </button>
          ))}
      </div>

      {/* NOW PLAYING */}
      {currentTrack && (
        <div className="st-now-playing">
          <div className="st-np-bars">
            <div className="st-np-bar"></div>
            <div className="st-np-bar"></div>
            <div className="st-np-bar"></div>
          </div>
          <div className="st-np-info">
            <div className="st-np-title">{currentTrack.title}</div>
            <div className="st-np-meta">Now Playing • Free access</div>
          </div>
          <button className="st-np-close" onClick={handleStopTrack}>✕</button>
        </div>
      )}

      {/* PLAYER */}
      {currentTrack && (
        <div className="w-full max-w-4xl mx-auto my-8 overflow-hidden rounded-2xl bg-black shadow-xl">
          <div dangerouslySetInnerHTML={{ __html: currentTrack.embedCode }} />
        </div>
      )}

      {/* TRACKS TABLE */}
      <div className="st-tracks-section">
        <div className="st-tracks-label">
          Library ({filteredTracks.length} tracks found)
        </div>
        
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading your wellness tracks...</div>
        ) : filteredTracks.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No tracks available in this category yet.</div>
        ) : (
          <table className="st-track-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Track Information</th>
                <th>Genre</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTracks.map((track, idx) => {
                const isPlaying = currentTrackId === track.id;
                const genreConfig = GENRE_CONFIG[track.genre] || { icon: '🎵', label: track.genre };
                return (
                  <tr key={track.id}>
                    <td style={{ color: '#9CA3AF', fontWeight: 'bold', width: '40px' }}>{idx + 1}</td>
                    <td>
                      <div className="st-track-info">
                        <div className="st-track-thumb">
                          {genreConfig.icon}
                        </div>
                        <div>
                          <div className="st-track-title">
                            {track.title}
                            <span className="st-free-badge">FREE</span>
                          </div>
                          <div className="st-track-artist">{track.artist}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`st-track-genre st-genre-${track.genre}`}>
                        {genreConfig.label}
                      </span>
                    </td>
                    <td style={{ color: '#6B7280', fontWeight: '500' }}>{track.frequency || '—'}</td>
                    <td style={{ color: '#6B7280' }}>{track.duration || '—'}</td>
                    <td>
                      <button
                        className={`st-play-btn ${isPlaying ? 'playing' : ''}`}
                        onClick={() => handlePlayToggle(track.id)}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? '⏸' : '▶'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

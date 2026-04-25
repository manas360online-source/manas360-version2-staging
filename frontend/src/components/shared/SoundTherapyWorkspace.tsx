import { useState, useEffect } from 'react';
import './SoundTherapyWorkspace.css';

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
  raga_therapy: { label: 'Raga Therapy', icon: '🎼' },
  nature: { label: 'Nature', icon: '🌿' },
  sleep: { label: 'Sleep', icon: '🌙' },
};

interface SoundTherapyWorkspaceProps {
  mode: 'landing' | 'dashboard';
}

export default function SoundTherapyWorkspace({ mode }: SoundTherapyWorkspaceProps) {
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
    <div className={`sound-therapy-workspace ${mode}`}>
      {/* HERO SECTION */}
      <div className="st-hero">
        <div className="st-hero-content">
          <div className="st-hero-eyebrow">Heal Through Sound</div>
          <h1>Sound <span>Therapy</span></h1>
          <p className="st-hero-sub">
            Healing frequencies, Indian classical ragas, nature soundscapes, and sleep audio — 
            curated for mental wellness. Free and accessible to everyone.
          </p>

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
      </div>

      {/* FILTER BAR */}
      <div className="st-filter-container">
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
      </div>

      {/* PLAYER DISPLAY */}
      {currentTrack && (
        <div className="st-player-container">
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
          
          <div className="st-embed-wrapper shadow-2xl">
            <div dangerouslySetInnerHTML={{ __html: currentTrack.embedCode }} />
          </div>
        </div>
      )}

      {/* TRACKS LIST */}
      <div className="st-library-section">
        <div className="st-library-header">
          <h2>Library</h2>
          <span className="st-count">{filteredTracks.length} tracks found</span>
        </div>

        {loading ? (
          <div className="st-loading">Loading your wellness tracks...</div>
        ) : filteredTracks.length === 0 ? (
          <div className="st-empty">No tracks available in this category yet.</div>
        ) : (
          <div className="st-table-wrapper">
            <table className="st-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Track Information</th>
                  <th>Genre</th>
                  <th className="hide-mobile">Frequency</th>
                  <th className="hide-mobile">Duration</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTracks.map((track, idx) => {
                  const isPlaying = currentTrackId === track.id;
                  const genreConfig = GENRE_CONFIG[track.genre] || { icon: '🎵', label: track.genre };
                  return (
                    <tr key={track.id} className={isPlaying ? 'playing-row' : ''}>
                      <td className="st-idx">{idx + 1}</td>
                      <td>
                        <div className="st-track-info">
                          <div className="st-track-icon">
                            {genreConfig.icon}
                          </div>
                          <div className="st-track-text">
                            <div className="st-title">
                              {track.title}
                              <span className="st-badge">FREE</span>
                            </div>
                            <div className="st-artist">{track.artist}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`st-genre-tag tag-${track.genre}`}>
                          {genreConfig.label}
                        </span>
                      </td>
                      <td className="hide-mobile st-meta">{track.frequency || '—'}</td>
                      <td className="hide-mobile st-meta">{track.duration || '—'}</td>
                      <td>
                        <button
                          className={`st-action-btn ${isPlaying ? 'active' : ''}`}
                          onClick={() => handlePlayToggle(track.id)}
                        >
                          {isPlaying ? '⏸' : '▶'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

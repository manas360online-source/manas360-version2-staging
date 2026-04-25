import { useState, useEffect } from 'react';
import './SoundTherapyLandingPage.css';

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

export default function SoundTherapyLandingPage() {
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
    <div className="sound-therapy-page">
      {/* NAV */}
      <nav className="nav">
        <div>
          <span className="nav-brand">MANAS<em>360</em></span>
          <span className="nav-sub">Sound Therapy</span>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-eyebrow">Heal Through Sound</div>
        <h1>Sound <span>Therapy</span></h1>
        <p className="hero-sub">Healing frequencies, Indian classical ragas, nature soundscapes, and sleep audio — curated for mental wellness. Free and accessible to everyone.</p>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="num">{tracks.length}</div>
            <div className="label">Tracks</div>
          </div>
          <div className="hero-stat">
            <div className="num">Free</div>
            <div className="label">Access</div>
          </div>
          <div className="hero-stat">
            <div className="num">24/7</div>
            <div className="label">Available</div>
          </div>
        </div>
        <div className="neuro-row">
          <div className="neuro-pill dopamine">🧬 Dopamine</div>
          <div className="neuro-pill serotonin">🧬 Serotonin</div>
          <div className="neuro-pill oxytocin">🧬 Oxytocin</div>
          <div className="neuro-pill cortisol">🧬 Cortisol ↓</div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filter-bar">
        <button
          className={`filter-chip ${currentFilter === 'all' ? 'active' : ''}`}
          onClick={() => setCurrentFilter('all')}
        >
          All
        </button>
        {Object.entries(GENRE_CONFIG)
          .filter(([key]) => key !== 'all')
          .map(([key, config]) => (
            <button
              key={key}
              className={`filter-chip ${currentFilter === key ? 'active' : ''}`}
              onClick={() => setCurrentFilter(key)}
            >
              {config.icon} {config.label}
            </button>
          ))}
      </div>

      {/* NOW PLAYING */}
      {currentTrack && (
        <div className="now-playing active">
          <div className="np-bars">
            <div className="np-bar"></div>
            <div className="np-bar"></div>
            <div className="np-bar"></div>
            <div className="np-bar"></div>
          </div>
          <div className="np-info">
            <div className="np-title">{currentTrack.title}</div>
            <div className="np-meta">Free access</div>
          </div>
          <button className="np-close" onClick={handleStopTrack}>✕</button>
        </div>
      )}

      {/* PLAYER */}
      {currentTrack && (
        <div className="w-full max-w-4xl mx-auto my-8 overflow-hidden rounded-xl bg-black shadow-lg">
          <div dangerouslySetInnerHTML={{ __html: currentTrack.embedCode }} />
        </div>
      )}

      {/* TRACKS TABLE */}
      <div className="tracks-section">
        <div className="tracks-label">
          Library ({filteredTracks.length})
        </div>
        {loading ? (
          <div className="empty-state">Loading tracks...</div>
        ) : filteredTracks.length === 0 ? (
          <div className="empty-state">No tracks available yet. Check back soon!</div>
        ) : (
          <table className="track-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Track</th>
                <th>Genre</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Play</th>
              </tr>
            </thead>
            <tbody>
              {filteredTracks.map((track, idx) => {
                const isPlaying = currentTrackId === track.id;
                const genreConfig = GENRE_CONFIG[track.genre] || { icon: '🎵', label: track.genre };
                return (
                  <tr key={track.id}>
                    <td className="track-num">{idx + 1}</td>
                    <td>
                      <div className="track-info">
                        <div className="track-thumb">
                          {genreConfig.icon}
                        </div>
                        <div>
                          <div className="track-title">
                            {track.title}
                            <span className="free-badge">FREE</span>
                          </div>
                          <div className="track-artist">{track.artist}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`track-genre genre-${track.genre}`}>
                        {genreConfig.label}
                      </span>
                    </td>
                    <td className="track-freq">{track.frequency || '—'}</td>
                    <td className="track-duration">{track.duration || '—'}</td>
                    <td>
                      <button
                        className={`play-btn ${isPlaying ? 'playing' : ''}`}
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
        )}
      </div>

      {/* FOOTER */}
      <div className="footer">
        <p>
          All tracks are completely free to access.<br />
          <a href="/">manas360.com</a>
        </p>
      </div>
    </div>
  );
}

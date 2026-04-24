import { useState, useEffect } from 'react';
import './SoundTherapyLandingPage.css';

interface Track {
  id: string;
  title: string;
  artist: string;
  genre: 'healing_frequency' | 'indian_classical' | 'nature' | 'sleep';
  freq: string;
  duration: number;
  thumbnail: string;
  video_id: string;
}

const SEED_TRACKS: Track[] = [
  {
    id: 'track-1',
    title: '432 Hz Healing Frequency',
    artist: 'MANAS360',
    genre: 'healing_frequency',
    freq: '432 Hz',
    duration: 600,
    thumbnail: '',
    video_id: '427943407',
  },
  {
    id: 'track-2',
    title: '528 Hz Love Frequency',
    artist: 'MANAS360',
    genre: 'healing_frequency',
    freq: '528 Hz',
    duration: 480,
    thumbnail: '',
    video_id: '332498613',
  },
  {
    id: 'track-3',
    title: 'Raga Yaman for Evening Calm',
    artist: 'Indian Classical',
    genre: 'indian_classical',
    freq: '—',
    duration: 720,
    thumbnail: '',
    video_id: '379438489',
  },
  {
    id: 'track-4',
    title: 'Rain Forest Ambience',
    artist: 'Nature Sounds',
    genre: 'nature',
    freq: '—',
    duration: 900,
    thumbnail: '',
    video_id: '291448067',
  },
  {
    id: 'track-5',
    title: 'Delta Wave Deep Sleep',
    artist: 'Sleep Therapy',
    genre: 'sleep',
    freq: 'Delta',
    duration: 3600,
    thumbnail: '',
    video_id: '316710765',
  },
];

const GENRE_CONFIG = {
  all: { label: 'All', icon: '🎵' },
  healing_frequency: { label: 'Frequencies', icon: '🎵' },
  indian_classical: { label: 'Indian Classical', icon: '🪕' },
  nature: { label: 'Nature', icon: '🌿' },
  sleep: { label: 'Sleep', icon: '🌙' },
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function SoundTherapyLandingPage() {
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [previewSeconds, setPreviewSeconds] = useState(0);
  const [isPlayingTrack, setIsPlayingTrack] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<'all' | Track['genre']>('all');

  const MAX_PREVIEW = 180; // 3 minutes

  useEffect(() => {
    if (!isPlayingTrack) return;

    const timer = setInterval(() => {
      setPreviewSeconds(prev => {
        const next = prev + 1;
        if (next >= MAX_PREVIEW) {
          setIsPlayingTrack(false);
          alert('⏱ 3-minute preview ended.\n\nSubscribe to MANAS360 (₹99/month) for full-length access to all ' + SEED_TRACKS.length + ' tracks.');
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlayingTrack]);

  const filteredTracks = currentFilter === 'all'
    ? SEED_TRACKS
    : SEED_TRACKS.filter(t => t.genre === currentFilter);

  const handlePlayToggle = (trackId: string) => {
    if (currentTrackId === trackId && isPlayingTrack) {
      setIsPlayingTrack(false);
    } else {
      setCurrentTrackId(trackId);
      setPreviewSeconds(0);
      setIsPlayingTrack(true);
    }
  };

  const handleStopTrack = () => {
    setIsPlayingTrack(false);
    setCurrentTrackId(null);
    setPreviewSeconds(0);
  };

  const currentTrack = SEED_TRACKS.find(t => t.id === currentTrackId);

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
        <p className="hero-sub">Healing frequencies, Indian classical ragas, nature soundscapes, and sleep audio — curated for mental wellness. Free 3-minute preview on every track.</p>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="num">{SEED_TRACKS.length}</div>
            <div className="label">Tracks</div>
          </div>
          <div className="hero-stat">
            <div className="num">4</div>
            <div className="label">Genres</div>
          </div>
          <div className="hero-stat">
            <div className="num">3 min</div>
            <div className="label">Free Preview</div>
          </div>
          <div className="hero-stat">
            <div className="num">24/7</div>
            <div className="label">Access</div>
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
              onClick={() => setCurrentFilter(key as Track['genre'])}
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
            <div className="np-meta">Free preview · 3:00 max</div>
          </div>
          <div className="np-timer">{Math.floor(previewSeconds / 60)}:{(previewSeconds % 60).toString().padStart(2, '0')}</div>
          <button className="np-close" onClick={handleStopTrack}>✕</button>
        </div>
      )}

      {/* VIMEO PLAYER */}
      {currentTrack && isPlayingTrack && (
        <div className="vimeo-player">
          <iframe
            src={`https://player.vimeo.com/video/${currentTrack.video_id}?autoplay=1&byline=0&title=0&portrait=0`}
            allow="autoplay"
            allowFullScreen
            title={currentTrack.title}
          ></iframe>
        </div>
      )}

      {/* TRACKS TABLE */}
      <div className="tracks-section">
        <div className="tracks-label">
          Library ({filteredTracks.length})
        </div>
        {filteredTracks.length === 0 ? (
          <div className="empty-state">No tracks in this category yet.</div>
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
                const isPlaying = currentTrackId === track.id && isPlayingTrack;
                const genreConfig = GENRE_CONFIG[track.genre];
                return (
                  <tr key={track.id}>
                    <td className="track-num">{idx + 1}</td>
                    <td>
                      <div className="track-info">
                        <div
                          className="track-thumb"
                          style={track.thumbnail ? { backgroundImage: `url(${track.thumbnail})` } : undefined}
                        >
                          {!track.thumbnail && genreConfig?.icon}
                        </div>
                        <div>
                          <div className="track-title">
                            {track.title}
                            <span className="free-badge">FREE</span>
                          </div>
                          <div className="track-artist">{track.artist}</div>
                          <div className="preview-note">3 min free preview</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`track-genre genre-${track.genre}`}>
                        {genreConfig?.label || track.genre}
                      </span>
                    </td>
                    <td className="track-freq">{track.freq}</td>
                    <td className="track-duration">{formatDuration(track.duration)}</td>
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
          All tracks free to preview (3 min). Full-length with MANAS360 subscription (₹99/month).<br />
          <a href="/admin/sound-therapy">Manage Tracks →</a> · <a href="/">manas360.com</a>
        </p>
      </div>
    </div>
  );
}

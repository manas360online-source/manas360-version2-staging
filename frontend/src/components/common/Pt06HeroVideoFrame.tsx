import type { CSSProperties } from 'react';

type Pt06HeroVideoFrameProps = {
  className?: string;
  style?: CSSProperties;
  title?: string;
};

const VIMEO_SRC = 'https://player.vimeo.com/video/1166597087?autoplay=1&muted=1&controls=1&title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479';

export default function Pt06HeroVideoFrame({
  className,
  style,
  title = 'DragonPitch-DigitalPet',
}: Pt06HeroVideoFrameProps) {
  return (
    <div className={className} style={style}>
      <iframe
        src={VIMEO_SRC}
        title={title}
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

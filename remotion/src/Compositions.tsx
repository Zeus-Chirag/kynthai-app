import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';

export const KynthaiAd: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'Kynthai',
  subtitle = 'Lab tests, delivered to your door',
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const opacity = Math.min(1, frame / 20);
  const slide = Math.min(0, (frame - 20) / 20);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        fontFamily: '-apple-system, Segoe UI, sans-serif',
      }}
    >
      <div style={{ opacity, transform: `translateY(${slide * 40}px)`, textAlign: 'center' }}>
        <h1 style={{ fontSize: width * 0.09, color: '#fff', margin: 0, letterSpacing: 2 }}>
          {title}
        </h1>
        <p style={{ fontSize: width * 0.035, color: '#7dd3fc', marginTop: 12 }}>
          {subtitle}
        </p>
      </div>
    </AbsoluteFill>
  );
};

export const KynthaiLaunchSequence: React.FC = () => {
  return (
    <Sequence from={0} durationInFrames={150}>
      <KynthaiAd />
    </Sequence>
  );
};

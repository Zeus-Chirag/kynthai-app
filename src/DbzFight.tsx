import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";

export const DbzFight: React.FC = () => {
  const frame = useCurrentFrame();
  const bgScale = interpolate(frame, [0, 120], [1, 1.15]);
  const flash = interpolate(frame, [40, 80, 120], [0, 1, 0]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0000", overflow: "hidden" }}>
      <Sequence from={0}>
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,0,0,0.25), transparent 55%),               radial-gradient(circle at 70% 70%, rgba(0,0,255,0.25), transparent 55%),               linear-gradient(180deg, #1a0000 0%, #330000 50%, #0a0000 100%)",
            transform: `scale(${bgScale})`,
          }}
        />
      </Sequence>

      <Sequence from={0}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            fontSize: 180,
            fontWeight: 900,
            color: "#ff0000",
            textShadow: "0 0 25px #ff0000, 0 0 60px #880000",
            letterSpacing: 20,
            opacity: 0.9,
          }}
        >
          VS
        </AbsoluteFill>
      </Sequence>

      <Sequence from={0}>
        <AbsoluteFill
          style={{ backgroundColor: `rgba(255,255,255,${flash * 0.35})`, mixBlendMode: "screen" }}
        />
      </Sequence>

      <Sequence from={0}>
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: 80,
            color: "#ffdd57",
            fontSize: 40,
            textShadow: "0 0 10px #ff8800",
            letterSpacing: 4,
          }}
        >
          SUPER SAIYAN • ULTRA INSTINCT • FINAL CLASH
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

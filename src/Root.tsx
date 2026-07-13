import { Composition } from "remotion";
import { DbzFight } from "./DbzFight";
import "./index.css";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DbzFight"
      component={DbzFight}
      durationInFrames={300}
      fps={60}
      width={1920}
      height={1080}
    />
  );
};

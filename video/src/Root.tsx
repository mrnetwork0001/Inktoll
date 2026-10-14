import React from "react";
import { Composition, Still } from "remotion";
import { Film } from "./Film";
import { Poster } from "./Poster";
import { Flier } from "./Flier";
import timing from "./timing.json";

export const Root: React.FC = () => (
  <>
    <Composition
      id="Inktoll"
      component={Film}
      durationInFrames={timing.totalFrames}
      fps={timing.fps}
      width={1920}
      height={1080}
    />
    <Still id="Poster" component={Poster} width={1920} height={1080} />
    {/* 4:5 for the X feed */}
    <Still id="Flier" component={Flier} width={1600} height={2000} />
  </>
);

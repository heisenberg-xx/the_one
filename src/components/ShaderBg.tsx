// components/ShaderBg.tsx
"use client";

import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";

export default function ShaderBg({ url }: { url: string }) {
  return (
    <ShaderGradientCanvas>
      <ShaderGradient control="query" urlString={url} />
    </ShaderGradientCanvas>
  );
}

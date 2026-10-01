import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les polices du PDF sont lues sur disque à l'exécution : on les embarque
  // explicitement dans la fonction serverless de la route d'export (Vercel).
  outputFileTracingIncludes: {
    "/releases/\\[id\\]/export": ["./src/assets/fonts/**/*"],
  },
};

export default nextConfig;

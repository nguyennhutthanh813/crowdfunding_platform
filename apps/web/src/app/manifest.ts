import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Góp — Gọi vốn cộng đồng cho ý tưởng Việt",
    short_name: "Góp",
    description: "Nền tảng gọi vốn cộng đồng theo cơ chế All-or-Nothing.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f3ec",
    theme_color: "#102a22",
    lang: "vi",
    icons: [
      {
        src: "/brand/gop-mark-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/gop-mark-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/gop-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}

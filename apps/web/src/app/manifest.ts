import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FundViet — Gọi vốn cộng đồng cho ý tưởng Việt",
    short_name: "FundViet",
    description: "Nền tảng gọi vốn cộng đồng theo cơ chế All-or-Nothing.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#16A34A",
    lang: "vi",
    icons: [
      {
        src: "/brand/fundviet-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
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
    ],
  };
}

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Góp — dự án của Võ Phước Thịnh và Nguyễn Nhựt Thanh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const mark = await readFile(join(process.cwd(), "public", "brand", "gop-mark-512.png"));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: "#f4f1e9",
        color: "#10251e",
        padding: 64,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "stretch",
          border: "2px solid rgba(16,37,30,0.14)",
          borderRadius: 36,
          overflow: "hidden",
          background: "#fffefb",
        }}
      >
        <div
          style={{
            width: "64%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 58,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* Ảnh OG đọc PNG đã xuất từ cùng SVG với favicon. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/png;base64,${mark.toString("base64")}`} alt="" width={72} height={72} style={{ flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 34, fontWeight: 800 }}>Góp</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#9c3d2b" }}>
                Võ Phước Thịnh × Nguyễn Nhựt Thanh
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 40,
              maxWidth: 650,
              fontSize: 58,
              lineHeight: 1.08,
              letterSpacing: "-0.045em",
              fontWeight: 800,
            }}
          >
            Góp một phần · Làm nên chuyện
          </div>
          <div style={{ marginTop: 24, maxWidth: 640, fontSize: 24, lineHeight: 1.55, color: "#52645d" }}>
            Dự án Việt có kế hoạch rõ ràng gặp đúng cộng đồng cùng tin và cùng làm.
          </div>
        </div>
        <div
          style={{
            width: "36%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#15392f",
            color: "white",
            padding: 48,
          }}
        >
          <div style={{ fontSize: 18, color: "#d6e79a", fontWeight: 700 }}>
            GỌI VỐN CỘNG ĐỒNG
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {["Ý tưởng rõ ràng", "Cam kết minh bạch", "Cùng đi đến ngày chốt"].map((label, index) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 20 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    background: index === 2 ? "#e96245" : "rgba(255,255,255,0.1)",
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  {index + 1}
                </div>
                {label}
              </div>
            ))}
          </div>
          <div style={{ height: 8, borderRadius: 99, background: "#d6e79a" }} />
        </div>
      </div>
    </div>,
    size,
  );
}

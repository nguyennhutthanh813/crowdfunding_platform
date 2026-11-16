import { ImageResponse } from "next/og";

export const alt = "FundViet — nền tảng gọi vốn cộng đồng cho ý tưởng Việt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: "#f8fafc",
        color: "#0f172a",
        padding: 64,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "stretch",
          border: "2px solid rgba(15,23,42,0.1)",
          borderRadius: 36,
          overflow: "hidden",
          background: "#ffffff",
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
            <div
              style={{
                width: 72,
                height: 72,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
                background: "linear-gradient(135deg,#22c55e,#15803d)",
                color: "white",
                fontSize: 40,
                fontWeight: 800,
              }}
            >
              F
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 34, fontWeight: 800 }}>FundViet</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#15803d" }}>
                Gọi vốn cộng đồng cho ý tưởng Việt
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
            Biến ý tưởng thành hiện thực
          </div>
          <div style={{ marginTop: 24, maxWidth: 640, fontSize: 24, lineHeight: 1.55, color: "#475569" }}>
            Gọi vốn cộng đồng theo cơ chế All-or-Nothing: chỉ thu tiền khi dự án đạt mục tiêu.
          </div>
        </div>
        <div
          style={{
            width: "36%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#0b1f16",
            color: "white",
            padding: 48,
          }}
        >
          <div style={{ fontSize: 18, color: "#86efac", fontWeight: 700 }}>
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
                    background: index === 2 ? "#22c55e" : "rgba(255,255,255,0.1)",
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
          <div style={{ height: 8, borderRadius: 99, background: "#22c55e" }} />
        </div>
      </div>
    </div>,
    size,
  );
}

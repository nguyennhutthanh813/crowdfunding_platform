"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, background: "#f4f1e9", color: "#10251e", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 560, textAlign: "center" }}>
            <div style={{ margin: "0 auto", width: 64, height: 64, display: "grid", placeItems: "center", borderRadius: 20, background: "#d6e79a", fontSize: 30, fontWeight: 800 }}>
              g
            </div>
            <h1 style={{ margin: "28px 0 0", fontSize: 36, lineHeight: 1.15 }}>
              Góp đang gặp lỗi khi mở trang.
            </h1>
            <p style={{ margin: "16px auto 0", maxWidth: 500, lineHeight: 1.7, color: "#52645d" }}>
              Bạn thử tải lại một lần. Nếu vẫn chưa được, hãy quay lại sau ít phút; dữ liệu thật sẽ không bị thay đổi chỉ vì trang lỗi.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ marginTop: 28, minHeight: 44, border: 0, borderRadius: 12, padding: "11px 22px", background: "#15392f", color: "white", fontWeight: 700, cursor: "pointer" }}
            >
              Thử tải lại
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

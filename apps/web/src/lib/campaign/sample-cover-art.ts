// Ảnh mẫu đi cùng bản nháp Bếp Mây; chỉ lưu mã ngắn trong cookie/SQLite.
export const sampleCoverArt = {
  id: "bep-may-v1",
  src: "/images/campaigns/bep-may-minh-hoa-v1.webp",
  alt: "Ảnh minh họa bộ lọc nước gắn vòi trong một căn bếp nhỏ",
  note: "Ảnh minh họa · bản demo",
} as const;

export function getSampleCoverArt(id?: string) {
  return id === sampleCoverArt.id ? sampleCoverArt : null;
}

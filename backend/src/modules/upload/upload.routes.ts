import { Router } from "express";
import multer from "multer";
import { humanizeError } from "../../db/helpers.js";
import { requireAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { uploadImageBuffer } from "../../services/cloudinary.js";

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
});

uploadRouter.post("/image", requireAuthMiddleware, upload.single("file"), async (req, res) => {
  try {
    const folder = String(req.body?.folder ?? "uploads").replace(/[^a-zA-Z0-9/_-]/g, "");

    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) {
        res.status(400).json({ ok: false, error: "Chỉ hỗ trợ định dạng tệp hình ảnh (JPG, PNG, WebP, GIF)." });
        return;
      }
      const result = await uploadImageBuffer(req.file.buffer, req.file.mimetype, { folder });
      res.json({ ok: true, ...result });
      return;
    }

    // Hỗ trợ upload dạng JSON base64 dataUrl
    const dataUrl = String(req.body?.dataUrl ?? "");
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ ok: false, error: "Không tìm thấy dữ liệu tệp ảnh tải lên." });
      return;
    }
    const mimeType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    const result = await uploadImageBuffer(buffer, mimeType, { folder });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ ok: false, error: humanizeError(e) });
  }
});

import { Router } from "express";
import { getDb } from "../../db/index.js";
import { DomainError, humanizeError } from "../../db/helpers.js";
import { requireAuthMiddleware } from "../../middlewares/auth.middleware.js";
import {
  createVnpayOrder,
  getVnpayOrderDetail,
  processVnpayPayment,
  verifyVnpayReturn,
  VNPAY_BANKS,
} from "../../services/vnpay.js";
import { boolVal, intVal, strVal } from "../../utils-shared.js";

export const vnpayRouter = Router();

vnpayRouter.get("/banks", (_req, res) => {
  res.json({ ok: true, banks: VNPAY_BANKS });
});

vnpayRouter.post("/create-order", requireAuthMiddleware, async (req, res) => {
  try {
    const bodyIn = (req.body ?? {}) as Record<string, unknown>;
    const retryPledgeId = strVal(bodyIn, "retryPledgeId");
    const bankCode = strVal(bodyIn, "bankCode") || "NCB";
    const payChannelRaw = strVal(bodyIn, "payChannel").toUpperCase();
    const payChannel =
      payChannelRaw === "VNPAYQR" || payChannelRaw === "INTCARD" || payChannelRaw === "VNBANK"
        ? payChannelRaw
        : undefined;

    const forwarded = typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"].split(",")[0] : null;
    const ipAddress = forwarded?.trim() || req.ip || "127.0.0.1";

    if (retryPledgeId) {
      const out = await createVnpayOrder(getDb(), req.viewer!.id, {
        projectId: "",
        tierId: null,
        bonusAmount: 0,
        addOns: [],
        retryPledgeId,
        bankCode,
        payChannel,
        ipAddress,
      });
      res.status(201).json({ ok: true, ...out });
      return;
    }

    const projectId = strVal(bodyIn, "projectId");
    const rawTier = strVal(bodyIn, "tierId");
    const tierId = !rawTier || rawTier === "none" ? null : rawTier;
    const bonusAmount = Math.max(0, intVal(bodyIn, "bonusAmount", 0));

    let addOns: { id: string; quantity: number }[] = [];
    const rawAddOns = bodyIn.addOns;
    if (Array.isArray(rawAddOns)) {
      addOns = rawAddOns
        .filter((x): x is { id: string; quantity: number } => Boolean(x && typeof (x as { id?: unknown }).id === "string"))
        .map((x) => ({ id: x.id, quantity: Math.max(0, Math.round(Number(x.quantity) || 0)) }))
        .filter((x) => x.quantity > 0);
    } else if (typeof rawAddOns === "string" && rawAddOns.trim()) {
      const parsed = JSON.parse(rawAddOns) as unknown;
      if (Array.isArray(parsed)) {
        addOns = parsed
          .filter((x): x is { id: string; quantity: number } => Boolean(x && typeof x.id === "string"))
          .map((x) => ({ id: x.id, quantity: Math.max(0, Math.round(Number(x.quantity) || 0)) }))
          .filter((x) => x.quantity > 0);
      }
    }

    const addressMode = strVal(bodyIn, "addressMode") || "saved";
    const addressId = addressMode === "saved" ? strVal(bodyIn, "addressId") || null : null;
    const newAddress =
      addressMode === "new" && strVal(bodyIn, "recipientName")
        ? {
            recipientName: strVal(bodyIn, "recipientName"),
            phone: strVal(bodyIn, "phone"),
            line1: strVal(bodyIn, "line1"),
            ward: strVal(bodyIn, "ward"),
            district: strVal(bodyIn, "district"),
            province: strVal(bodyIn, "province"),
          }
        : null;

    const out = await createVnpayOrder(getDb(), req.viewer!.id, {
      projectId,
      tierId,
      bonusAmount,
      addOns,
      addressId,
      newAddress,
      anonymous: boolVal(bodyIn, "anonymous"),
      note: strVal(bodyIn, "note"),
      replaceExisting: boolVal(bodyIn, "replaceExisting"),
      bankCode,
      payChannel,
      ipAddress,
    });
    res.status(201).json({ ok: true, ...out });
  } catch (e) {
    const status = e instanceof DomainError && e.code === "FORBIDDEN" ? 403 : 400;
    res.status(status).json({ ok: false, error: humanizeError(e) });
  }
});

vnpayRouter.get("/orders/:txnRef", async (req, res) => {
  try {
    const queryMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === "string") queryMap[k] = v;
    }
    const detail = await getVnpayOrderDetail(
      getDb(),
      String(req.params.txnRef),
      queryMap,
      typeof req.query.token === "string" ? req.query.token : undefined,
    );
    res.json({ ok: true, ...detail });
  } catch (e) {
    res.status(400).json({ ok: false, error: humanizeError(e) });
  }
});

vnpayRouter.post("/process", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const payChannelRaw = strVal(body, "payChannel").toUpperCase();
    const result = await processVnpayPayment(getDb(), req.viewer?.id ?? null, {
      txnRef: strVal(body, "txnRef"),
      orderToken: strVal(body, "orderToken") || undefined,
      payChannel:
        payChannelRaw === "VNPAYQR" || payChannelRaw === "INTCARD" || payChannelRaw === "VNBANK"
          ? payChannelRaw
          : undefined,
      bankCode: strVal(body, "bankCode") || undefined,
      cardNumber: strVal(body, "cardNumber") || undefined,
      cardHolder: strVal(body, "cardHolder") || undefined,
      issueDate: strVal(body, "issueDate") || undefined,
      otp: strVal(body, "otp") || undefined,
      simulateCode: strVal(body, "simulateCode") || undefined,
    });
    res.json(result);
  } catch (e) {
    res.status(400).json({ ok: false, error: humanizeError(e) });
  }
});

vnpayRouter.get("/verify-return", async (req, res) => {
  try {
    const queryMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === "string") queryMap[k] = v;
    }
    const verified = await verifyVnpayReturn(getDb(), queryMap);
    res.json({ ok: true, ...verified });
  } catch (e) {
    res.status(400).json({ ok: false, error: humanizeError(e) });
  }
});

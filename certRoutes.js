import express from "express";
import Certificate from "./certificate.js";
import { createCertificatePDF } from "./certificateService.js";
import { sendCertificateEmail } from "./email.js";
import path from "path";
import fs from "fs";

const router = express.Router();

// Middleware: simple admin auth via Bearer token (ADMIN_TOKEN)
function adminAuth(req, res, next) {
  const auth = req.headers["authorization"];
  if (!auth) return res.status(401).json({ message: "Missing Authorization header" });
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer" || parts[1] !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

/**
 * POST /api/certificates/generate
 * body: { userName, userEmail, resourceName, issuer, autoEmail (true|false) }
 */
router.post("/generate", async (req, res) => {
  try {
    const { userName, userEmail, resourceName, issuer, autoEmail } = req.body;
    if (!userName || !userEmail || !resourceName) {
      return res.status(400).json({ message: "userName, userEmail and resourceName required" });
    }

    // Create PDF
    const { pdfPath, certificateId, verificationHash, issuedAt } = await createCertificatePDF({
      userName,
      userEmail,
      resourceName,
      issuer
    });

    // Save metadata to DB
    const cert = new Certificate({
      certificateId,
      userName,
      userEmail,
      resourceName,
      pdfPath,
      verificationHash,
      issuer,
      issuedAt
    });
    await cert.save();

    // Optionally email the cert
    if (autoEmail) {
      // attachment full path
      const fullPath = path.join(process.cwd(), pdfPath.replace(/^\//, ""));
      await sendCertificateEmail({
        to: userEmail,
        subject: `Your certificate for ${resourceName}`,
        text: `Hello ${userName},\n\nAttached is your certificate for ${resourceName}.`,
        html: `<p>Hello ${userName},</p><p>Attached is your certificate for <b>${resourceName}</b>.</p>`,
        attachmentPath: fullPath,
        attachmentName: `${certificateId}.pdf`
      });
    }

    res.json({ message: "Certificate generated", certificateId, pdfPath, verificationHash });
  } catch (err) {
    console.error("Error generating certificate:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * GET /api/certificates/:id
 * Get certificate metadata (admin)
 */
router.get("/:id", adminAuth, async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certificateId: req.params.id });
    if (!cert) return res.status(404).json({ message: "Not found" });
    res.json(cert);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/certificates (admin) - list all
 * Accepts optional ?page=&limit=
 */
router.get("/", adminAuth, async (req, res) => {
  try {
    const page = Math.max(0, Number(req.query.page || 0));
    const limit = Math.max(1, Number(req.query.limit || 50));
    const certs = await Certificate.find()
      .sort({ issuedAt: -1 })
      .skip(page * limit)
      .limit(limit)
      .lean();
    res.json({ page, limit, results: certs });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/certificates/verify/:hash
 * Public verification endpoint used by QR code
 */
router.get("/verify/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const cert = await Certificate.findOne({ verificationHash: hash }).lean();
    if (!cert) return res.status(404).json({ valid: false, message: "Certificate not found or invalid" });
    res.json({
      valid: true,
      certificateId: cert.certificateId,
      userName: cert.userName,
      resourceName: cert.resourceName,
      issuer: cert.issuer,
      issuedAt: cert.issuedAt,
      pdfPath: cert.pdfPath
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/certificates/:id (admin) - deletes certificate and PDF
 */
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const cert = await Certificate.findOneAndDelete({ certificateId: req.params.id });
    if (!cert) return res.status(404).json({ message: "Not found" });
    // delete file
    const fullPath = path.join(process.cwd(), cert.pdfPath.replace(/^\//, ""));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

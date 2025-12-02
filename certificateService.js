import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import crypto from "crypto";

const certsDir = process.env.CERTS_DIR || "./certificates";
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

function generateCertificateId() {
  return "CERT-" + nanoid(8).toUpperCase();
}

function generateVerificationHash(certificateId, userEmail) {
  return crypto
    .createHash("sha256")
    .update(`${certificateId}:${userEmail}:${Date.now()}`)
    .digest("hex");
}

export async function createCertificatePDF(data) {
  const certificateId = generateCertificateId();
  const verificationHash = generateVerificationHash(
    certificateId,
    data.userEmail
  );
  const fileName = `${certificateId}.pdf`;
  const pdfPath = path.join(certsDir, fileName);

  const baseUrl = process.env.BASE_URL || "http://localhost:5000";
  const verifyUrl = `${baseUrl}/verify.html?hash=${verificationHash}`;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: "H",
    margin: 1,
  });

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const gold = "#d4af37";
    const darkBlue = "#1d3b8b";
    const gray = "#6f6f6f";
    const mid = doc.page.width / 2;

    // ===== WATERMARK =====
    try {
      const watermarkPath = "./watermarke.png";
      if (fs.existsSync(watermarkPath)) {
        doc.save();
        doc.opacity(0.12);
        doc.image(watermarkPath, mid - 150, 180, { fit: [300, 300] });
        doc.restore();
      }
    } catch (err) {}

    // ===== BORDERS =====
    doc
      .lineWidth(3)
      .strokeColor(gold)
      .roundedRect(25, 25, doc.page.width - 50, doc.page.height - 50, 15)
      .stroke();

    doc
      .lineWidth(1.5)
      .strokeColor("#aaaaaa")
      .roundedRect(45, 45, doc.page.width - 90, doc.page.height - 90, 10)
      .stroke();

    // ===== TITLE =====
    doc.fillColor(gold).font("Helvetica-Bold").fontSize(18).text("CERTIFICATE", {
      align: "center",
    });

    doc.moveDown(0.2);
    doc
      .fillColor(darkBlue)
      .font("Helvetica-Bold")
      .fontSize(32)
      .text("OF ACHIEVEMENT", { align: "center" });

    doc.moveDown(1);

    // Separator line
    doc
      .strokeColor(gold)
      .lineWidth(1.5)
      .moveTo(mid - 130, doc.y)
      .lineTo(mid + 130, doc.y)
      .stroke();

    doc.moveDown(1.8);

    // ===== SUBTITLE =====
    doc.fillColor(gray).fontSize(13).text("THIS IS TO CERTIFY THAT", {
      align: "center",
    });

    doc.moveDown(1);

    // ===== NAME =====
    doc
      .fillColor("#000")
      .font("Helvetica-Bold")
      .fontSize(28)
      .text(data.userName, { align: "center" });

    doc.moveDown(0.6);

    // Underline
    doc
      .strokeColor(gold)
      .lineWidth(1)
      .moveTo(mid - 160, doc.y)
      .lineTo(mid + 160, doc.y)
      .stroke();

    doc.moveDown(1.4);

    // ========== ACHIEVEMENT PARAGRAPH ==========
    const paragraph =
      `${data.userName} has successfully completed the requirements for the course "` +
      `${data.resourceName}" demonstrating dedication and proficiency. ` +
      `This certificate is issued as official recognition of the achievement.`;

    doc.fillColor(gray).font("Helvetica").fontSize(13).text(paragraph, {
      align: "center",
      lineGap: 4,
      width: 400,
      align: "center",
    });

    doc.moveDown(2);

    // ===== Course Name (bold) =====
    doc
      .fillColor(darkBlue)
      .font("Helvetica-Bold")
      .fontSize(22)
      .text(data.resourceName, { align: "center" });

    doc.moveDown(2.2);

    // Divider line
    doc
      .strokeColor("#dddddd")
      .lineWidth(1)
      .moveTo(90, doc.y)
      .lineTo(doc.page.width - 90, doc.y)
      .stroke();

    doc.moveDown(1.8);

    // ===== DATE, EMAIL, ISSUER =====
    const dateStr = new Date().toLocaleDateString();

    doc.fillColor(gray).fontSize(11);
    doc.text("DATE", 70, doc.y, { width: 150, align: "center" });
    doc.text("EMAIL", mid - 75, doc.y, { width: 150, align: "center" });
    doc.text("ISSUED BY", doc.page.width - 220, doc.y, {
      width: 150,
      align: "center",
    });

    doc.moveDown(0.8);

    doc.fillColor("#000").fontSize(12);
    const valY = doc.y;

    doc.text(dateStr, 70, valY, { width: 150, align: "center" });
    doc.text(data.userEmail, mid - 75, valY, { width: 150, align: "center" });
    doc.text(data.issuer || "Organization", doc.page.width - 220, valY, {
      width: 150,
      align: "center",
    });

    doc.moveDown(3.5);

    // ===== SIGNATURE AREA (UPDATED) =====

    // Insert signature image above the signature line
    try {
      const signaturePath = "#"; // signature file

      if (fs.existsSync(signaturePath)) {
        doc.image(signaturePath, mid - 60, doc.y, {
          fit: [120, 90], // realistic signature size
          align: "center",
        });

        doc.moveDown(1.2);
      }
    } catch (err) {
      console.error("Signature error:", err);
    }

    // Draw signature line
    doc
      .strokeColor(gold)
      .lineWidth(1)
      .moveTo(mid - 120, doc.y)
      .lineTo(mid + 120, doc.y)
      .stroke();

    doc.moveDown(0.3);

    doc.fontSize(12).fillColor("#000").text("Authorized Signature", mid - 120, doc.y, {
      width: 240,
      align: "center",
    });

    doc.moveDown(3);

    // ===== QR CODE =====
    const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
    doc.image(qrBuffer, mid - 45, doc.y, { fit: [90, 90] });

    doc.moveDown(6);

    // ===== FOOTER =====
    doc.fillColor(gray).fontSize(10).text(`Certificate ID: ${certificateId}`, {
      align: "center",
    });

    doc.moveDown(0.2);

    doc.fillColor(darkBlue).text(`Verify: ${verifyUrl}`, { align: "center" });

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return {
    pdfPath: `/certificates/${fileName}`,
    certificateId,
    verificationHash,
    verifyUrl,
    issuedAt: new Date(),
  };
}

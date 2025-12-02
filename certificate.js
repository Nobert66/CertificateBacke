import mongoose from "mongoose";

const CertificateSchema = new mongoose.Schema({
  certificateId: { type: String, required: true, unique: true }, // e.g., ABC-123
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  resourceName: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  pdfPath: { type: String, required: true }, // relative URL to download
  verificationHash: { type: String, required: true, unique: true },
  issuer: { type: String }, // seller/instructor name
  extra: { type: mongoose.Schema.Types.Mixed }
});

export default mongoose.model("Certificate", CertificateSchema);

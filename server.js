import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";


dotenv.config();
import certRoutes from "./certRoutes.js";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static folder to serve certificates
app.use("/certificates", express.static(path.resolve(process.cwd(), process.env.CERTS_DIR || "./certificates")));
// Serve admin and verification frontend
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/certificates", certRoutes);

// Basic root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

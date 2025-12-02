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

// Static folder to serve certificates (Keep this)
app.use("/certificates", express.static(path.resolve(process.cwd(), process.env.CERTS_DIR || "./certificates")));

app.use("/api/certificates", certRoutes);

app.get("/", (req, res) => {
    res.send("Certificate Backend API is running.");
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

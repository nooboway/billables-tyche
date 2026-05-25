import { Router } from "express";
import {
  listDocuments, getDocument, createDocument, updateDocument,
  updateDocumentStatus, deleteDocument, getDocumentPdf,
} from "../controllers/document.controller";

const router = Router();
router.get("/", listDocuments);
router.get("/:id", getDocument);
router.post("/", createDocument);
router.put("/:id", updateDocument);
router.patch("/:id/status", updateDocumentStatus);
router.delete("/:id", deleteDocument);
router.get("/:id/pdf", getDocumentPdf);
export default router;

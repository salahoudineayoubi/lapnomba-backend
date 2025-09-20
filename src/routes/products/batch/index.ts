import { Router, Request, Response } from "express";
import { ProductModel } from "../../../models/product";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Aucun ID fourni" });
  }
  try {
    const products = await ProductModel.find({ _id: { $in: ids } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

export default router;
import express, { Request, Response } from "express";
import { DB } from "../db";
import { Product } from "../models/product";
import { parseQuery } from "../middlewares/parseQuery";
import { ProductController } from "../controllers/product-controller";
import multer from "multer";
import * as mime from "mime-types";
import path from "path";
import sharp from "sharp";
import { Code } from "../controllers/controller";
import { MulterUploader } from "../middlewares/imageUpload";

export function ProductRouter(db: DB) {
  const router = express.Router();
  const model = new Product(db);
  const controller = new ProductController(model, db);

  // grocery api
  router.get("/:id", (req, res) => {
    controller.gv1_get(req, res);
  });
  router.get("/G/", (req, res) => {
    controller.gv1_list(req, res);
  });
  router.put("/", (req, res) => {
    model.update(req, res);
  });
  router.patch("/", (req, res) => {
    model.update(req, res);
  });
  // admin api
  router.put("/batchPrice", async (req, res) => {
    await controller.batchPrice(req, res);
  });
  router.post("/imageUpload", MulterUploader.single("upload"), (req, res) => {
    controller.uploadImage(req, res);
  });

  router.put("/toggle-feature", (req, res) =>
    controller.toggleFeature(req, res)
  );
  router.put("/toggle-status", (req, res) => controller.toggleStatus(req, res));
  router.post("/:id", (req, res) => {
    controller.save(req, res);
  });

  // api/admin/products?query={where:xxx,options:{"limit":10,"skip":0,"sort":[["_id",1]]}}
  router.get("/", [parseQuery], async (req: Request, res: Response) => {
    await controller.list(req, res);
  });
  router.get("/delivery/:id", async (req: Request, res: Response) => {
    await controller.delivery(req, res);
  });
  router.get("/:id", async (req, res) => {
    await controller.get(req, res);
  });
  router.delete("/:id", async (req, res) => await controller.delete(req, res));

  // old api

  router.get("/qFind", (req, res) => {
    model.quickFind(req, res);
  });
  router.get("/categorize", (req, res) => {
    model.categorize(req, res);
  });

  return router;
}

import express, { Request, Response } from "express";
import { DB } from "../db";
import { Product } from "../models/product";
import { parseQuery } from "../middlewares/parseQuery";
import { StockController } from "../controllers/stock-controller";
export function StockRouter(db: DB) {
  const router = express.Router();
  const model = new Product(db);
  const controller = new StockController(model, db);
  // admin api
  router.get("/", [parseQuery], (req: Request, res: Response) => { controller.list(req, res) } );
  router.post("/toggleStockEnabled/:id", (req: Request, res: Response) => { controller.toggleStockEnabled(req, res) });
  router.post("/toggleAllowNegative/:id", (req: Request, res: Response) => { controller.toggleAllowNegative(req, res) });
  router.post("/setQuantity/:id", (req: Request, res: Response) => { controller.setQuantity(req, res) });
  return router;
}
import express, { Request, Response } from "express";
import { DB } from "../db";
import { Product } from "../models/product";
import { parseQuery } from "../middlewares/parseQuery";
import { ProductController } from "../controllers/product-controller";

export function ProductRouter(db: DB) {
  const router = express.Router();
  const model = new Product(db);
  const controller = new ProductController(model, db);

  // grocery api
  router.get('/:id', (req, res) => { controller.gv1_get(req, res); });
  router.get('/G/', (req, res) => { controller.gv1_list(req, res); });
  router.put('/',(req,res) => {model.update(req, res);});
  router.patch('/',(req,res) => {model.update(req, res);});
  // admin api

  // api/admin/products?query={where:xxx,options:{"limit":10,"skip":0,"sort":[["_id",1]]}}
  router.get('/', [parseQuery], (req: Request, res: Response) => { controller.list(req, res) });
  router.get('/:id', (req, res) => { controller.get(req, res); });

  // old api

  router.get('/qFind', (req, res) => { model.quickFind(req, res); });
  router.get('/clearImage', (req, res) => { model.clearImage(req, res); });
  router.get('/categorize', (req, res) => { model.categorize(req, res); });
  router.post('/', (req, res) => { model.create(req, res); });
  // router.put('/', (req, res) => { model.replace(req, res); });
  // router.patch('/', (req, res) => { model.update(req, res); });
  router.delete('/', (req, res) => { model.remove(req, res); });

  return router;
};

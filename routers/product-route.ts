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
import { upload } from "../middlewares/imageUpload";

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
  router.post('/imageUpload',upload.single("upload"), async (req, res) => {

    const productId = req.query.productId;
    const product = await model.findOne({ _id: productId });

    const baseUrl = "https://duocun.com.cn/media";
    const urls: any = {
      // @ts-ignore
      default: `${baseUrl}/${req.fileInfo.filename}`
    };
    for (const width of [480, 720, 960, 1200]) {
      // @ts-ignore
      const newFilename = `${req.fileInfo.name}_${width}.${req.fileInfo.extension}`;
      // @ts-ignore
      await sharp(`uploads/${req.fileInfo.filename}`).resize(width).toFile(`uploads/${newFilename}`);
      urls[`${width}`] = `${baseUrl}/${newFilename}`;
    }

    const picture = {
      // @ts-ignore
      name: req.fileInfo.filename,
      // @ts-ignore
      url: req.fileInfo.filename
    };

    if (product) {
      if (!product.pictures) {
        product.pictures = [];
      }
  
      product.pictures.push(picture);
  
      try {
        await model.updateOne({ _id: product._id }, product);
      } catch (e) {
        console.error(e);
        return res.json({
          code: Code.FAIL
        });
      }
    }

    return res.json({
      code: Code.SUCCESS,
      data: picture
    });

  });
  router.post('/:id', (req, res) => { controller.save(req, res); });
  router.put('/:id',(req,res) => {controller.updateOne(req, res);});

  // api/admin/products?query={where:xxx,options:{"limit":10,"skip":0,"sort":[["_id",1]]}}
  router.get('/', [parseQuery], async (req: Request, res: Response) => { await controller.list(req, res) });
  router.get('/delivery/:id', async (req: Request, res: Response) => { await controller.delivery(req, res) });
  router.get('/:id', async (req, res) => { await controller.get(req, res); });
  // old api

  router.get('/qFind', (req, res) => { model.quickFind(req, res); });
  router.get('/categorize', (req, res) => { model.categorize(req, res); });
  router.post('/', (req, res) => { model.create(req, res); });

  router.delete('/', (req, res) => { model.remove(req, res); });

  return router;
};

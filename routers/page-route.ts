import express, {Request, Response} from "express";
import { DB } from "../db";
import { Page } from "../models/page";
import { PageController } from "../controllers/page-controller";
import multer from "multer";
import * as mime from "mime-types";
import path from "path";
import sharp from "sharp";
import { upload } from "../middlewares/imageUpload";

export function PageRouter(db: DB) {
  const router = express.Router();
  const model = new Page(db);
  const controller = new PageController(model, db);

  router.get('/', (req, res) => { controller.list(req, res); });
  router.get('/:id', (req, res) => { controller.get(req, res);});
  router.post('/imageUpload',upload.single("upload"), async (req, res) => {
    const baseUrl = "https://duocun.com.cn/media";
    const urls: any = {
      // @ts-ignore
      default: `${baseUrl}/${req.fileInfo.filename}`
    };
    for (const width of [480, 720, 960, 1200]) {
      // @ts-ignore
      const newFilename = `${ req.fileInfo.name}_${width}.${req.fileInfo.extension}`;
      // @ts-ignore
      await sharp(`uploads/${req.fileInfo.filename}`).resize(width).toFile(`uploads/${newFilename}`);
      urls[`${width}`] = `${baseUrl}/${newFilename}`;
    }
    res.status(201);
    res.json({
      urls
    });
  });
  router.post('/new', (req, res) => { controller.create(req, res); });
  router.put('/:id', (req, res) => { controller.update(req, res); });
  router.delete('/:id', (req, res) => { controller.delete(req, res); });
  
  return router;
}
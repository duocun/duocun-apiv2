import express, {Request, Response} from "express";
import { DB } from "../db";
import { Page } from "../models/page";
import { PageController } from "../controllers/page-controller";
import multer from "multer";
import * as mime from "mime-types";
import path from "path";
import sharp from "sharp";
import { MulterUploader } from "../middlewares/imageUpload";
import { Picture } from "../models/picture";
import { Config } from "../config";

export function PageRouter(db: DB) {
  const router = express.Router();
  const model = new Page(db);
  const controller = new PageController(model, db);
  
  router.get('/', (req, res) => { controller.list(req, res); });
  router.get('/:id', (req, res) => { controller.get(req, res);});
  router.post('/imageUpload', MulterUploader.single("upload"), async (req, res) => {
    const cfg = new Config();
    const baseUrl = "https://duocun.com.cn/media";
    const urls: any = {
      // @ts-ignore
      default: `${baseUrl}/${req.fileInfo.filename}`
    };

    const pictureModel = new Picture(db);
    // @ts-ignore
    const defaultFilename =`${req.fileInfo.filename}`;
    const defaultPath = `${cfg.MEDIA.TEMP_PATH}/${defaultFilename}`;
    await pictureModel.uploadToAws(defaultFilename, defaultPath);

    for (const width of [480, 720, 960]) {
      // @ts-ignore
      const newFilename = `${ req.fileInfo.name}_${width}.${req.fileInfo.extension}`;
      const fpath = `${cfg.MEDIA.TEMP_PATH}/${newFilename}`;
      // @ts-ignore
      await sharp(`uploads/${req.fileInfo.filename}`).resize(width).toFile(`uploads/${newFilename}`);
      urls[`${width}`] = `${baseUrl}/${newFilename}`;

      await pictureModel.uploadToAws(newFilename, fpath);
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
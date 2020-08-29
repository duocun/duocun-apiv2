import multer from "multer";
import * as mime from "mime-types";
import path from "path";
import sharp from "sharp";
import { Config } from "../config";


export const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const cfg = new Config();
    cb(null, `${cfg.MEDIA_FOLDER}/`);
  },
  filename: function (req: any, file, cb) {
    const name = Math.random().toString(36).substring(2) + "_" + Date.now();
    const extension = mime.extension(file.mimetype);
    const filename = `${name}.${extension}`;
    req.fileInfo = {
      filename,
      name,
      extension
    }
    cb(null, filename);
  },
});
export const MulterUploader = multer({ storage: storage });
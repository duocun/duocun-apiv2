import express, {Request, Response} from "express";
import { DB } from "../db";
import multer from "multer";
import { Picture } from "../models/picture";
import { Config } from "../config";

const cfg = new Config();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `${cfg.MEDIA_FOLDER}/`);
    },
    filename: function (req: any, file, cb) {
        cb(null, req.body.fname + "." + req.body.ext);
    },
});

const uploader = multer({ storage: storage });

  
export function FileRouter(){
  const router = express.Router();

    async function upload(req: Request, res: Response) {
        const defaultFilename = `${req.body.fname}.${req.body.ext}`;
        const projectPath = process.cwd();
        const srcPath = `${projectPath}/${cfg.MEDIA_FOLDER}/${defaultFilename}`;
        await Picture.uploadToAws(defaultFilename, srcPath);
        return;
    }

    router.post('/upload', uploader.single("file"), upload);

    return router;
}
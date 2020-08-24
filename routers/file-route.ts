import express, {Request, Response} from "express";
import { DB } from "../db";
import multer from "multer";
import { Picture } from "../models/picture";

const MEDIA_PATH="uploads"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `${MEDIA_PATH}/`);
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
        const srcPath = `${projectPath}/${MEDIA_PATH}/${defaultFilename}`;
        await Picture.uploadToAws(defaultFilename, srcPath);
        return;
    }

    router.post('/upload', uploader.single("file"), upload);

    return router;
}
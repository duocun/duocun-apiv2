import multer from "multer";
import * as mime from "mime-types";
import path from "path";
import sharp from "sharp";
export const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req: any, file, cb) {
    const name = path.parse(file.originalname).name + "_" + Date.now();
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
export const upload = multer({ storage: storage });
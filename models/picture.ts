import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { Model } from "./model";
import { DB } from "../db";
import { Config } from "../config";
import AWS from 'aws-sdk';

export const Picture = {
  // constructor(dbo: DB) {
  //   super(dbo, 'products');
  // }


  // get(req: Request, res: Response){
  //   const id = req.params.id;
  //   const dir = path.join(__dirname, '../uploads');
  //   fs.readdir(dir, (err, fnames) => {
  //     res.send(JSON.stringify(fnames, null, 3));
  //   });
  // }

  // fname --- name with extension
  uploadToAws(fname: string, fpath: string) {
    const cfg = new Config();
    const s3 = new AWS.S3({
      accessKeyId: cfg.AWS_S3.ACCESS_ID,
      secretAccessKey: cfg.AWS_S3.ACCESS_KEY
    });

    const fileContent = fs.readFileSync(fpath);

    // Setting up S3 upload parameters
    const params = {
        Bucket: cfg.AWS_S3.BUCKET_NAME,
        Key: `media/${fname}`, // File name you want to save as in S3
        Body: fileContent,
        ACL: 'public-read'
    };

    return new Promise((resolve, reject) => {
      s3.upload(params, (err: any, data: any) => {
        if (err) {
          // throw err;
          resolve();
        }else{
          resolve();
        }
        console.log(`File uploaded to AWS S3 successfully. ${data.Location}`);
      });
    });
  }
}
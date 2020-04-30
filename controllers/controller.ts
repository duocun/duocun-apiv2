import {Request, Response} from "express";
import { Model } from "../models/model";
import { DB } from "../db";

import path from 'path';
import { getLogger } from '../lib/logger'
const logger = getLogger(path.basename(__filename));

export const Code = {
  SUCCESS: 'success',
  FAIL: 'fail'
}

export class Controller {
  public model: Model;
  public db: DB;
  constructor(model: any, db: DB) {
    this.model = model;
    this.db = db;
  }

  async list(req: Request, res: Response):Promise<void> { 
    const where: any = req.query.where;
    const options: any = req.query.options;
    res.setHeader('Content-Type', 'application/json'); 
    let data:any[] = [];
    let count:number = 0;
    let code = Code.FAIL;
    try {
      if(where){ 
        // TODO: no where will return error, is it a good choice?
        const r = await this.model.find_v2(where, options)
        data = r.data;
        count = r.count;
      } 
    } catch (error) {
      logger.error(`list error: ${error}`);
    } finally {
      res.send(JSON.stringify({
        code: code,
        data: data,
        count: count 
      }));
    }
  }

  get(req: Request, res: Response) {
    const id = req.params.id;
    this.model.getById(id).then(data => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: data ? Code.SUCCESS : Code.FAIL,
        data: data 
      }));
    });
  }

}
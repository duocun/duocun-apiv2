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
    let data:any[] = [];
    let count:number = 0;
    let code = Code.FAIL;
    try {
      if(where){ 
        // TODO: no where will return error, is it a good choice?
        const r = await this.model.find_v2(where, options)
        code = Code.SUCCESS;
        data = r.data;
        count = r.count;
      } 
    } catch (error) {
      logger.error(`list error: ${error}`);
    } finally {
      res.setHeader('Content-Type', 'application/json'); 
      res.send({
        code: code,
        data: data,
        count: count 
      });
    }
  }

  async get(req: Request, res: Response):Promise<void>  {
    const id = req.params.id;
    let data:any = {};
    let code = Code.FAIL;
    const options: any = ( req.query && req.query.options ) || {};

    try {
      data = await this.model.getById(id, options);
      code = Code.SUCCESS;
    } catch (error) {
      logger.error(`get error : ${error}`);
    } finally {
      res.setHeader('Content-Type', 'application/json');
      res.send({
        code: code,
        data: data 
      });
    }
  }
}
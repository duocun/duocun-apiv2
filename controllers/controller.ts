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
        // console.log(`query: ${where}`);
        // TODO: no where will return error, is it a good choice?
        const r = await this.model.find_v2(where, options)
        code = Code.SUCCESS;
        data = r.data;
        count = r.count;
      } else{
        const r = await this.model.find_v2({}, options)
        code = Code.SUCCESS;
        data = r.data;
        count = r.count;
      }
      res.setHeader('Content-Type', 'application/json'); 
      res.send({
        code: code,
        data: data,
        count: count
      });
    } catch (error) {
      console.log(`list error: ${error.message}`);
      logger.error(`list error: ${error}`);
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

  async updateOne(req: Request, res: Response): Promise<void> {
    const _id = req.params.id;
    const updates = req.body.data;
    let code = Code.FAIL;
    let data = _id;
    try {
      if (req.body) {
        const r = await this.model.updateOne( 
          {_id},
          updates
        );
        if (r.nModified === 1 && r.ok === 1) {
          code = Code.SUCCESS;
          data = _id; // r.upsertedId ?
        } else {
          code = Code.FAIL;
          data = _id;
        }
      }
    } catch (error) {
      logger.error(`updateOne error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send({
        code,
        data,
      });
    }
  }

  // alias to updateOne
  async update(req: Request, res: Response) {
    return this.updateOne(req, res);
  }

  async create(req: Request, res: Response): Promise<any> {
    const doc = req.body.data;
    delete(doc._id);
    try {
      await this.model.validate(doc, "create");
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: e.toString()
      });
    }
    try {
      const data = await this.model.insertOne(doc);
      return res.json({
        code: Code.SUCCESS,
        data
      });
    } catch (e) {
      console.error(e);
      logger.error(`create error: ${e}`);
      return res.json({
        code: Code.FAIL,
        message: 'save failed'
      });
    }
  }

  async delete(req: Request, res: Response) {
    const _id = req.params.id;
    try {
      await this.model.deleteById(_id);
      return res.json({
        code: Code.SUCCESS
      });
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: e
      });
    }
  }
}
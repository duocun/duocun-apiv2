import { Request, Response } from "express";
import { DB } from "../db";
import { Product } from "../models/product";
import { Controller, Code } from "./controller";
import path from "path";
import { getLogger } from "../lib/logger";
const logger = getLogger(path.basename(__filename));

export class ProductController extends Controller {
  model: Product;
  constructor(model: Product, db: DB) {
    super(model, db);
    this.model = model;
  }

  // joined list
  async list(req: Request, res: Response) {
    const where: any = req.query.where;
    const options: any = req.query.options;
    let data: any[] = [];
    let count: number = 0;
    let code = Code.FAIL;
    try {
      if(where){ 
        // TODO: no where will return error, is it a good choice?
        const r = await this.model.list(where, options)
        code = Code.SUCCESS;
        data = r.data;
        count = r.count;
      } 
    } catch (error) {
      logger.error(`list error: ${error}`);
    } finally {
      res.setHeader('Content-Type', 'application/json'); 
      res.send(JSON.stringify({
        code: code,
        data: data,
        count: count 
      }));
    }
  }

  // grocery
  async gv1_list(req: Request, res: Response) {
    const status = req.query.status;
    const merchantId = req.query.merchantId;
    const query = status ? { status } : {};
    let data: any[] = [];
    let code = Code.FAIL;
    try {
      if (query && merchantId) {
        const r = await this.model.list({ ...query, merchantId });
        code = Code.SUCCESS;
        data = r;
      }
    } catch (error) {
      logger.error(`gv1_list error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: code,
          data: data,
        })
      );
    }
  }

  async gv1_get(req: Request, res: Response) {
    const id = req.params.id;
    let data: any = {};
    let code = Code.FAIL;
    try {
      if (id) {
        const r = await this.model.getById(id);
        code = Code.SUCCESS;
        data = r;
      }
    } catch (error) {
      logger.error(`gv1_get error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: code,
          data: data,
        })
      );
    }
  }

  async av1_list(req: Request, res: Response) {
    const where: any = req.query.where; // query:"{"where":{},"options":{"limit":10,"skip":0,"sort":[["_id",1]]}}"
    const options: any = req.query.options;
    const query = { ...where, taxRate: 0 };
    let data: any[] = [];
    let count: number = 0;
    let code = Code.FAIL;
    try {
      if (where) {
        const r = await this.model.find_v2(query, options);
        code = Code.SUCCESS;
        count = r.count;
        data = r.data;
      }
    } catch (error) {
      logger.error(`list error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: code,
          data: data,
          count: count,
        })
      );
    }
  }
}

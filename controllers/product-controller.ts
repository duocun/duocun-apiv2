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

  async gv1_list(req: Request, res: Response) {
    const status = req.query.status;
    const merchantId = req.query.merchantId;
    const query = status ? { status } : {};
    let data: any[] = [];
    let code = Code.FAIL;
    try {
      if (query && merchantId) {
        const r = await this.model.joinFind({ ...query, merchantId });
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

  async update(req: Request, res: Response): Promise<void> {
    const productId = req.query.productId;
    const productData = req.body.data;
    let code = Code.FAIL;
    let data = productId;
    if (productData instanceof Array) {
      this.model.bulkUpdate(productData, req.body.options).then((x) => {
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(x, null, 3)); // x --- {status: 1, msg: ''}
      });
    } else {
      try {
        if (req.body) {
          const r = await this.model.updateOne(
            productId,
            productData,
            req.body.options
          );
          if (r.nModified === 1 && r.ok === 1) {
            code = Code.SUCCESS;
            data = productId;
          } else {
            code = Code.FAIL;
            data = productId;
          }
        }
      } catch (error) {
        logger.error(`update product error: ${error}`);
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
  }
}

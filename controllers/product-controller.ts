import { Request, Response } from "express";
import { DB } from "../db";
import { Product } from "../models/product";
import { Controller, Code } from "./controller";
import path from "path";
import { getLogger } from "../lib/logger";
import { getDefaultProduct } from "../helpers/product-helper";
import { ObjectId } from "mongodb";
import moment from "moment";
import { Order, OrderStatus } from "../models/order";

const logger = getLogger(path.basename(__filename));

export class ProductController extends Controller {
  model: Product;
  orderModel: Order;
  constructor(model: Product, db: DB) {
    super(model, db);
    this.model = model;
    this.orderModel = new Order(db);
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

  async save(req: Request, res: Response) {
    const id = req.params.id;
    let doc = getDefaultProduct();
    if (id && id !== "new") {
      doc = await this.model.findOne({ _id: id });
      if (!doc) {
        return res.json({
          code: Code.FAIL,
          message: 'product not found'
        });
      }
    }
    try {
      doc = this.fillDocFromRequest(doc, req);
    } catch (e) {
      if (e.getMessage() === "invalid_id") {
        return res.json({
          code: Code.FAIL,
          message: e.getMessage()
        });
      }
    }
    const collection = await this.model.getCollection();
    if (!id || id === "new") {
      const result = await collection.insertOne(doc);
      if (result.result.ok) {
        res.send({
          code: Code.SUCCESS,
          data: {
            ...doc,
            _id: result.ops[0]._id
          }
        });
      } else {
        res.send({
          code: Code.FAIL,
          message: 'save_failed'
        });
      }
    } else {
      const oid = new ObjectId(id);
      const result = await collection.updateOne({_id: oid}, {$set: doc}, {upsert: true});
      if (result.result.ok) {
        collection.findOne({_id: oid}).then(data => {
          res.send({
            code: Code.SUCCESS,
            data
          });
        });
      } else {
        res.send({
          code: Code.FAIL,
          message: 'save_failed'
        });
      }
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

  async delivery(req: Request, res: Response) {
    let productId: any = req.params.id;
    try {
      productId = new ObjectId(productId);
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        msg: "invalid_id"
      });
    }
    let todayString = moment().format("YYYY-MM-DDT00:00:00.000Z");
    const collection  = await this.orderModel.getCollection();
    const orders = await collection.find({
      delivered: { $gte: todayString },
      status: { 
        $nin: [
          OrderStatus.BAD,
          OrderStatus.DELETED,
          OrderStatus.DONE
        ] 
      },
      items: {
        $elemMatch: {
          productId
        }
      }
    }).toArray();
    res.json({
      code: Code.SUCCESS,
      todayString,
      data: orders
    });
  }

  fillDocFromRequest(doc: any, req: Request) {
    delete(doc._id);
    doc.name = req.body.name || "";
    doc.nameEN = req.body.nameEN || "";
    doc.description = req.body.description || "";
    doc.descriptionEN = req.body.descriptionEN || "";
    doc.price = parseFloat(req.body.price);
    doc.cost = parseFloat(req.body.cost);
    doc.type = "G";
    if (req.body.dow) {
      doc.dow = req.body.dow;
    }
    if (req.body.pictures) {
      doc.pictures = req.body.pictures;
    }
    if (req.body.order) {
      doc.order = req.body.order;
    }
    if (req.body.featured) {
      doc.featured = req.body.featured;
    }
    try {
      if (req.body.merchantId) {
        doc.merchantId = new ObjectId(req.body.merchantId);
      }
      if (req.body.categoryId) {
        doc.categoryId = new ObjectId(req.body.categoryId);
      }
    } catch(e) {
      throw new Error("invalid_id");
    }
    doc.stock = req.body.stock;
    doc.attributes = req.body.attributes || [];
    doc.combinations = req.body.combinations || [];
    return doc;
  }
}

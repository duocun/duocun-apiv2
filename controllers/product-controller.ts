import { Request, Response } from "express";
import { DB } from "../db";
import { Product, ProductStatus } from "../models/product";
import { Controller, Code } from "./controller";
import path from "path";
import { getLogger } from "../lib/logger";
import { getDefaultProduct } from "../helpers/product-helper";
import { ObjectId } from "mongodb";
import moment from "moment";
import { Order, OrderStatus, IOrder } from "../models/order";
import { Merchant } from "../models/merchant";

import sharp from "sharp";
import { Config } from "../config";
const logger = getLogger(path.basename(__filename));

export class ProductController extends Controller {
  model: Product;
  orderModel: Order;
  merchantModel: Merchant;
  constructor(model: Product, db: DB) {
    super(model, db);
    this.model = model;
    this.orderModel = new Order(db);
    this.merchantModel = new Merchant(db);
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
      if (doc.status != ProductStatus.ACTIVE && doc.status != ProductStatus.INACTIVE && doc.status != ProductStatus.NEW && doc.status != ProductStatus.PROMOTE) {
        doc.status = ProductStatus.INACTIVE;
      }
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
      doc.stock.quantity -= this.countProductQuantityFromOrders(await this.getOrdersContainingProduct(id, moment().format("YYYY-MM-DD")), id);
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
    try {
      const data = (id == "new") ? {} : await this.model.getById(id);
      const merchants = await this.merchantModel.find({
        
      });
      if (id !== "new" && data.stock) {
        
        data.stock.quantityReal = data.stock.quantityReal;
        data.stock.quantity = data.stock.quantity || 0;
        data.stock.quantity += this.countProductQuantityFromOrders(await this.getOrdersContainingProduct(data._id, moment().format("YYYY-MM-DD")), data._id);
      }
      return res.json({
        code: Code.SUCCESS,
        data: data,
        meta: {
          merchants
        }
      });
    } catch (error) {
      logger.error(`gv1_get error: ${error}`);
      return res.json({
        code: Code.FAIL,
        data: [],
      })
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
    doc.rank = parseInt(req.body.rank);
    doc.taxRate = parseFloat(req.body.taxRate);
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


  // admin tool
  async batchPrice(req: Request, res: Response) {
    const products  = await this.model.find({type:'G'});
    const datas: any[] = [];
    products.forEach(p => {
      if(p.price % 1 === 0){
        datas.push({
          query: { _id: p._id },
          data: { price: Math.round((p.price - 0.01)*100)/100 }
        });
      }
    });
    await this.model.bulkUpdate(datas);
    const nps  = await this.model.find({type:'G'});
    const rs = nps.map(np => ({name: np.name, price: np.price}));
    res.json({
      code: Code.SUCCESS,
      data: rs
    });
  }

  async getOrdersContainingProduct(productId: any, start: string = "") {
    productId = new ObjectId(productId);
    let todayString = moment().format("YYYY-MM-DD") ;
    let startDate = start || todayString;
    const collection  = await this.orderModel.getCollection();
    const orders = await collection.find({
      deliverDate: { $gte: startDate },
      status: { 
        $nin: [
          OrderStatus.BAD,
          OrderStatus.DELETED,
          OrderStatus.TEMP
        ] 
      },
      items: {
        $elemMatch: {
          productId
        }
      }
    }).toArray();
    return orders;
  }

  countProductQuantityFromOrders(orders: Array<IOrder>, productId: any, start: string = "") {
    let count = 0;
    let startDate = start || moment().format("YYYY-MM-DD");
    orders.filter(order => (order.deliverDate || "") > startDate).forEach(order => {
      if (order.items && order.items.length) {
        order.items.forEach((item:any)  => {
          if (item.productId.toString() === productId.toString()) {
            count += item.quantity;
          }
        })
      }
    });
    return count;
  }

  async uploadImage(req: Request, res: Response){
    const cfg = new Config();
      const productId = req.query.productId;
      const product = await this.orderModel.findOne({ _id: productId });
  
      const baseUrl = "https://duocun.com.cn/media";
      const urls: any = {
        // @ts-ignore
        default: `${baseUrl}/${req.fileInfo.filename}`
      };
      for (const width of [480, 720, 960, 1200]) {
        // @ts-ignore
        const newFilename = `${req.fileInfo.name}_${width}.${req.fileInfo.extension}`;
        const fpath = `${cfg.MEDIA.TEMP_PATH}/${newFilename}`;
        // @ts-ignore
        await sharp(`${cfg.MEDIA.TEMP_PATH}/${req.fileInfo.filename}`).resize(width).toFile(fpath);
        urls[`${width}`] = `${baseUrl}/${newFilename}`;

        await this.model.uploadToAws(newFilename, fpath);
      }
  
      const picture = {
        // @ts-ignore
        name: req.fileInfo.filename,
        // @ts-ignore
        url: req.fileInfo.filename
      };
  
      if (product) {
        if (!product.pictures) {
          product.pictures = [];
        }
    
        product.pictures.push(picture);
    
        try {
          await this.orderModel.updateOne({ _id: product._id }, product);
        } catch (e) {
          console.error(e);
          return res.json({
            code: Code.FAIL
          });
        }
      }
  
      return res.json({
        code: Code.SUCCESS,
        data: picture
      });
    }
  
}

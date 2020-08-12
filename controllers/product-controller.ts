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
import { Picture } from "../models/picture";
import { hasRole, resource } from "../lib/rbac";
import {
  hasRole as isRole,
  ROLE,
  RESOURCES,
  PERMISSIONS,
} from "../models/role";

import sharp from "sharp";
import { Config } from "../config";
const logger = getLogger(path.basename(__filename));

@resource(RESOURCES.PRODUCT)
export class ProductController extends Controller {
  model: Product;
  orderModel: Order;
  merchantModel: Merchant;
  pictureModel: Picture;

  constructor(model: Product, db: DB) {
    super(model, db);
    this.model = model;
    this.orderModel = new Order(db);
    this.merchantModel = new Merchant(db);
    this.pictureModel = new Picture(db);
  }

  async list(req: Request, res: Response) {
    let where: any = req.query.where;
    const options: any = req.query.options;
    const { user } = res.locals;
    try {
      if (!isRole(user, ROLE.SUPER)) {
        where = where || {};
        where.merchantId = user._id;
      }
      const r = await this.model.list(where, options);
      const { data, count } = r;
      res.json({
        code: Code.SUCCESS,
        data,
        count,
      });
    } catch (e) {
      res.json({
        code: Code.FAIL,
        message: e.message,
      });
    }
  }

  @hasRole({ resource: RESOURCES.PRODUCT, permission: PERMISSIONS.UPDATE })
  async toggleFeature(req: Request, res: Response) {
    const product = await this.getProductFromRequest(req, res);
    if (!product) {
      return;
    }
    product.featured = !product.featured;
    try {
      await this.model.updateOne({ _id: product._id }, product);
    } catch (e) {
      res.json({
        code: Code.FAIL,
        message: e.message,
      });
    }
    res.json({
      code: Code.SUCCESS,
      data: product,
    });
  }

  @hasRole({ resource: RESOURCES.PRODUCT, permission: PERMISSIONS.UPDATE })
  async toggleStatus(req: Request, res: Response) {
    const product = await this.getProductFromRequest(req, res);
    if (!product) {
      return;
    }
    product.status =
      product.status === ProductStatus.ACTIVE
        ? ProductStatus.INACTIVE
        : ProductStatus.ACTIVE;
    try {
      await this.model.updateOne({ _id: product._id }, product);
    } catch (e) {
      res.json({
        code: Code.FAIL,
        message: e.message,
      });
    }
    res.json({
      code: Code.SUCCESS,
      data: product,
    });
  }

  async update(req: Request, res: Response) {
    let doc;
    try {
      doc = await this.model.validate(req.body.data, "update");
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: e.message,
      });
    }
    const collection = await this.model.getCollection();
    const { id } = req.params;
    doc.stock.quantity -= this.countProductQuantityFromOrders(
      await this.getOrdersContainingProduct(id, moment().format("YYYY-MM-DD")),
      id
    );
    const oid = new ObjectId(id);
    const result = await collection.updateOne(
      { _id: oid },
      { $set: doc },
      { upsert: true }
    );
    if (result.result.ok) {
      collection.findOne({ _id: oid }).then((data) => {
        res.send({
          code: Code.SUCCESS,
          data,
        });
      });
    } else {
      res.send({
        code: Code.FAIL,
        message: "save_failed",
      });
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
    const { user } = res.locals;
    const isAdmin = isRole(user, ROLE.SUPER);
    try {
      const data =
        id == "new"
          ? {}
          : isAdmin
          ? await this.model.getById(id)
          : await this.model.findOne({ _id: id, merchantId: user._id });
      const merchants = await this.merchantModel.find(
        isAdmin ? {} : { merchantId: user._id }
      );
      if (id !== "new" && data.stock) {
        data.stock.quantityReal = data.stock.quantityReal;
        data.stock.quantity = data.stock.quantity || 0;
        data.stock.quantity += this.countProductQuantityFromOrders(
          await this.getOrdersContainingProduct(
            data._id,
            moment().format("YYYY-MM-DD")
          ),
          data._id
        );
      }
      return res.json({
        code: Code.SUCCESS,
        data: data,
        meta: {
          merchants,
        },
      });
    } catch (error) {
      logger.error(`gv1_get error: ${error}`);
      return res.json({
        code: Code.FAIL,
        data: [],
      });
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

  @hasRole({ resource: RESOURCES.PRODUCT, permission: PERMISSIONS.READ })
  async delivery(req: Request, res: Response) {
    let productId: any = req.params.id;
    try {
      productId = new ObjectId(productId);
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        msg: "invalid_id",
      });
    }
    let todayString = moment().format("YYYY-MM-DDT00:00:00.000Z");
    const collection = await this.orderModel.getCollection();
    const orders = await collection
      .find({
        delivered: { $gte: todayString },
        status: {
          $nin: [OrderStatus.BAD, OrderStatus.DELETED, OrderStatus.DONE],
        },
        items: {
          $elemMatch: {
            productId,
          },
        },
      })
      .toArray();
    res.json({
      code: Code.SUCCESS,
      todayString,
      data: orders,
    });
  }

  fillDocFromRequest(doc: any, req: Request) {
    delete doc._id;
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
    } catch (e) {
      throw new Error("invalid_id");
    }
    doc.stock = req.body.stock;
    doc.attributes = req.body.attributes || [];
    doc.combinations = req.body.combinations || [];
    return doc;
  }

  // admin tool
  async batchPrice(req: Request, res: Response) {
    const products = await this.model.find({ type: "G" });
    const datas: any[] = [];
    products.forEach((p) => {
      if (p.price % 1 === 0) {
        datas.push({
          query: { _id: p._id },
          data: { price: Math.round((p.price - 0.01) * 100) / 100 },
        });
      }
    });
    await this.model.bulkUpdate(datas);
    const nps = await this.model.find({ type: "G" });
    const rs = nps.map((np) => ({ name: np.name, price: np.price }));
    res.json({
      code: Code.SUCCESS,
      data: rs,
    });
  }

  async getOrdersContainingProduct(productId: any, start: string = "") {
    productId = new ObjectId(productId);
    let todayString = moment().format("YYYY-MM-DD");
    let startDate = start || todayString;
    const collection = await this.orderModel.getCollection();
    const orders = await collection
      .find({
        deliverDate: { $gte: startDate },
        status: {
          $nin: [OrderStatus.BAD, OrderStatus.DELETED, OrderStatus.TEMP],
        },
        items: {
          $elemMatch: {
            productId,
          },
        },
      })
      .toArray();
    return orders;
  }

  countProductQuantityFromOrders(
    orders: Array<IOrder>,
    productId: any,
    start: string = ""
  ) {
    let count = 0;
    let startDate = start || moment().format("YYYY-MM-DD");
    orders
      .filter((order) => (order.deliverDate || "") > startDate)
      .forEach((order) => {
        if (order.items && order.items.length) {
          order.items.forEach((item: any) => {
            if (item.productId.toString() === productId.toString()) {
              count += item.quantity;
            }
          });
        }
      });
    return count;
  }

  async uploadImage(req: Request, res: Response) {
    const cfg = new Config();
    const productId = req.query.productId;
    const product = await this.orderModel.findOne({ _id: productId });

    const baseUrl = "https://duocun.com.cn/media";
    const urls: any = {
      // @ts-ignore
      default: `${baseUrl}/${req.fileInfo.filename}`,
    };
    // @ts-ignore
    const defaultFilename = `${req.fileInfo.filename}`;
    const defaultPath = `${cfg.MEDIA.TEMP_PATH}/${defaultFilename}`;
    await this.pictureModel.uploadToAws(defaultFilename, defaultPath);

    for (const width of [480, 720, 960]) {
      // @ts-ignore
      const newFilename = `${req.fileInfo.name}_${width}.${req.fileInfo.extension}`;
      const fpath = `${cfg.MEDIA.TEMP_PATH}/${newFilename}`;
      // @ts-ignore
      await sharp(`${cfg.MEDIA.TEMP_PATH}/${req.fileInfo.filename}`)
        .resize(width)
        .toFile(fpath);
      urls[`${width}`] = `${baseUrl}/${newFilename}`;

      await this.pictureModel.uploadToAws(newFilename, fpath);
    }

    const picture = {
      // @ts-ignore
      name: req.fileInfo.filename,
      // @ts-ignore
      url: req.fileInfo.filename,
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
          code: Code.FAIL,
        });
      }
    }

    return res.json({
      code: Code.SUCCESS,
      data: picture,
    });
  }

  async getProductFromRequest(req: Request, res: Response) {
    const { productId } = req.body;
    if (!productId) {
      res.json({
        code: Code.FAIL,
        message: "Product ID is required",
      });
      return null;
    }
    const { user } = res.locals;
    let oid;
    try {
      oid = new ObjectId(productId);
    } catch (e) {
      res.json({
        code: Code.FAIL,
        message: "Invalid ID is given",
      });
      return null;
    }
    const where: any = { _id: oid };
    if (!isRole(user, ROLE.SUPER)) {
      where.merchantId = user._id;
    }
    const product = await this.model.findOne(where);
    if (!product) {
      res.json({
        code: Code.FAIL,
        message: "Product does not exist or does not belong to user",
      });
      return null;
    }
    return product;
  }
}

import { Request, Response } from "express";
import { DB } from "../db";
import { Product, IProduct } from "../models/product";
import { OrderStatus, IOrder } from "../models/order";
import { Controller, Code } from "./controller";
import path from "path";
import { getLogger } from "../lib/logger";
import { ObjectId } from "mongodb";
import { Order } from "../models/order";
import moment from "moment-timezone";

const logger = getLogger(path.basename(__filename));

export class StockController extends Controller {
  model: Product;
  orderModel: Order;

  constructor(model: Product, db: DB) {
    super(model, db);
    this.model = model;
    this.orderModel = new Order(db);
  }

  async list(req: Request, res: Response) {
    const where: any = req.query.where || {};
    const startDate = where.startDate || moment().tz("America/Toronto").format("YYYY-MM-DD");
    delete(where.startDate);
    const options: any = req.query.options;
    let ret = await this.model.list(where, options);
    for (let product of ret.data) {
      if (product.stock) {
        product.delivery = await this.getOrdersContainingProduct(product._id, startDate);
        product.stock.quantityReal = product.stock.quantity;
        product.stock.quantity = product.stock.quantity || 0;
        product.stock.quantity += this.countProductQuantityFromOrders(await this.getOrdersContainingProduct(product._id, moment().tz('America/Toronto').format("YYYY-MM-DD")), product._id);
      }
    }
    res.json({
      code: Code.SUCCESS,
      ...ret
    });
  }

  async toggleStockEnabled(req: Request, res: Response) {
    let productId = req.params.id;
    let product: IProduct;
    try {
      product = await this.model.findOne({ _id: productId })
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: 'product not found'
      });
    }
    if (!product) {
      return res.json({
        code: Code.FAIL,
        message: 'product not found'
      });
    }
    if (product.stock) {
      product.stock.enabled = !product.stock.enabled;
    } else {
      product.stock = {
        enabled: true,
        allowNegative: false,
        outofstockMessage: "",
        outofstockMessageEN: "",
        warningThreshold: 0,
        quantity: 0
      };
    }
    try {
      await this.model.updateOne({ _id: productId }, product);
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: 'save failed'
      });
    }
    return res.json({
      code: Code.SUCCESS
    });
  }

  async toggleAllowNegative(req: Request, res: Response) {
    let productId = req.params.id;
    let product: IProduct;
    try {
      product = await this.model.findOne({ _id: productId })
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: 'product not found'
      });
    }
    if (!product) {
      return res.json({
        code: Code.FAIL,
        message: 'product not found'
      });
    }
    if (!product.stock || !product.stock.enabled) {
      return res.json({
        code: Code.FAIL,
        message: 'stock not enabled'
      });
    }
    product.stock.allowNegative = !product.stock.allowNegative;
    try {
      await this.model.updateOne({ _id: productId }, product);
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: 'save failed'
      });
    }
    return res.json({
      code: Code.SUCCESS
    });
  }

  async setQuantity(req: Request, res: Response) {
    let productId = req.params.id;
    let product: IProduct;
    try {
      product = await this.model.findOne({ _id: productId });
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: 'product not found'
      });
    }
    if (!product) {
      return res.json({
        code: Code.FAIL,
        message: 'product not found'
      });
    }
    if (!product.stock || !product.stock.enabled) {
      return res.json({
        code: Code.FAIL,
        message: 'stock not enabled'
      });
    }
    logger.info("--- BEGIN PRODUCT QUANTITY CHANGE ---");
    logger.info(`Product ID: ${product._id}, name: ${product.name}, old stock: ${product.stock.quantity}`);
    const orderedCount = await this.getOrderedProductQuantity(productId);
    logger.info(`\tOrdered product quantity: ${orderedCount}`);
    let quantity = req.body.quantity || 0;
    quantity -= orderedCount;
    product.stock.quantity = quantity;
    
    try {
      await this.model.updateOne({ _id: productId }, product);
      logger.info(`\tNew quantity: ${product.stock.quantity}`);
    } catch (e) {
      logger.error(`Quantity save failed, ${e}`);
      return res.json({
        code: Code.FAIL,
        message: 'save failed'
      });
    }
    logger.info("--- END PRODUCT QUANTITY CHANGE ---");
    return res.json({
      code: Code.SUCCESS
    });
  }

  async getOrderedProductQuantity(productId: any) {
    let orders = await this.getOrdersContainingProduct(productId);
    return this.countProductQuantityFromOrders(orders, productId);
  }

  async getOrdersContainingProduct(productId: any, start: string = "") {
    productId = new ObjectId(productId);
    let todayString = moment().tz('America/Toronto').format("YYYY-MM-DD") ;
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
    let startDate = start || moment().tz('America/Toronto').format("YYYY-MM-DD");
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
}
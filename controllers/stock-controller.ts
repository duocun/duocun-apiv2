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
import { hasRole, resource } from "../lib/rbac";
import { RESOURCES, PERMISSIONS, hasRole as isRole, ROLE } from "../models/role";

const logger = getLogger(path.basename(__filename));

@resource(RESOURCES.STOCK)
export class StockController extends Controller {
  model: Product;
  orderModel: Order;

  constructor(model: Product, db: DB) {
    super(model, db);
    this.model = model;
    this.orderModel = new Order(db);
  }

	@hasRole({ resource: RESOURCES.STOCK, permission: PERMISSIONS.READ })
  async list(req: Request, res: Response) {
    const { user } = res.locals;
    const where: any = req.query.where || {};
    if (!isRole(user, ROLE.SUPER)) {
      where.merchantId = user._id;
    }
    const today = moment().tz("America/Toronto").format("YYYY-MM-DD");
    const startDate = where.startDate || moment().tz("America/Toronto").format("YYYY-MM-DD");
    delete(where.startDate);
    const options: any = req.query.options;
    let ret = await this.model.list(where, options);
    for (let product of ret.data) {
      if (product.stock) {
        product.delivery = await this.getOrdersContainingProduct(product._id, startDate >= today ? today : startDate);
        product.stock.quantityReal = product.stock.quantity;
        product.stock.quantity = product.stock.quantity || 0;
        product.stock.quantity += this.countProductQuantityFromOrders(await this.getOrdersContainingProduct(product._id, today), product._id);
      }
    }
    res.json({
      code: Code.SUCCESS,
      ...ret
    });
  }

	@hasRole({ resource: RESOURCES.STOCK, permission: PERMISSIONS.UPDATE })
  async toggleStockEnabled(req: Request, res: Response) {
    let productId = req.params.id;
    const { user } = res.locals;
    const where: any = { _id: productId }
    if (!isRole(user, ROLE.SUPER)) {
      where.merchantId = user._id;
    }
    let product: IProduct;
    try {
      product = await this.model.findOne(where)
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

	@hasRole({ resource: RESOURCES.STOCK, permission: PERMISSIONS.UPDATE })
  async toggleAllowNegative(req: Request, res: Response) {
    let productId = req.params.id;
    const { user } = res.locals;
    const where: any = { _id: productId };
    if (!isRole(user, ROLE.SUPER)) {
      where.merchantId = user._id;
    }
    let product: IProduct;
    try {
      product = await this.model.findOne(where);
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

	@hasRole({ resource: RESOURCES.STOCK, permission: PERMISSIONS.UPDATE })
  async setQuantity(req: Request, res: Response) {
    let productId = req.params.id;
    const { user } = res.locals;
    const where: any = { _id: productId };
    if (!isRole(user, ROLE.SUPER)) {
      where.merchantId = user._id;
    }
    let product: IProduct;
    try {
      product = await this.model.findOne(where);
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
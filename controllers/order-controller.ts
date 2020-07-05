import express from "express";
import { DB } from "../db";
import { Order } from "../models/order";
import { Request, Response } from "express";
import { Controller, Code } from "./controller";

import path from "path";
import { getLogger } from "../lib/logger";
const logger = getLogger(path.basename(__filename));

export class OrderController extends Controller {
  model: Order;

  constructor(model: Order, db: DB) {
    super(model, db);
    this.model = model;
  }

  async splitOrder(req: Request, res: Response): Promise<void> {
    const _id = req.params.id; // orderId
    const items = req.body.items.map((it: any) => { // productId, price, cost, quantity to be split
      let c = {...it};
      delete c.status;
      return c;
    });
    let code = Code.FAIL;
    let data = _id;
    try {
      if (req.body) {
        const r = await this.model.splitOrder(_id, items);
        if (r) {
          code = Code.SUCCESS;
          data = r;
        } else {
          code = Code.FAIL;
          data = '';
        }
      }
    } catch (error) {
      logger.error(`split order error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send({
        code,
        data,
      });
    }
  }

  async cancelItems(req: Request, res: Response): Promise<void> {
    const _id = req.params.id;
    const items = req.body.items.map((it: any) => {
      let c = {...it};
      delete c.status;
      return c;
    });
    let code = Code.FAIL;
    let data = _id;
    try {
      if (req.body) {
        const r = await this.model.cancelItems(_id, items);
        if (r) {
          code = Code.SUCCESS;
          data = r;
        } else {
          code = Code.FAIL;
          data = '';
        }
      }
    } catch (error) {
      logger.error(`cancelItems error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send({
        code,
        data,
      });
    }
  }

  async assign(req: Request, res: Response): Promise<void> {
    const driverId = req.body.driverId;
    const driverName = req.body.driverName;
    const orderIds = req.body.orderIds;
    let code = Code.FAIL;
    let data = '';
    try {
      if (driverId && driverName && orderIds && orderIds.length>0) {
        await this.model.assign(driverId, driverName, orderIds);
        code = Code.SUCCESS;
        data = 'done';
      }
    } catch (error) {
      logger.error(`assgin order error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send({
        code,
        data,
      });
    }
  }

  // deprecated
  loadPage(req: Request, res: Response) {
    const itemsPerPage = +req.params.itemsPerPage;
    const currentPageNumber = +req.params.currentPageNumber;

    let query = null;
    let fields = null;
    if (
      req.headers &&
      req.headers.filter &&
      typeof req.headers.filter === "string"
    ) {
      query =
        req.headers && req.headers.filter
          ? JSON.parse(req.headers.filter)
          : null;
    }

    if (
      req.headers &&
      req.headers.fields &&
      typeof req.headers.fields === "string"
    ) {
      fields =
        req.headers && req.headers.fields
          ? JSON.parse(req.headers.fields)
          : null;
    }

    if (query.hasOwnProperty("pickup")) {
      query.delivered = this.model.getPickupDateTime(query["pickup"]);
      delete query.pickup;
    }
    let q = query ? query : {};

    res.setHeader("Content-Type", "application/json");

    this.model.loadPage(query, itemsPerPage, currentPageNumber).then((arr) => {
      const len = arr.length;
      if (arr && arr.length > 0) {
        res.send(JSON.stringify({ total: len, orders: arr }, null, 3));
      } else {
        res.send(JSON.stringify({ total: len, orders: [] }, null, 3));
      }
    });
  }

  // return [{_id, address, description,items, merchantName, clientPhoneNumber, price, total, tax, delivered, created}, ...]
  loadHistory(req: Request, res: Response) {
    const itemsPerPage = +req.params.itemsPerPage;
    const currentPageNumber = +req.params.currentPageNumber;

    let query = null;
    // let fields = null;
    if (
      req.headers &&
      req.headers.filter &&
      typeof req.headers.filter === "string"
    ) {
      query =
        req.headers && req.headers.filter
          ? JSON.parse(req.headers.filter)
          : null;
    }

    // if (req.headers && req.headers.fields && typeof req.headers.fields === 'string') {
    //   fields = (req.headers && req.headers.fields) ? JSON.parse(req.headers.fields) : null;
    // }

    // let q = query ? query : {};
    let clientId = query.clientId;

    this.model
      .loadHistory(clientId, itemsPerPage, currentPageNumber)
      .then((r) => {
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(r, null, 3));
      });
  }

  placeOrders(req: Request, res: Response) {
    const orders = req.body;
    this.model.placeOrders(orders).then((savedOrders: any[]) => {
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: Code.SUCCESS,
          data: savedOrders,
        })
      );
    });
  }

  // admin
  async updateOrderPhone(req: Request, res: Response) {
    const year = req.params.year;
    await this.model.updateOrderPhone(year);
    res.setHeader("Content-Type", "application/json");
    res.send({
      code: Code.SUCCESS,
      data: 'done',
    });
  }

  async list(req: Request, res: Response): Promise<void> {
    const where: any = req.query.where;
    const options: any = req.query.options;
    res.setHeader("Content-Type", "application/json");
    let data: any[] = [];
    let count: number = 0;
    let code = Code.FAIL;
    try {
      if (where) {
        // TODO: no where will return error, is it a good choice?
        const r = await this.model.joinFindV2(where, options);
        code = Code.SUCCESS;
        data = r.data;
        count = r.count;
      }
    } catch (error) {
      logger.error(`list error: ${error}`);
    } finally {
      res.send(
        JSON.stringify({
          code,
          data,
          count,
        })
      );
    }
  }

  // placePrepaidOrder
  async create(req: Request, res: Response): Promise<void> {
    const order = req.body;
    let code = Code.FAIL;
    let data = {};
    try {
      if (order) {
        const r = await this.model.placePrepaidOrder(order);
        if (r) {
          code = Code.SUCCESS;
          data = r;
        }
      }
    } catch (error) {
      logger.error(`create prepaid order error: ${error}`);
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

  async removeOrder(req: Request, res: Response) {
    const orderId = req.params.id;
    let code = Code.FAIL;
    let data = {};
    try {
      const r = await this.model.doRemoveOne(orderId);
      if (r) {
        code = Code.SUCCESS;
        data = r;
      }
    } catch (error) {
      logger.error(`delete one order error: ${error}`);
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

  async getClientWithDuplicatedOrders(req: Request, res: Response){
    const utcDelivered = `${req.query.delivered}`;
    let rs: any[] = await this.model.getClientWithDuplicatedOrders(utcDelivered);
    res.setHeader('Content-Type', 'application/json');
    res.send(rs);
  }

  async getBadOrder(req: Request, res: Response){
    let rs: any[] = await this.model.getBadOrder();
    res.setHeader('Content-Type', 'application/json');
    res.send(rs);
  }

  async getMapMarkers(req: Request, res: Response){
    const where: any = req.query.where;
    const options: any = req.query.options;
    res.setHeader("Content-Type", "application/json");
    let data: any;
    let count: number = 0;
    let code = Code.FAIL;
    try {
      if (where) {
        // TODO: no where will return error, is it a good choice?
        const r = await this.model.getMapMarkers(where);
        code = Code.SUCCESS;
        data = r;
      }
    } catch (error) {
      // logger.error(`list error: ${error}`);
    } finally {
      res.send({
          code,
          data
        }
      );
    }
  }

  async getRoutes(req: Request, res: Response){
    const deliverDate: any = req.query.deliverDate;
    res.setHeader("Content-Type", "application/json");
    let data: any;
    let count: number = 0;
    let code = Code.FAIL;
    try {
      const r = await this.model.getRoutes(deliverDate);
      code = Code.SUCCESS;
      data = r;
    } catch (error) {
      // logger.error(`list error: ${error}`);
    } finally {
      res.send({
          code,
          data
        }
      );
    }
  }
}

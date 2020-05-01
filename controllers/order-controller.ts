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
  async update(req: Request, res: Response): Promise<void> {
    const orderId = req.params.id;
    const orderData = req.body.data;
    let code = Code.FAIL;
    let data = orderId;
    if (orderData instanceof Array) {
      this.model.bulkUpdate(orderData, req.body.options).then((x) => {
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(x, null, 3)); // x --- {status: 1, msg: ''}
      });
    } else {
      try {
        if (req.body) {
          const r = await this.model.updateOne(
            orderId,
            orderData,
            req.body.options
          );
          if (r.nModified === 1 && r.ok === 1) {
            code = Code.SUCCESS;
            data = orderId;
          } else {
            code = Code.FAIL;
            data = orderId;
          }
        }
      } catch (error) {
        logger.error(`update order error: ${error}`);
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
  async create(req: Request, res: Response): Promise<void> {
    const order = req.body;
    let code = Code.FAIL;
    let data = {};
    try {
      if (order) {
        const r = await this.model.createOne(order);
        if (r) {
          code = Code.SUCCESS;
          data = r;
        }
      }
    } catch (error) {
      logger.error(`create one order error: ${error}`);
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

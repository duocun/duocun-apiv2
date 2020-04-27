import express from "express";
import { DB } from "../db";
import { Order } from "../models/order";
import { Request, Response } from "express";
import { Controller, Code } from "./controller";

export class OrderController extends Controller {
  model: Order;

  constructor(model: Order, db: DB) {
    super(model, db);
    this.model = model;
  }


  listV2(req: Request, res: Response) {
    let query = null;

    if (req.headers && req.headers.filter && typeof req.headers.filter === 'string') {
      query = (req.headers && req.headers.filter) ? JSON.parse(req.headers.filter) : null;
    }

    this.model.joinFindV2(query).then((rs: any[]) => {
      res.setHeader('Content-Type', 'application/json');
      if (rs) {
        res.send(JSON.stringify(rs, null, 3));
      } else {
        res.send(JSON.stringify(null, null, 3))
      }
    });
  }

  loadPage(req: Request, res: Response) {
    const itemsPerPage = +req.params.itemsPerPage;
    const currentPageNumber = +req.params.currentPageNumber;

    let query = null;
    let fields = null;
    if (req.headers && req.headers.filter && typeof req.headers.filter === 'string') {
      query = (req.headers && req.headers.filter) ? JSON.parse(req.headers.filter) : null;
    }

    if (req.headers && req.headers.fields && typeof req.headers.fields === 'string') {
      fields = (req.headers && req.headers.fields) ? JSON.parse(req.headers.fields) : null;
    }

    if (query.hasOwnProperty('pickup')) {
      query.delivered = this.model.getPickupDateTime(query['pickup']);
      delete query.pickup;
    }
    let q = query ? query : {};

    res.setHeader('Content-Type', 'application/json');

    this.model.loadPage(query, itemsPerPage, currentPageNumber).then(arr => {
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
    if (req.headers && req.headers.filter && typeof req.headers.filter === 'string') {
      query = (req.headers && req.headers.filter) ? JSON.parse(req.headers.filter) : null;
    }

    // if (req.headers && req.headers.fields && typeof req.headers.fields === 'string') {
    //   fields = (req.headers && req.headers.fields) ? JSON.parse(req.headers.fields) : null;
    // }

    // let q = query ? query : {};
    let clientId = query.clientId;

    this.model.loadHistory(clientId, itemsPerPage, currentPageNumber).then(r => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(r, null, 3));
    });
  }

  placeOrders(req: Request, res: Response) {
    const orders = req.body;
    this.model.placeOrders(orders).then((savedOrders: any[]) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: Code.SUCCESS,
        data: savedOrders 
      }));
    });
  }


  // admin


}
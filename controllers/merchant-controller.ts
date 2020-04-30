import express from "express";
import { Request, Response } from "express";
import moment from "moment";
import { DB } from "../db";
import { Merchant } from "../models/merchant";
import { Product } from "../models/product";
import { Controller, Code } from "./controller";
import path from 'path';
import { getLogger } from '../lib/logger'
const logger = getLogger(path.basename(__filename));

export class MerchantController extends Controller {
  model: Merchant;
  productModel: Product;
  constructor(model: Merchant, db: DB) {
    super(model, db);
    this.model = model;
    this.productModel = new Product(db);
  }

  async get(req: Request, res: Response):Promise<void>  {
    const id = req.params.id;
    let data:any = {};
    let code = Code.FAIL;
    const options: any = ( req.query && req.query.options ) || {};
    
    try {
      // join, model should be clear enough
      data = await this.model.getById(id, options);
      if ( data ) {
        data.products = await this.productModel.list({
          merchantId: id
        });
      }
      code = Code.SUCCESS;
    } catch (error) {
      logger.error(`get error : ${error}`);
    } finally {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: code,
        data: data 
      }));
    }
  }
  
  getMySchedules(req: Request, res: Response) {
    let fields: any;
    let data: any;
    if (req.headers) {
      if (req.headers.filter && typeof req.headers.filter === 'string') {
        data = JSON.parse(req.headers.filter);
      }
      if (req.headers.fields && typeof req.headers.fields === 'string') {
        fields = JSON.parse(req.headers.fields);
      }
    }
    const merchantId = data.merchantId;
    const location = data.location;
    this.model.getMySchedules(location, merchantId, fields).then((rs: any[]) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(rs, null, 3));
    });
  }


  getByAccountId(req: Request, res: Response) {
    let query = null;
    if (req.headers && req.headers.filter && typeof req.headers.filter === 'string') {
      query = (req.headers && req.headers.filter) ? JSON.parse(req.headers.filter) : null;
    }
    const merchantAccountId = query.id;
    this.model.getByAccountId(merchantAccountId).then((rs: any[]) => {
      res.setHeader('Content-Type', 'application/json');
      if (rs) {
        res.send(JSON.stringify(rs, null, 3));
      } else {
        res.send(JSON.stringify(null, null, 3))
      }
    });
  }

  quickFind(req: Request, res: Response) {
    let query = {};
    let fields: any;
    if (req.headers) {
      if (req.headers.filter && typeof req.headers.filter === 'string') {
        query = (req.headers && req.headers.filter) ? JSON.parse(req.headers.filter) : null;
      }
      if (req.headers.fields && typeof req.headers.fields === 'string') {
        fields = JSON.parse(req.headers.fields);
      }
    }

    this.model.find(query, null, fields).then((xs: any[]) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(xs, null, 3));
    });
  }

  // load restaurants
  // origin --- ILocation object
  // dateType --- string 'today', 'tomorrow'
  load(req: Request, res: Response) {
    const origin = req.body.origin;
    const dateType = req.body.dateType;
    let query = null;
    if (req.headers && req.headers.filter && typeof req.headers.filter === 'string') {
      query = (req.headers && req.headers.filter) ? JSON.parse(req.headers.filter) : null;
    }
    
    const dt = dateType === 'today' ? moment() : moment().add(1, 'days');
    this.model.loadByDeliveryInfo(query, dt, origin).then((rs: any) => {
      if (rs) {
        res.send(JSON.stringify(rs, null, 3));
      } else {
        res.send(JSON.stringify(null, null, 3))
      }
    });
  }

  gv1_list(req: Request, res: Response) {
    const status = req.query.status;
    const query = status ? {status} : {};

    this.model.joinFind(query).then((merchants: any[]) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: Code.SUCCESS,
        data: merchants 
      }));
    });
  }

  gv1_get(req: Request, res: Response) {
    const id = req.params.id;
    this.model.getById(id).then(merchant => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: merchant ? Code.SUCCESS : Code.FAIL,
        data: merchant 
      }));
    });
  }

  // myLocalTime --- eg. '2020-04-23T10-09-00'
  gv1_getDeliverySchedule(req: Request, res: Response) {
    const myLocalTime: any = req.query.dt;
    const merchantId: any = req.query.merchantId;
    const lat = +req.query.lat;
    const lng = +req.query.lng;

    this.model.getDeliverSchedule(myLocalTime, merchantId, lat, lng).then((schedules: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: schedules ? Code.SUCCESS : Code.FAIL,
        data: schedules 
      }));
    });
  }

  gv1_getAvailableMerchants(req: Request, res: Response) {
    const lat = +req.query.lat;
    const lng = +req.query.lng;
    const status: any = req.query.status;
    this.model.getAvailableMerchants(lat, lng, status).then((ms: any[]) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: ms ? Code.SUCCESS : Code.FAIL,
        data: ms 
      }));
    });
  }



};
import express, {Request, Response} from "express";

import { DB } from "../db";
import { Account, AccountAttribute, IAccount } from "../models/account";
import { MerchantStuff } from "../merchant-stuff";
import { Utils } from "../utils";
import { Config } from "../config";
import { Model } from "../models/model";
import { Controller, Code } from "./controller";
import { ObjectID } from "mongodb";
import { Area, AppType, IArea } from "../models/area";

export class AreaController extends Controller{
  model: Area;
  constructor(model: Area, db: DB) {
    super(model, db);
    this.model = model;
  }

  getNearest(req: Request, res: Response) {
    const origin = req.body.origin;
    this.model.getNearestArea(origin).then((area: IArea) => {
      res.setHeader('Content-Type', 'application/json');
      if (!area) {
        res.send(JSON.stringify({ status: 'fail', area: '' }, null, 3));
      } else {
        res.send(JSON.stringify({ status: 'success', area: area }, null, 3));
      }
    });
  }

  reqMyArea(req: Request, res: Response) {
    let data;
    let fields;
    if (req.headers) {
      if (req.headers.data && typeof req.headers.data === 'string') {
        data = JSON.parse(req.headers.data);
      }

      if (req.headers.fields && typeof req.headers.fields === 'string') {
        fields = JSON.parse(req.headers.fields);
      }
    }
    this.model.getMyArea(data.location, AppType.GROCERY).then(area => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(area, null, 3));
    });
  }

  quickFind(req: Request, res: Response) {
    let query: any = {};
    let fields;
    if (req.headers && req.headers.filter && typeof req.headers.filter === 'string') {
      query = (req.headers && req.headers.filter) ? JSON.parse(req.headers.filter) : null;
    }

    if (req.headers.fields && typeof req.headers.fields === 'string') {
      fields = JSON.parse(req.headers.fields);
    }

    this.model.find(query, null, fields).then((x: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(x, null, 3));
    });
  }


  gv1_getMyArea(req: Request, res: Response) {
    const lat : any = req.query.lat;
    const lng : any = req.query.lng;
    this.model.getMyArea({lat, lng}, AppType.GROCERY).then(area => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: area ? Code.SUCCESS : Code.FAIL,
        data: area 
      }));
    });
  }

  
  gv1_list(req: Request, res: Response) {
    const status = req.query.status;
    const appType = AppType.GROCERY;
    const query = status ? {status, appType} : {appType};

    this.model.find(query).then((areas) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: Code.SUCCESS,
        data: areas 
      }));
    });
  }
};
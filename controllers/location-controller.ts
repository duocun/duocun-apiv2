import {Request, Response}from "express";
import { DB } from "../db";
import { Location, IGooglePlace, IAddress } from "../models/location";
import { Controller, Code } from "./controller";

import path from 'path';
import { getLogger } from '../lib/logger'

const logger = getLogger(path.basename(__filename));

export class LocationController extends Controller {
  model: Location;

  constructor(model: Location, db: DB) {
    super(model, db);
    this.model = model;
  }

  // for display, when select address should call getLocation
  async getSuggestAddressList(req: Request, res: Response) {
    const keyword = req.params.keyword;
    const rs: IGooglePlace[] = await this.model.getSuggestPlaces(keyword);
    const addresses: IAddress[] = this.model.googlePlacesToAddressList(rs);
    res.setHeader('Content-Type', 'application/json');
    res.send({
      code: Code.SUCCESS,
      data: addresses 
    });
  }

  async getLocationByAddress(req: Request, res: Response) {
    const addr = req.params.address;
    const r = await this.model.getLocationByAddress(addr);
    res.setHeader('Content-Type', 'application/json');
    res.send({
      code: Code.SUCCESS,
      data: r
    });
  }

  // getPlaceList(req: Request, res: Response) {
  //   const keyword = req.params.input;
  //   this.model.getSuggestPlaces(keyword).then((rs: IGooglePlace[]) => {
  //     // res.send(rs);
  //     res.send(JSON.stringify({
  //       code: Code.SUCCESS,
  //       data: rs 
  //     }));
  //   });
  // }

  async upsertOne(req: Request, res: Response) {
    const query = req.body.query;
    const data = req.body.data;

    if(data.location){
      data.address = this.model.getAddrString(data.location);
    }
    const result = await this.model.updateOne(query, data, { upsert: true }); // {n: 1, nModified: 0, ok: 1}
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(result, null, 3));
  }

  async list(req: Request, res: Response):Promise<void> { 
    const where: any = req.query.where;
    const options: any = req.query.options;
    let data:any[] = [];
    let count:number = 0;
    let code = Code.FAIL;
    try {
      if(where){
        const r = await this.model.find_v2(where, options)
        code = Code.SUCCESS;
        data = r.data;
        count = r.count;
      } else{
        const r = await this.model.find_v2({}, options)
        code = Code.SUCCESS;
        data = r.data;
        count = r.count;
      }
      res.setHeader('Content-Type', 'application/json'); 
      res.send({
        code: code,
        data: data,
        count: count
      });
    } catch (error) {
      console.log(`list error: ${error.message}`);
      logger.error(`list error: ${error}`);
    }
  }

  async getLocationsByAccount(req: Request, res: Response) {
    const accountId = req.params.accountId;
    res.setHeader('Content-Type', 'application/json');
    if(accountId){
      const locations = await this.model.find({accountId});
      res.send({
        code: Code.SUCCESS,
        data: locations 
      });
    }else{
      res.send({
        code: Code.FAIL,
        data: []
      });
    }
  }
}
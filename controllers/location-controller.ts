import {Request, Response}from "express";
import { DB } from "../db";
import { Location, IGooglePlace } from "../models/location";
import { Controller, Code } from "./controller";


export class LocationController extends Controller {
  model: Location;

  constructor(model: Location, db: DB) {
    super(model, db);
    this.model = model;
  }

  getGeocodeList(req: Request, res: Response) {
    const addr = req.params.address;

    this.model.getGeocodes(addr).then(rs => {
      // res.send(rs);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: Code.SUCCESS,
        data: rs 
      }));
    });
  }

  getPlaceList(req: Request, res: Response) {
    const keyword = req.params.input;
    this.model.getSuggestPlaces(keyword).then((rs: IGooglePlace[]) => {
      // res.send(rs);
      res.send(JSON.stringify({
        code: Code.SUCCESS,
        data: rs 
      }));
    });
  }

  gv1_list(req: Request, res: Response) {
    const accountId = req.params.accountId;
    res.setHeader('Content-Type', 'application/json');
    if(accountId){
      this.model.find({accountId}).then((locations) => {
        res.send(JSON.stringify({
          code: Code.SUCCESS,
          data: locations 
        }));
      });
    }else{
      res.send(JSON.stringify({
        code: Code.FAIL,
        data: []
      }));
    }
  }
}
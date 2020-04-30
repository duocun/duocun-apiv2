import { Request, Response } from "express";
import moment from "moment";
import { DB } from "../db";
import { MerchantSchedule } from "../models/merchant-schedule";
import { Controller, Code } from "./controller";

export class MerchantScheduleController extends Controller {
  model: MerchantSchedule;
  constructor(model: MerchantSchedule, db: DB) {
    super(model, db);
    this.model = model;
  }

  createOrUpdate(req: Request, res: Response) {
    const self = this;
    const data = req.body;
    this.model.createOrUpdate(data).then(() => {
      setTimeout(() => {
        self.model.find({}).then(ms => {
          res.send(JSON.stringify(ms, null, 3));
        });
      }, 500);
    });
  }

  getAvailableSchedules(req: Request, res: Response) {
    const merchantId: any = req.query.merchantId;
    const lat = +req.query.lat;
    const lng = +req.query.lng;
    merchantId ? 
    this.model.getAvailables(merchantId, lat, lng).then(mss =>{
      res.send(JSON.stringify({
        code: Code.SUCCESS,
        data: mss 
      }));
    })
    :
    res.send(JSON.stringify({
      code: Code.FAIL,
      data: []
    }));
  }

}
import {Request, Response} from "express";
import { Model } from "../models/model";
import { DB } from "../db";

export const Code = {
  SUCCESS: 'success',
  FAIL: 'fail'
}

export class Controller {
  public model: Model;
  public db: DB;
  constructor(model: any, db: DB) {
    this.model = model;
    this.db = db;
  }

  list(req: Request, res: Response) {
    const where: any = req.query.where;
    const options: any = req.query.options;
    this.model.find_v2(where, options).then((r: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: Code.SUCCESS,
        data: r.data,
        count: r.count 
      }));
    });
  }

  get(req: Request, res: Response) {
    const id = req.params.id;
    this.model.getById(id).then(data => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: data ? Code.SUCCESS : Code.FAIL,
        data: data 
      }));
    });
  }

}
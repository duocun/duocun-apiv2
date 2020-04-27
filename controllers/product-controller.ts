import { Request, Response } from "express";
import { DB } from "../db";
import { Product } from "../models/product";
import { Controller, Code } from "./controller";

export class ProductController extends Controller{
  model: Product;
  constructor(model: Product, db: DB) {
    super(model, db);
    this.model = model;
  }

  gv1_list(req: Request, res: Response) {
    const status = req.query.status;
    const merchantId = req.query.merchantId;
    const query = status ? {status} : {};
    res.setHeader('Content-Type', 'application/json');

    merchantId ? 
    this.model.joinFind({...query, merchantId}).then((products: any[]) => {
      res.send(JSON.stringify({
        code: Code.SUCCESS,
        data: products 
      }));
    })
    :
    res.send(JSON.stringify({
      code: Code.FAIL,
      data: [] 
    }));
  }

  gv1_get(req: Request, res: Response) {
    const id = req.params.id;
    this.model.getById(id).then(product => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: product ? Code.SUCCESS : Code.FAIL,
        data: product 
      }));
    });
  }


  av1_list(req: Request, res: Response) {
    const where: any= req.query.where; // query:"{"where":{},"options":{"limit":10,"skip":0,"sort":[["_id",1]]}}"
    const options: any = req.query.options;
    const query = {...where, taxRate: 0};
    res.setHeader('Content-Type', 'application/json');
    this.model.find_v2(query, options).then((r: any) => {
      res.send(JSON.stringify({
        code: Code.SUCCESS,
        count: r.count,
        data: r.data 
      }));
    });
  }
}

import express from "express";
import { DB } from "../db";
import { Order, IOrder, OrderStatus } from "../models/order";
import { Request, Response } from "express";
import { Controller, Code } from "./controller";
import { Tool } from "../models/tool";
import { getLogger } from "../lib/logger";
import path from "path";
const logger = getLogger(path.basename(__filename));

export class ToolController {
  model: Tool;
  constructor(db: DB) {
    // super(model, db);
    this.model = new Tool(db);
  }

  exportRevenue(req: Request, res: Response) {
    const path = './uploads/revenue.csv';
    const startCreatedDate: any = req.query.startCreatedDate; // '2019-09-02'
    const endCreatedDate: any = req.query.endCreatedDate; // '2020-06-30'
    this.model.getRevenueCSV(path, startCreatedDate, endCreatedDate).then(() => {
      res.setHeader("Content-Type", "application/json");
      res.send({
        code: Code.SUCCESS,
        data: 1,
      });
    });
  }

  updateBalances(req: Request, res: Response) {
    // const phone = req.body.phone;
    // this.toolModel.updateBalances().then((r: any) => {
    //   res.setHeader('Content-Type', 'application/json');
    //   res.send(JSON.stringify(r, null, 3));
    // });
  }
}
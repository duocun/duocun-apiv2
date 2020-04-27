import { Request, Response } from "express";
import { Transaction } from "../models/transaction";
import { Model, Code } from "../models/model";
import { DB } from "../db";

export class TransactionController extends Model {
  model: Transaction;
  constructor(db: DB) {
    super(db, 'transactions');
    this.model = new Transaction(db);
  }

  list(req: Request, res: Response) {
    const where: any = req.query.where;
    const options: any = req.query.options;

    res.setHeader('Content-Type', 'application/json');
    this.model.find_v2(where, options).then((r: any) => {
      res.send(JSON.stringify({
        code: Code.SUCCESS,
        count: r.count,
        data: r.data
      }));
    });
  }
}
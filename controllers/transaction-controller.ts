import { Request, Response } from "express";
import { Transaction } from "../models/transaction";
import { DB } from "../db";
import { Controller, Code } from "./controller";

import path from 'path';
import { getLogger } from '../lib/logger'
const logger = getLogger(path.basename(__filename));

export class TransactionController extends Controller {
  model: Transaction;
  constructor(model: Transaction, db: DB) {
    super(model, db);
    this.model = model;
  }

  async create(req: Request, res: Response) {
    const tr = req.body;
    let data: any = null;
    let code = Code.FAIL;
    try {
      const savedTr = await this.model.doInsertOne(tr);
      code = Code.SUCCESS;
      data = savedTr;
    } catch (error) {
      logger.error(`list error: ${error}`);
    } finally {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: code,
        data: data
      }));
    }
  }

  async recalculate(req: Request, res: Response) {
    const accountId: any = req.query.accountId;
    res.setHeader('Content-Type', 'application/json');
    let code = Code.FAIL;
    let data = null;

    if (accountId) {
      try {
        const r = await this.model.updateBalance(accountId);
        code = Code.SUCCESS;
        data = r;
      } catch (e) {
        logger.error(`$(e)`);
      } finally {
        res.send({
          code,
          data
        })
      }
    } else {
      res.send({
        code,
        data
      })
    }
  }
}
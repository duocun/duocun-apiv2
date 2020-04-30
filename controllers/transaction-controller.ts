import { Request, Response } from "express";
import { Transaction } from "../models/transaction";
import { DB } from "../db";
import { Controller } from "./controller";

export class TransactionController extends Controller {
  model: Transaction;
  constructor(model: Transaction, db: DB) {
    super(model, db);
    this.model = model;
  }

}
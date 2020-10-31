import { Request, Response } from "express";
import fs from "fs";
import moment from 'moment';
import { ObjectID } from "mongodb";
import { createObjectCsvWriter } from 'csv-writer';

import { DB } from "../db";
import { ILocation } from "./location";
import { OrderSequence } from "./order-sequence";
import { Merchant, IPhase, IMerchant, IDbMerchant } from "./merchant";
import { Account, IAccount } from "./account";
import { Transaction, ITransaction, TransactionAction } from "./transaction";
import { Product, IProduct } from "./product";
import { CellApplication, CellApplicationStatus, ICellApplication } from "./cell-application";
import { Log } from "./log";
import { ClientCredit } from "./client-credit";
import { EventLog } from "./event-log";
import { PaymentAction } from "./client-payment";
import { resolve } from "path";
import { PaymentMethod, OrderStatus, Order } from "../models/order";
import { DateTime } from "../models/date-time";

const CASH_ID = '5c9511bb0851a5096e044d10';
const CASH_NAME = 'Cash';
const BANK_ID = '5c95019e0851a5096e044d0c';
const BANK_NAME = 'TD Bank';

const CASH_BANK_ID = '5c9511bb0851a5096e044d10';
const CASH_BANK_NAME = 'Cash Bank';
const TD_BANK_ID = '5c95019e0851a5096e044d0c';
const TD_BANK_NAME = 'TD Bank';
const SNAPPAY_BANK_ID = '5e60139810cc1f34dea85349';
const SNAPPAY_BANK_NAME = 'SnapPay Bank';

export class Tool {
  private productModel: Product;
  private sequenceModel: OrderSequence;
  private merchantModel: Merchant;
  private accountModel: Account;
  private transactionModel: Transaction;
  private cellApplicationModel: CellApplication;
  private orderModel: Order;
  clientCreditModel: ClientCredit;
  eventLogModel: EventLog;

  constructor(dbo: DB) {
    this.productModel = new Product(dbo);
    this.orderModel = new Order(dbo);
    this.sequenceModel = new OrderSequence(dbo);
    this.merchantModel = new Merchant(dbo);
    this.accountModel = new Account(dbo);
    this.transactionModel = new Transaction(dbo);
    this.cellApplicationModel = new CellApplication(dbo);
    this.clientCreditModel = new ClientCredit(dbo);
    this.eventLogModel = new EventLog(dbo);
  }

  updateBalances() {
    const self = this;
    return new Promise((resolve, reject) => {
      // this.accountModel.find({}, null, ['_id']).then(accounts => {
      //   const accountIds = accounts.map(account => account._id.toString());
      //   this.updateBalanceList(accountIds).then(n => {
      //     res.setHeader('Content-Type', 'application/json');
      //     res.send(JSON.stringify('success update ' + n + 'accounts', null, 3));
      //   });
      // });
    });
  }


  getRevenueDetail(order: any) {
    const a: any = [];
    let priceHasHst = 0;
    let priceNoHst = 0;
    let hst = 0;
    let total = 0;
    // const total = Math.round(order.total * 100) / 100;

    order.items.forEach((it: any) => {
      const taxRate = it.taxRate ? it.taxRate : 0;
      const name = it.productNameEN ? it.productNameEN : it.productName;
      a.push(`${name} x ${it.quantity}`);
      
      if(taxRate === 0){
        const base = Math.round(it.price * 100 ) / 100;
        priceNoHst += base;
        total += base;
      }else{
        const base = Math.round(it.price / (100 + taxRate) * 10000 ) / 100;
        const tax = Math.round(it.price / (100 + taxRate) * taxRate * 100 ) / 100;
        priceHasHst += base;
        hst += tax;
        total += Math.round(it.price * 100) / 100;
      }
    })

    const items = a.join(', ');
    return {description: `${order.clientName} buy ${items}`, priceNoHst, priceHasHst, hst, total };
  }

  // path --- csv saved path '../a.csv';
  async getRevenueCSV(path: string, startCreatedDate: string, endCreatedDate: string) {
    const dt = new DateTime();
    const start = dt.getMomentFromUtc(`${startCreatedDate}T00:00:00.000Z`).toISOString();
    const end = dt.getMomentFromUtc(`${endCreatedDate}T00:00:00.000Z`).toISOString();

    const q = {
      paymentMethod: {
        $in: [
          PaymentMethod.WECHAT,
          PaymentMethod.CREDIT_CARD
        ]
      },
      status: {
        $nin: [
          OrderStatus.BAD,
          OrderStatus.DELETED,
          OrderStatus.TEMP
        ]
      },
      created: {$gte: start, $lte: end}
    };

    const {data, count} = await this.orderModel.joinFindV2(q);
    let i = 1;
    const list: any[] = [];
    data.forEach((order: any) => {
      const date = dt.getMomentFromUtc(order.created).format('YYYY-MM-DD');
      if ((+order.total) >= 1 && date) {
        const id = 'RT000' + i;
        i++;
        const detail = this.getRevenueDetail(order);
        list.push({ date, id, ...detail });
      }
    });

    const cw = createObjectCsvWriter({
      path,
      header: [
        { id: 'date', title: 'Invoice Date' },
        { id: 'id', title: 'Invoice #' },
        { id: 'description', title: 'Description' },
        { id: 'priceNoHst', title: 'Sale no Hst' },
        { id: 'priceHasHst', title: 'Sale has Hst' },
        { id: 'hst', title: 'Hst' },
        { id: 'total', title: 'Total' },
      ]
    });

    if (list) {
      await cw.writeRecords(list);
    }
    return data;
  }
}
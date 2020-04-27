
import { Request, Response } from "express";
import { DB } from "../db";
import { ClientPayment } from "../models/client-payment";
import { Controller, Code } from "./controller";

const SNAPPAY_BANK_ID = "5e60139810cc1f34dea85349";
const SNAPPAY_BANK_NAME = "SnapPay Bank";

export class ClientPaymentController extends Controller {
  model: ClientPayment;

  constructor(model:ClientPayment, db: DB) {
    super(model, db);
    this.model = model;
  }

  // input --- appCode, accountId, amount
  payBySnappay(req: Request, res: Response) {
    const appCode = req.body.appCode;
    // const orders = req.body.orders;
    const paymentActionCode = req.body.paymentActionCode;
    const paymentId = req.body.paymentId;
    const merchantNames = req.body.merchantNames;
    const accountId = req.body.accountId;
    const returnUrl = req.body.returnUrl;
    const amount = Math.round(+req.body.amount * 100) / 100;
    

    res.setHeader("Content-Type", "application/json");
    this.model.payBySnappay(paymentActionCode, appCode, accountId, amount, returnUrl, paymentId, merchantNames).then((r: any) => {
      res.send(JSON.stringify(r, null, 3)); // IPaymentResponse
    });
  }

  gv1_payBySnappay(req: Request, res: Response) {
    const appCode = req.body.appCode;
    // const orders = req.body.orders;
    const paymentActionCode = req.body.paymentActionCode;
    const paymentId = req.body.paymentId;
    const merchantNames = req.body.merchantNames;
    const accountId = req.body.accountId;
    const returnUrl = req.body.returnUrl;
    const amount = Math.round(+req.body.amount * 100) / 100;
    

    res.setHeader("Content-Type", "application/json");
    this.model.payBySnappay(paymentActionCode, appCode, accountId, amount, returnUrl, paymentId, merchantNames).then((r: any) => {
      res.send(JSON.stringify(
        {code: r ? Code.SUCCESS : Code.FAIL,
          data: r,
         }
    
        )); // IPaymentResponse
    });
  }

  // This request could response multiple times !!!
  // return rsp: IPaymentResponse
  snappayNotify(req: Request, res: Response) {
    const rsp = req.body;
    // console.log('snappayNotify trans_status:' + b.trans_status);
    // console.log('snappayNotify trans_no:' + b.trans_no);
    // console.log('snappayNotify out_order_no' + b.out_order_no);
    // console.log('snappayNotify customer_paid_amount' + b.customer_paid_amount);
    // console.log('snappayNotify trans_amount' + b.trans_amount);
    const amount = Math.round(+req.body.trans_amount * 100) / 100;
    const paymentId = rsp ? rsp.out_order_no : "";
    const accountId = SNAPPAY_BANK_ID;
    const message = "paymentId:" + paymentId + ", msg:" + JSON.stringify(req.body);
    this.model.addLogToDB(accountId, 'snappay notify', '', message).then(() => { });

    if (rsp && rsp.trans_status === "SUCCESS") {
      this.model.processSnappayNotify(paymentId, amount).then(() => {
        res.setHeader("Content-Type", "application/json");
        res.send({ code: "0" }); // must return as snappay gateway required
      });
    }
  }

  payByStripe(req: Request, res: Response) {
    // const appType = req.body.appType;
    const paymentActionCode = req.body.paymentActionCode;
    const paymentMethodId = req.body.paymentMethodId;
    const paymentId = req.body.paymentId;
    const merchantNames = req.body.merchantNames
    const accountId = req.body.accountId;
    const accountName = req.body.accountName;
    const note = req.body.note;
    let amount = +req.body.amount;

    res.setHeader("Content-Type", "application/json");
    this.model.payByStripe(paymentActionCode, paymentMethodId, accountId, accountName, amount, note, paymentId, merchantNames).then((rsp: any) => {
      res.send(JSON.stringify(rsp, null, 3)); // IPaymentResponse
    });
  }

  gv1_payByStripe(req: Request, res: Response) {
    // const appType = req.body.appType;
    const paymentActionCode = req.body.paymentActionCode;
    const paymentMethodId = req.body.paymentMethodId;
    const paymentId = req.body.paymentId;
    const merchantNames = req.body.merchantNames
    const accountId = req.body.accountId;
    const accountName = req.body.accountName;
    const note = req.body.note;
    let amount = +req.body.amount;

    res.setHeader("Content-Type", "application/json");
    this.model.payByStripe(paymentActionCode, paymentMethodId, accountId, accountName, amount, note, paymentId, merchantNames).then((rsp: any) => {
      res.send(JSON.stringify({
        code: rsp ? Code.SUCCESS : Code.FAIL,
        data: rsp,
      })); // IPaymentResponse
    });
  }
}

import express, { Request, Response } from "express";

import { DB } from "../db";
import { ClientPayment } from "../models/client-payment";
import { ClientPaymentController } from "../controllers/client-payment-controller";
import { parseQuery } from "../middlewares/parseQuery";

const SNAPPAY_BANK_ID = "5e60139810cc1f34dea85349";
const SNAPPAY_BANK_NAME = "SnapPay Bank";

export function ClientPaymentRouter(db: DB) {
  const router = express.Router();
  const model = new ClientPayment(db);
  const controller = new ClientPaymentController(model, db);

  //yaml api
  router.post('/snappay', (req, res) => { controller.gv1_payBySnappay(req, res) });
  router.post('/stripe', (req, res) => { controller.gv1_payByStripe(req, res); });


  // snappy related endpoints
  // https://localhost:8000/api/ClientPayments/payBySnappay

  // public endpoint
  // description: if orders > 0 it means buy goods, if orders == null it means add credit
  // Input:
  // paymentActionCode --- [string] 'P' for purchase good, 'A' for add credit
  // appCode --- [number], 123 for Grocery, 122 for Food Delivery
  // accountId --- [string] client account Id;
  // amount --- [number] payable = purchase amount - balance
  // returnUrl --- [string]
  // paymentId --- [string]     (optional for add credit)
  // merchantNames --- [string[]]  (optional for add credit)
  // Return: {err, {url}}, then wait snappy post notify 
  router.post('/payBySnappay', (req, res) => { controller.payBySnappay(req, res) });

  // private 
  router.post('/notify', (req, res) => { controller.snappayNotify(req, res); });


  // admin api
  router.get('/', [parseQuery], (req: Request, res: Response) =>  { model.list(req, res); });
  router.get('/:id', (req, res) => { model.get(req, res); });

  // old api

  // stripe related endpoints
  // public
  // description: if orders > 0 it means buy goods, if orders == null it means add credit

  // Input:
  // paymentActionCode --- [string] 'P' for purchase good, 'A' for add credit
  // paymentMethodId = [string] get from stripe;
  // accountId --- [string] client account Id;
  // accountName --- [string]
  // amount --- [number] client payable
  // note --- [string]
  // paymentId --- [string]     (optional for add credit)
  // merchantNames --- [string[]]  (optional for add credit)
  // Return: None
  router.post('/payByCreditCard', (req, res) => { controller.payByStripe(req, res); });

  // v1 api
  // router.post('/payByCreditCard', (req, res) => { model.payByCreditCard(req, res); });
  // router.post('/payBySnappay', (req, res) => { model.payBySnappay(req, res) });
  // router.get('/hello', (req, res) => { model.hello(req, res) });
  // router.get('/session', (req, res) => {model.createStripeSession(req, res); });
  // router.post('/checkout', (req, res) => {model.checkout(req, res); });

  // deprecated
  // router.post('/stripeAddCredit', (req, res) => {model.stripeAddCredit(req, res); });
  // router.post('/stripRefund', (req, res) => {model.stripeRefund(req, res); });

  // router.post('/snappayRefund', (req, res) => {model.snappayRefund(req, res); });


  // router.post('/addGroupDiscount', (req, res) => { model.reqAddGroupDiscount(req, res); });
  // router.post('/removeGroupDiscount', (req, res) => { model.reqRemoveGroupDiscount(req, res); });



  // router.post('/', (req, res) => { model.createAndUpdateBalance(req, res); });
  router.put('/', (req, res) => { model.replace(req, res); });
  router.patch('/', (req, res) => { model.update(req, res); });
  router.delete('/', (req, res) => { model.remove(req, res); });


  return router;
};




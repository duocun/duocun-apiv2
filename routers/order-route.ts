import express, {Request, Response} from "express";
import { DB } from "../db";
import { Order } from "../models/order";
import { OrderController } from "../controllers/order-controller";
import { parseQuery } from "../middlewares/parseQuery";

export function OrderRouter(db: DB) {
  const router = express.Router();
  const model = new Order(db);
  const controller = new OrderController(model, db);

  // grocery
  router.post('/bulk', (req, res) => { controller.placeOrders(req, res); });

  // admin
  router.get('/bad', (req, res) => { controller.getBadOrder(req, res); });
  router.get('/markers', (req, res) => { controller.getMapMarkers(req, res); });

  router.post('/', (req, res) => { controller.create(req, res); });
  router.put('/:id', (req, res) => { controller.updateOne(req, res); });
  router.delete('/:id', (req, res) => { controller.removeOrder(req, res); });

  router.get('/bulkPhones/:year', (req, res) => { controller.updateOrderPhone(req, res)});

  router.post('/', (req, res) => { controller.create(req, res); });
  
  // support ?query={where, options}
  router.get('/', [parseQuery], (req: Request, res: Response) => { controller.list(req, res); });
  router.get('/:id', (req, res) => { controller.get(req, res); });

  // old api
  router.get('/v2/transactions', (req, res) => { model.reqTransactions(req, res); });

  // Public
  // input:
  //  orders --- [ IOrders[] ], without _id and paymentId
  // return:
  //  orders ---- [IOrders[]],  new orders with _id and paymentId  
  router.post('/placeOrders', (req, res) => { model.reqPlaceOrders(req, res); });

  // tools
  // router.post('/missingWechatpayments', (req, res) => { model.reqMissingWechatPayments(req, res); });
  // router.post('/missingPaid', (req, res) => { model.reqFixMissingPaid(req, res); });
  // router.post('/missingUnpaid', (req, res) => { model.reqFixMissingUnpaid(req, res); });

  router.get('/v2/correctTime', (req, res) => { model.reqCorrectTime(req, res); });

  router.get('/history/:currentPageNumber/:itemsPerPage', (req, res) => { controller.loadHistory(req, res); });
  router.get('/loadPage/:currentPageNumber/:itemsPerPage', (req, res) => { controller.loadPage(req, res); });
  // v1
  router.get('/csv', (req, res) => { model.reqCSV(req, res); });
  router.get('/clients', (req, res) => { model.reqClients(req, res); });
  router.get('/statisticsByClient', (req, res) => { model.reqStatisticsByClient(req, res); });
  router.get('/latestViewed', (req, res) => { model.reqLatestViewed(req, res); });
  
  router.get('/qFind', (req, res) => { model.quickFind(req, res); });

  router.put('/updatePurchaseTag', (req, res) => { model.updatePurchaseTag(req, res) });

  router.post('/checkStripePay', (req, res) => { model.checkStripePay(req, res); });
  router.post('/checkWechatpay', (req, res) => { model.checkWechatpay(req, res); });

  //
  router.post('/payOrder', (req, res) => { model.payOrder(req, res); });



  // deprecated
  // router.post('/afterRemoveOrder', (req, res) => { model.afterRemoveOrder(req, res); });

  router.patch('/fixCancelledTransaction', (req, res) => { model.fixCancelledTransaction(req, res); });
  router.patch('/updateDelivered', (req, res) => { model.updateDeliveryTime(req, res); });

  router.delete('/', (req, res) => { model.remove(req, res); });
  

  // router.post('/checkGroupDiscount', (req, res) => { model.checkGroupDiscount(req, res); });


  return router;
};


import express, {Request, Response} from "express";
import { DB } from "../db";
import { Assignment } from "../models/assignment";
import { AssignmentController } from "../controllers/assignment-controller";
import { parseQuery } from "../middlewares/parseQuery";

export function AssignmentRouter(db: DB) {
  const router = express.Router();
  const model = new Assignment(db);
  const controller = new AssignmentController(db);

  router.put('/', (req, res) => { controller.assign(req, res); });
  router.get('/', [parseQuery], (req: Request, res: Response) => { controller.list(req, res); });
  // grocery
//   router.post('/bulk', (req, res) => { controller.placeAssignments(req, res); });

//   // admin
//   router.get('/bad', (req, res) => { controller.getBadAssignment(req, res); });
//   router.get('/routes', [parseQuery], (req: Request, res: Response) => { controller.getRoutes(req, res); });
//   router.get('/duplicates', (req, res) => { controller.getClientWithDuplicatedAssignments(req, res)});


//   router.put('/cancelItems/:id', (req, res) => { controller.cancelItems(req, res); });
//   router.put('/splitAssignment/:id', (req, res) => { controller.splitAssignment(req, res); });

  

//   router.post('/', (req, res) => { controller.create(req, res); });
//   router.put('/:id', (req, res) => { controller.updateOne(req, res); });
//   router.delete('/:id', (req, res) => { controller.removeAssignment(req, res); });

//   router.get('/bulkPhones/:year', (req, res) => { controller.updateAssignmentPhone(req, res)});
  
//   // support ?query={where, options}
//   router.get('/', [parseQuery], (req: Request, res: Response) => { controller.list(req, res); });
//   router.get('/:id', (req, res) => { controller.get(req, res); });

//   // old api
//   router.get('/v2/transactions', (req, res) => { model.reqTransactions(req, res); });

//   // Public
//   // input:
//   //  orders --- [ IAssignments[] ], without _id and paymentId
//   // return:
//   //  orders ---- [IAssignments[]],  new orders with _id and paymentId  
//   router.post('/placeAssignments', (req, res) => { model.reqPlaceAssignments(req, res); });

//   // tools
//   // router.post('/missingWechatpayments', (req, res) => { model.reqMissingWechatPayments(req, res); });
//   // router.post('/missingPaid', (req, res) => { model.reqFixMissingPaid(req, res); });
//   // router.post('/missingUnpaid', (req, res) => { model.reqFixMissingUnpaid(req, res); });

//   router.get('/v2/correctTime', (req, res) => { model.reqCorrectTime(req, res); });

//   router.get('/history/:currentPageNumber/:itemsPerPage', (req, res) => { controller.loadHistory(req, res); });
//   router.get('/loadPage/:currentPageNumber/:itemsPerPage', (req, res) => { controller.loadPage(req, res); });
//   // v1
//   router.get('/csv', (req, res) => { model.reqCSV(req, res); });
//   router.get('/clients', (req, res) => { model.reqClients(req, res); });
//   router.get('/statisticsByClient', (req, res) => { model.reqStatisticsByClient(req, res); });
//   router.get('/latestViewed', (req, res) => { model.reqLatestViewed(req, res); });
  
//   router.get('/qFind', (req, res) => { model.quickFind(req, res); });

//   router.put('/updatePurchaseTag', (req, res) => { model.updatePurchaseTag(req, res) });

//   router.post('/checkStripePay', (req, res) => { model.checkStripePay(req, res); });
//   router.post('/checkWechatpay', (req, res) => { model.checkWechatpay(req, res); });

//   //
//   router.post('/payAssignment', (req, res) => { model.payAssignment(req, res); });



//   // deprecated
//   // router.post('/afterRemoveAssignment', (req, res) => { model.afterRemoveAssignment(req, res); });

//   router.patch('/fixCancelledTransaction', (req, res) => { model.fixCancelledTransaction(req, res); });
//   router.patch('/updateDelivered', (req, res) => { model.updateDeliveryTime(req, res); });

//   router.delete('/', (req, res) => { model.remove(req, res); });
  

  // router.post('/checkGroupDiscount', (req, res) => { model.checkGroupDiscount(req, res); });


  return router;
};




import express, { Request, Response }  from "express";
import { DB } from "../db";
import { Transaction } from "../models/transaction";
import { TransactionController } from "../controllers/transaction-controller";
import { parseQuery } from "../middlewares/parseQuery";

export function TransactionRouter(db: DB){
  const router = express.Router();
  const model = new Transaction(db);
  const controller = new TransactionController(model, db);

  // admin api

  // api/admin/transactions?query={where:xxx,options:{"limit":10,"skip":0,"sort":[["_id",1]]}}
  router.get('/', [parseQuery], (req: Request, res: Response) => { controller.list(req, res); });
  router.get('/:id', (req, res) => { controller.get(req, res); });

  // old api
  router.get('/getMerchantBalance', (req, res) => { model.getMerchantBalance(req, res); });
  router.get('/loadPage/:currentPageNumber/:itemsPerPage', (req, res) => { model.loadPage(req, res); });
  router.get('/sales', (req, res) => { model.getSales(req, res); });
  router.get('/cost', (req, res) => { model.getCost(req, res); });
  router.get('/merchantPay', (req, res) => { model.getMerchantPay(req, res); });
  router.get('/salary', (req, res) => { model.getSalary(req, res); });

  router.get('/qFind', (req, res) => { model.quickFind(req, res); });

  router.post('/', (req, res) => { model.create(req, res); });

  router.put('/', (req, res) => { model.replace(req, res); });

  // tools
  // admin tools
  router.patch('/updateAccount', (req, res) => { model.updateAccount(req, res); });
  router.patch('/updateBalances', (req, res) => { model.updateBalances(req, res); });
  // router.patch('/fixCancelTransactions', (req, res) => { model.fixCancelTransactions(req, res); });
  // router.patch('/changeAccount', (req, res) => { model.changeAccount(req, res); });
  router.patch('/', (req, res) => { model.update(req, res); });

  
  router.delete('/:id', (req, res) => { model.removeOne(req, res); });
  router.delete('/', (req, res) => { model.remove(req, res); });

  return router;
};



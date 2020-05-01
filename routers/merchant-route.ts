import express from "express";
import { Request, Response } from "express";
import moment from "moment";
import { DB } from "../db";
import { Merchant } from "../models/merchant";
import { parseQuery } from "../middlewares/parseQuery";
import { MerchantController } from "../controllers/merchant-controller";

export function MerchantRouter(db: DB){
  const router = express.Router();
  const model = new Merchant(db);
  const controller = new MerchantController(model, db);

  // grocery api
  router.get('/G/deliverSchedules', (req, res) => { controller.gv1_getDeliverySchedule(req, res); });
  router.get('/G/available', (req, res) => { controller.gv1_getAvailableMerchants(req, res); });
  router.get('/G/:id', (req, res) => { controller.gv1_get(req, res); });
  router.get('/G/', (req, res) => { controller.gv1_list(req, res); });

  // admin api
  router.get('/', [parseQuery], async (req: Request, res: Response) => { await controller.list(req, res); });
  router.get('/:id', async (req, res) => { await controller.get(req, res); });
  router.post('/', async (req, res) => { await controller.create(req, res); });

  // router.post('/', (req, res) => { controller.load(req, res); });
  // router.patch('/', (req, res) => { controller.load(req, res); });

  // old api
  router.get('/v2/myMerchants', (req, res) => { controller.gv1_getAvailableMerchants(req, res); });
  router.get('/v2/mySchedules', (req, res) => { controller.getMySchedules(req, res); })
  router.get('/getByAccountId', (req, res) => { controller.getByAccountId(req, res); });
  router.post('/load', (req, res) => { controller.load(req, res); });

  router.get('/qFind', (req, res) => { model.quickFind(req, res); });

  // v1
  // router.post('/', (req, res) => { model.create(req, res); });
  // router.put('/', (req, res) => { model.replace(req, res); });
  // router.patch('/', (req, res) => { model.update(req, res); });
  // router.delete('/', (req, res) => { model.remove(req, res); });

  return router;
}

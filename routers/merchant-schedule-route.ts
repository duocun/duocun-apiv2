import express, { Request, Response } from "express";
import { DB } from "../db";
import { MerchantSchedule } from "../models/merchant-schedule";
import { Model } from "../models/model";
import { Area, AppType } from "../models/area";
import { MerchantScheduleController } from "../controllers/merchant-schedule-controller";
import { parseQuery } from "../middlewares/parseQuery";

export function MerchantScheduleRouter(db: DB){
  const router = express.Router();
  const model = new MerchantSchedule(db);
  const controller = new MerchantScheduleController(model, db);

  // grocery api
  router.get('/G/', (req, res) => { controller.getAvailableSchedules(req, res); });

  // admin api
  router.get('/available', (req, res) => { controller.getAvailableSchedules(req, res); });
  router.get('/',[parseQuery], (req: Request, res: Response) =>  { controller.list(req, res); });
  router.get('/:id', (req, res) => { controller.get(req, res); });

  // old api
  router.patch('/cu', (req, res) => { controller.createOrUpdate(req, res); });
  router.get('/qFind', (req, res) => { model.quickFind(req, res); });
  


  
  router.post('/', (req, res) => { model.create(req, res); });

  router.put('/', (req, res) => { model.replace(req, res); });
  router.patch('/', (req, res) => { model.update(req, res); });
  router.delete('/', (req, res) => { model.remove(req, res); });

  return router;
};

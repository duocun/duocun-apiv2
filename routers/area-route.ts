import express from "express";
import { Area } from "../models/area";
import { DB } from "../db";
import { Request, Response } from "express";
import { AreaController } from "../controllers/area-controller";
import { parseQuery } from "../middlewares/parseQuery";

export function AreaRouter(db: DB){
  const router = express.Router();
  const model = new Area(db);
  const controller = new AreaController(model, db);

  // grocery api
  router.get('/G/', (req, res) => { controller.gv1_list(req, res); });
  router.get('/G/my', (req, res) => { controller.gv1_getMyArea(req, res); }); 

  // admin api
  router.get('/',  [parseQuery], (req: Request, res: Response) =>  { controller.list(req, res); });
  router.get('/:id', (req, res) => { controller.get(req, res); });

  // old api
  router.get('/my', (req, res) => { controller.reqMyArea(req, res); }); // fix me
  router.get('/qFind', (req, res) => { controller.quickFind(req, res); });

  router.post('/', (req, res) => { model.create(req, res); });
  router.patch('/', (req, res) => { model.update(req, res); });
  // fix me
  
  router.post('/nearest', (req, res) => {controller.getNearest(req, res); });
  
  // router.put('/', (req, res) => { controller.replace(req, res); });
  // router.delete('/', (req, res) => { controller.remove(req, res); });
  
  return router;
}
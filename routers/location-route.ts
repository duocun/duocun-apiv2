import express, {Request, Response} from "express";
import { DB } from "../db";
import { Location } from "../models/location";
import { LocationController } from "../controllers/location-controller";
import { parseQuery } from "../middlewares/parseQuery";

export function LocationRouter(db: DB){
  const router = express.Router();
  const model = new Location(db);
  const controller = new LocationController(model, db);
  
  // admin api
  router.get('/:address', (req, res) => { controller.getLocationByAddress(req, res); });
  router.get('/',[parseQuery], (req: Request, res: Response) => { controller.list(req, res); });
  router.get('/suggest/:keyword', (req, res) => { controller.getSuggestAddressList(req, res)});
  router.get('/history/:accountId', (req, res) => { controller.getLocationsByAccount(req, res); });
  router.put('/', (req, res) => { controller.upsertOne(req, res); });
  router.post('/', (req, res) => { controller.create(req, res); });

  return router;
};

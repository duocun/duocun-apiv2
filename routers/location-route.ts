import express, {Request, Response} from "express";
import { DB } from "../db";
import { Location, IGooglePlace } from "../models/location";
import { LocationController } from "../controllers/location-controller";
import { parseQuery } from "../middlewares/parseQuery";
export function LocationRouter(db: DB){
  const router = express.Router();
  const model = new Location(db);
  const controller = new LocationController(model, db);

  // grocery api
  router.get('/geocode/:address', (req, res) => { controller.getGeocodeList(req, res); });
  router.get('/place/:input', (req, res) => { controller.getPlaceList(req, res); });
  router.get('/history/:accountId', (req, res) => { controller.gv1_list(req, res); });

  // admin api
  router.get('/',[parseQuery], (req: Request, res: Response) =>   { model.list(req, res); });
  router.get('/:id', (req, res) => { model.get(req, res); });

  // old api
  router.get('/suggest/:keyword', (req, res) => { model.reqSuggestAddressList(req, res)});
  router.get('/history', (req, res) => { model.reqHistoryAddressList(req, res)});
  router.get('/query', (req, res) => { model.reqLocation(req, res)});

  router.get('/Places/:input', (req, res) => { model.reqPlaces(req, res); });
  router.get('/Geocodes/:address', (req, res) => { model.reqGeocodes(req, res); });

  router.post('/upsertOne', (req, res) => { model.upsertOne(req, res); });
  router.post('/', (req, res) => { model.create(req, res); });


  router.put('/updateLocations', (req, res) => { model.updateLocations(req, res)});
  router.put('/', (req, res) => { model.replace(req, res); });
  router.patch('/', (req, res) => { model.update(req, res); });
  router.delete('/', (req, res) => { model.remove(req, res); });

  return router;
};

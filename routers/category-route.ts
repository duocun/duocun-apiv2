import express, {Request, Response}from "express";
import { DB } from "../db";
import { Category } from "../models/category";
import { CategoryController} from "../controllers/category-controller";
import { parseQuery } from "../middlewares/parseQuery";

export function CategoryRouter(db: DB){
  const router = express.Router();
  const model = new Category(db);
  const controller = new CategoryController(model, db);

  // grocery api
  router.get('/G/root', (req, res) => { controller.gv1_list(req, res); });
  router.get('/G/', (req, res) => { controller.gv1_list(req, res); });
  router.get('/G/:id', (req, res) => { controller.gv1_getById(req, res); });
    // admin api
  router.get('/', [parseQuery], (req: Request, res: Response) => { controller.list(req, res); });
  router.get('/category-tree', (req: Request, res: Response) => { controller.getCategoryTree(req, res) });
  router.get('/:id', (req, res) => { controller.get(req, res); });

  // old api
  // router.get('/', (req, res) => { model.list(req, res); });
  router.post('/', (req, res) => { model.create(req, res); });
  router.put('/', (req, res) => { model.replace(req, res); });
  router.patch('/', (req, res) => { model.update(req, res); });
  router.delete('/', (req, res) => { model.remove(req, res); });

  return router;
};

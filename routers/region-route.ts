import express from "express";
import { Region } from "../models/region";
import { DB } from "../db";

export function RegionRouter(db: DB){
  const router = express.Router();
  const controller = new Region(db);


  router.get('/', (req, res) => { controller.list(req, res); });
  router.get('/:id', (req, res) => { controller.get(req, res); });
  router.post('/', (req, res) => { controller.create(req, res); });
  router.put('/', (req, res) => { controller.replace(req, res); });
  router.patch('/', (req, res) => { controller.update(req, res); });
  router.delete('/', (req, res) => { controller.remove(req, res); });

  return router;
};
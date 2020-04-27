import {Request, Response}from "express";
import { DB } from "../db";
import { Category } from "../models/category";
import { Controller, Code } from "./controller";

export class CategoryController extends Controller{
  model: Category;
  constructor(model: Category, db: DB) {
    super(model, db);

    this.model = model;
  }

  gv1_getById(req: Request, res: Response) {
    const id = req.params.id;
    this.model.getById(id).then(area => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: area ? Code.SUCCESS : Code.FAIL,
        data: area 
      }));
    });
  }

  gv1_list(req: Request, res: Response) {
    const status = req.query.status;
    const query = status ? {status} : {};

    this.model.find(query).then((categories) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: Code.SUCCESS,
        data: categories 
      }));
    });
  }
};
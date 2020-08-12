import { Request, Response } from "express";
import { DB } from "../db";
import { Category, CategoryInterface } from "../models/category";
import { Controller, Code } from "./controller";
import { treefy } from "../helpers/category-helper";
import { resource } from "../lib/rbac";
import { RESOURCES } from "../models/role";

@resource(RESOURCES.CATEGORY)
export class CategoryController extends Controller {
  model: Category;
  constructor(model: Category, db: DB) {
    super(model, db);

    this.model = model;
  }

  gv1_getById(req: Request, res: Response) {
    const id = req.params.id;
    this.model.getById(id).then((area) => {
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: area ? Code.SUCCESS : Code.FAIL,
          data: area,
        })
      );
    });
  }

  gv1_list(req: Request, res: Response) {
    const status = req.query.status;
    const query = status ? { status } : {};

    this.model.find(query).then((categories) => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: Code.SUCCESS,
          data: categories,
        })
      );
    });
  }

  getCategoryTree(req: Request, res: Response) {
    this.model
      .find({ status: "A" })
      .then((categories: Array<CategoryInterface>) => {
        res.json({
          code: Code.SUCCESS,
          data: treefy(categories),
        });
      });
  }
}

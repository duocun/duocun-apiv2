import { DB } from "../db";
import { Model } from "./model";

import { Entity } from "../entity";
import { Category } from "./category";
import { Merchant, IMerchant } from "./merchant";

import { ObjectID, Collection } from "mongodb";
import { Request, Response } from "express";
import { Account, IAccount } from "./account";
import { Code } from "../controllers/controller";
import _ from "lodash";

export enum ProductStatus {
  ACTIVE = "A",
  INACTIVE = "I",
  NEW = "N",
  PROMOTE = "P",
}

export interface ICategory {
  _id?: string;
  name: string;
  description: string;
  order: number;

  created?: string;
  modified?: string;
}

export interface IPicture {
  url: string;
}

export interface IProduct {
  _id?: string;
  name: string;
  nameEN: string;
  description?: string;
  price: number;
  cost: number;
  merchantId: string;
  categoryId: string;

  openDays?: number[];
  taxRate?: number;
  pictures: IPicture[];
  dow?: string[];
  order?: number;
  status?: ProductStatus;

  created?: string;
  modified?: string;
  stock?: {
    enabled: boolean;
    allowNegative: boolean;
    quantity: number;
    warningThreshold: number;
    outofstockMessage: string;
    outofstockMessageEN: string;
  };
  merchant?: IMerchant;
  category?: ICategory;
  merchantAccount?: IAccount; // join account table from find()
}

export class Product extends Model {
  categoryModel: Category;
  accountModel: Account;
  merchantModel: Merchant;
  constructor(dbo: DB) {
    super(dbo, "products");
    this.categoryModel = new Category(dbo);
    this.accountModel = new Account(dbo);
    this.merchantModel = new Merchant(dbo);
  }

  uploadPicture(req: Request, res: Response) {
    const fname = req.body.fname + "." + req.body.ext;
    if (fname) {
      res.send(JSON.stringify({ fname: fname, url: fname }, null, 3));
    } else {
      res.send(JSON.stringify(null, null, 3));
    }
  }

  // joined find
  async list(query: any, options?: any): Promise<any> {
    const cs = await this.categoryModel.find({});
    const ms = await this.merchantModel.find({});
    const r = await this.find_v2(query, options);
    const ps: IProduct[] = r.data;
    ps.forEach((p: IProduct) => {
      p.category = cs.find(
        (c: any) =>
          c._id && p.categoryId && c._id.toString() === p.categoryId.toString()
      );
      p.merchant = ms.find(
        (m: any) =>
          m._id && p.merchantId && m._id.toString() === p.merchantId.toString()
      );
    });
    return { count: r.count, data: ps };
  }

  categorize(req: Request, res: Response) {
    let query = {};
    let lang: any = req.headers.lang;
    if (
      req.headers &&
      req.headers.filter &&
      typeof req.headers.filter === "string"
    ) {
      query =
        req.headers && req.headers.filter
          ? JSON.parse(req.headers.filter)
          : null;
    }

    this.doCategorize(query, lang).then((cats) => {
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(cats, null, 3));
    });
  }

  async doCategorize(query: any, lang: string) {
    const r: any = await this.list(query);
    const ps = r.data;

    ps.forEach((p: IProduct) => {
      if (lang === "en") {
        p.name = p.nameEN;
      }
    });

    const cats = this.groupByCategory(ps, lang);
    return cats;
  }

  // --------------------------------------------------------------------------
  // return --- [ {categoryId: x, items: [{product: p, quantity: q} ...]} ... ]
  groupByCategory(products: IProduct[], lang: string) {
    const cats: any[] = [];

    products.map((p) => {
      if (p && p.categoryId) {
        const cat = cats.find(
          (c) => c.categoryId.toString() === p.categoryId.toString()
        );
        const category: any = p.category;
        if (cat) {
          cat.items.push({ product: p, quanlity: 0 });
        } else {
          if (category) {
            cats.push({
              categoryId: p.categoryId,
              categoryName: lang === "zh" ? category.name : category.nameEN,
              order: category.order,
              items: [{ product: p, quanlity: 0 }],
            });
          } else {
            // shouldn't happen
            cats.push({
              categoryId: p.categoryId,
              categoryName: lang === "zh" ? category.name : category.nameEN,
              order: 0,
              items: [{ product: p, quanlity: 0 }],
            });
          }
        }
      }
    });

    cats.map((c) => {
      c.items = c.items.sort((a: any, b: any) => {
        if (a.product.order < b.product.order) {
          return -1;
        } else {
          return 1;
        }
      });
    });

    return cats.sort((a, b) => {
      if (a.order < b.order) {
        return -1;
      } else {
        return 1;
      }
    });
  }

  // tools
  // clearImage(req: Request, res: Response) {
  //   let query = {};
  //   let lang: any = req.headers.lang;
  //   if (req.headers && req.headers.filter && typeof req.headers.filter === 'string') {
  //     query = (req.headers && req.headers.filter) ? JSON.parse(req.headers.filter) : null;
  //   }

  //   this.find({}).then((ps: IProduct[]) => {
  //     const datas: any[] = [];
  //     ps.map((p: IProduct) =>{
  //       const url = (p && p.pictures && p.pictures.length >0)? p.pictures[0].url : '';
  //       datas.push({
  //         query: { _id: p._id },
  //         data: { pictures:  [{url: url}]}
  //       });
  //     });

  //     this.bulkUpdate(datas).then(() => {
  //       res.setHeader('Content-Type', 'application/json');
  //       res.send(JSON.stringify('success', null, 3));
  //     });
  //   });
  // }
  async validate(doc: any, scope: "create" | "update") {
    const model: any = _.pick(doc, [
      "name",
      "nameEN",
      "description",
      "descriptionEN",
      "price",
      "cost",
      "rank",
      "taxRate",
      "dow",
      "pictures",
      "order",
      "rank",
      "categoryId",
      "merchantId",
      "stock",
      "attributes",
      "combinations",
      "status",
    ]);
    ["name", "price", "cost", "stock"].forEach((key) => {
      if (model[key] === undefined) {
        throw new Error(`${key} field is required`);
      }
    });
    model.rank = Number(model.rank);
    model.attributes = model.attributes || [];
    model.combinations = model.combinations || [];
    model.type = "G";
    if (
      ![
        ProductStatus.ACTIVE,
        ProductStatus.INACTIVE,
        ProductStatus.NEW,
        ProductStatus.PROMOTE,
      ].includes(model.status)
    ) {
      model.status = ProductStatus.INACTIVE;
    }
    if (scope === "create") {
      delete model._id;
    }
    if (model.categoryId) {
      model.categoryId = new ObjectID(model.categoryId);
    }
    if (model.merchantId) {
      model.merchantId = new ObjectID(model.merchantId);
    }
    return model;
  }
}

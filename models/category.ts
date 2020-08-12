import { DB } from "../db";
import { Model } from "./model";
import _ from "lodash";
import { ObjectId } from "mongodb";

export interface CategoryInterface {
  _id?: string;
  name: string;
  nameEN?: string;
  description: string;
  descriptionEN?: string;
  parentId?: string;
  order: number;
  type: string;
  status: string;
}

export class Category extends Model {
  constructor(dbo: DB) {
    super(dbo, "categories");
  }

  async validate(doc: any, scope: "create" | "update") {
    console.log("category validate");
    doc = _.pick(doc, [
      "_id",
      "name",
      "nameEN",
      "description",
      "descriptionEN",
      "order",
      "merchantId",
    ]);
    if (scope === "create") {
      delete doc._id;
    }
    if (!doc.name) {
      throw new Error("Name field is required");
    }
    const collection = await this.getCollection();
    const duplicatedQuery: any = {
      name: doc.name,
    };
    if (scope === "update") {
      duplicatedQuery._id = { $ne: new ObjectId(doc._id) };
    }
    const dupe = await collection.find(duplicatedQuery).count();
    if (dupe > 0) {
      throw new Error("Category with the same name already exists");
    }
    return doc;
  }
}

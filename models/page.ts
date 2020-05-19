import { ObjectId } from "mongodb";
import { Model } from "./model";
import { DB } from "../db";
export enum PageStatus {
  DRAFT="draft",
  PUBLISH="publish"
}

export interface NewPageInterface {
  title: string;
  titleEN?: string;
  slug: string;
  description?: string;
  descriptionEN?: string;
  keywords?: string;
  content: string;
  contentEN: string;
  status?: PageStatus;
}

export interface PageInterface extends NewPageInterface {
  _id: string|ObjectId;
  created: string|Date;
  modified: string|Date;
}

export class Page extends Model {
  constructor(db: DB) {
    super(db, "pages");
  }
  async validate(doc: any, scope: "create"|"update") {
    if (!doc) {
      throw new Error("document is empty");
    }
    ["title", "slug", "content"].forEach(key => {
      if (!doc[key]) {
        throw new Error(`${key} is empty`);
      }
    });
    if (scope === "create") {
      let duplicated = await this.findOne({ title: doc.title });
      if (duplicated) {
        throw new Error("title is duplicated");
      }
      duplicated = await this.findOne({ slug: doc.slug });
      if (duplicated) {
        throw new Error("slug is duplicated");
      }
    } else if (scope === "update") {
      let docId;
      try {
        docId = new ObjectId(doc._id);
      } catch (e) {
        throw new Error("invalid id");
      }
      let duplicated = await this.findOne({ _id: { $ne: docId }, title: doc.title });
      if (duplicated) {
        throw new Error("title is duplicated");
      }
      duplicated = await this.findOne({ _id: { $ne: docId }, slug: doc.slug });
      if (duplicated) {
        throw new Error("slug is duplicated");
      }
    }
  }
  
}
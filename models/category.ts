import { DB } from "../db";
import { Model } from "./model";

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
    super(dbo, 'categories');
  }
}
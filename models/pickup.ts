import { DB } from "../db";
import { Model } from "./model";

export const PickupStatus = {
  UNPICK_UP: 'U',
  PICKED_UP: 'P'
};

export interface IPickup {
  _id?: string;
  driverId: string;
  productId: string;
  productName: string;
  quantity: number;
  status: string;
  delivered: string;
}

export interface IPickupMap {
  [key: string]: IPickup;
}

export class Pickup extends Model {
  constructor(dbo: DB) {
    super(dbo, 'pickups');
  }
}
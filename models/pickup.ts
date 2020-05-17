import { DB } from "../db";
import { Model } from "./model";

export const PickupStatus = {
  UNPICK_UP: 'U',
  PICKED_UP: 'P'
};

export class Pickup extends Model {
  constructor(dbo: DB) {
    super(dbo, 'pickups');
  }
}
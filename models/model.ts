import { Request, Response } from "express";
import { ObjectId, Collection } from "mongodb";
import { DB } from "../db";

import { Entity } from "../entity";
import moment from "moment";

export const TimeMap = [
  { pickup: '11:20', deliver: '16:20' },
  { pickup: '10:00', deliver: '14:00' },
  { pickup: '14:00', deliver: '16:00' }
];

export const Status = {
  ACTIVE: 'A',
  INACTIVE: 'I'
}

export interface IUpdateItem{
  query: object;
  data: object;
}

export class Model extends Entity {
  constructor(dbo: DB, tableName: string) {
    super(dbo, tableName);
  }

  async getById(id: string, options: any={}) {
    if (id && ObjectId.isValid(id)) {
      const r = await this.findOne({ _id: id }, options);
      if (r) {
        return r;
      }
    }
    return null;
  }

  // this function will do upsert ?
  async updateOne(query: any, doc: any, options?: any): Promise<any> {
    if (Object.keys(doc).length === 0 && doc.constructor === Object) {
      return;
    } else {
      query = this.convertIdFields(query);
      doc = this.convertIdFields(doc);

      const c: Collection = await this.getCollection();
      const r: any = await c.updateOne(query, { $set: doc }, options);
      return r.result;
    }
  }

  async insertOne(doc: any): Promise<any> {
    const c: Collection = await this.getCollection();
    doc = this.convertIdFields(doc);
    if(!doc.created){
      doc.created = moment().toISOString();
    }
    doc.modified = moment().toISOString();
    const result = await c.insertOne(doc); // InsertOneWriteOpResult
    const ret = (result.ops && result.ops.length > 0) ? result.ops[0] : null;
    return ret;
  }

  async deleteOne(query: any, options?: object): Promise<any> {
    const c: Collection = await this.getCollection();
    const q = this.convertIdFields(query);
    return await c.deleteOne(q, options); // DeleteWriteOpResultObject {ok, n}
  }

  // return BulkWriteOpResultObject
  async bulkUpdate(items: IUpdateItem[], options?: any): Promise<any> {
    if(items && items.length > 0){
      const c: Collection = await this.getCollection();
      const clonedArray: any[] = [...items];
      const a: any[] = [];

      clonedArray.map(({query, data}) => {
        const q = this.convertIdFields(query);
        const doc = this.convertIdFields(data);
        a.push({ updateOne: { filter: q, update: { $set: doc }, upsert: true } });
      });

      return await c.bulkWrite(a, options);
    } else {
      return;
    }
  }

  async getFailedWechatPay(){
    const r = await this.find_v2({created:{$gte: '2020-05-08T00:00:00.000Z'}, type:{$in:['snappay req', 'snappay notify']}});
    const rMap: any = {};
    r.data.forEach(e => {
      const s = e.message.split(',')[0];
      const paymentId = s.split(':')[1];
      rMap[paymentId] = {paymentId, count: 0};
    });

    r.data.forEach(e => {
      const s = e.message.split(',')[0];
      const paymentId = s.split(':')[1];
      rMap[paymentId].count++;
    });

    return Object.keys(rMap).filter(k => rMap[k].count === 1);
  }

  // old


  // to be removed
  list(req: Request, res: Response) {
    const where: any = req.query.where;
    const options: any = req.query.options;
    this.find_v2(where, options).then((r: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: 'success',
        data: r.data,
        count: r.count 
      }));
    });
  }

  // to be removed
  get(req: Request, res: Response) {
    const id = req.params.id;
    this.getById(id).then(data => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: data ? 'success' : 'fail',
        data: data 
      }));
    });
  }



  // Wrong !
  // m --- local moment object for date, m.isUTC() must be false
  // t --- string, eg: '11:20'
  // return moment object 
  getLocalTime(m: moment.Moment, t: string) {
    const hour = +(t.split(':')[0]);
    const minute = +(t.split(':')[1]);
    return m.set({ hour: hour, minute: minute, second: 0, millisecond: 0 });
  }

  quickFind(req: Request, res: Response) {
    let query = {};
    let fields: any;
    if (req.headers) {
      if (req.headers.filter && typeof req.headers.filter === 'string') {
        query = (req.headers && req.headers.filter) ? JSON.parse(req.headers.filter) : null;
      }

      if (req.headers.fields && typeof req.headers.fields === 'string') {
        fields = JSON.parse(req.headers.fields);
      }
    }

    this.find(query, null).then((xs: any[]) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(xs, null, 3));
    });
  }


  // join2(req: Request, res: Response) {
  //   const from = req.body.fromCollection;
  //   const localField = req.body.localField;
  //   const foreignField = req.body.foreignField;
  //   const as = req.body.as;
  //   const query = req.body.query;
  //   this.join(from, localField, foreignField, as, query).then((rs: any) => {
  //     if (rs) {
  //       res.send(JSON.stringify(rs, null, 3));
  //     } else {
  //       res.send(JSON.stringify(null, null, 3))
  //     }
  //   });
  // }

  create(req: Request, res: Response) {
    if (req.body instanceof Array) {
      this.insertMany(req.body).then((x: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(x.ops, null, 3));
      });
    } else {
      this.insertOne(req.body).then((x: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(x, null, 3));
      });
    }
  }
  async create_v2(doc:any) {
    if (doc instanceof Array) {
      return await this.insertMany(doc);
    } else {
      return await this.insertOne(doc);
    }
  }

  replace(req: Request, res: Response) {
    this.replaceById(req.body.id, req.body).then((x: any) => {
      res.setHeader('Content-Type', 'application/json');
      // io.emit('updateOrders', x);
      res.send(JSON.stringify(x, null, 3));
    });
  }

  // deprecated for driver
  update(req: Request, res: Response) {
    if (req.body.data instanceof Array) {
      this.bulkUpdate(req.body.data, req.body.options).then(x => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(x, null, 3)); // x --- {status: 1, msg: ''}
      });
    } else {
      if (req.body && req.body.filter) {
        this.updateOne(req.body.filter, req.body.data, req.body.options).then((x: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.send(x ? JSON.stringify(x, null, 3) : ''); // {n: 1, nModified: 1, ok: 1}
        });
      } else {
        res.send();
      }
    }
  }

  remove(req: Request, res: Response) {
    let query: any = null;
    if (req.headers && req.headers.filter && typeof req.headers.filter === 'string') {
      query = (req.headers && req.headers.filter) ? JSON.parse(req.headers.filter) : null;
    }

    this.find(query ? query : { _id: "-1" }).then((rs: any) => {
      if (rs && rs.length > 0) {
        this.deleteMany(query ? query : { _id: "-1" }).then((x: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify(x, null, 3));
        });
      } else {
        res.send(null);
      }
    });
  }

  removeOne(req: Request, res: Response) {
    const id: string = req.params.id;
    if (id) {
      this.deleteById(id).then(x => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(x, null, 3));
      });
    } else {
      res.send(JSON.stringify('failed', null, 3));
    }
  }

  groupBy(items: any[], key: string) {
    let groups = items.reduce((result, item) => ({
      ...result,
      [item[key]]: [
        ...(result[item[key]] || []),
        item,
      ],
    }), {});

    Object.keys(groups).map(key => {
      key === 'undefined' ? delete groups[key] : '';
    });

    return groups;
  }

  upsertOne(req: Request, res: Response) {
    const query = req.body.query;
    const data = req.body.data;

    this.updateOne(query, data, { upsert: true }).then((result) => { // {n: 1, nModified: 0, ok: 1}
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(result, null, 3));
    });
  }

  // sUTC [string] --- eg. '2020-12-18T12:01:01.000Z'
  // t    [string] --- local time, eg. '11:20'
  getUtcTime(sUTC: string, t: string) {
    const m = moment(sUTC);
    const hour = +(t.split(':')[0]);
    const minute = +(t.split(':')[1]);
    return m.set({ hour: hour, minute: minute, second: 0, millisecond: 0 });
  }

  // deliver --- eg. 14:00
  // return eg. 14:00
  toPickupTime(deliver: string) {
    const tm: any = TimeMap.find(t => t.deliver === deliver);
    return tm.pickup;
  }

  // pickup --- eg. 14:00
  // return eg. 14:00
  toDeliverTime(pickup: string) {
    const tm: any = TimeMap.find(t => t.pickup === pickup);
    return tm.deliver;
  }

  // return eg. 2020-12-24
  toLocalTime(utc: string) {
    const m = moment.utc(utc);
    return m.local().format('YYYY-MM-DDTHH:mm:ss');
  }

  // return eg. 14:01:01
  getDeliverTime(delivered: string) {
    const x = this.toLocalTime(delivered);
    const s = x.split('T')[1].slice(0, 5);
    return s;
  }

  async validate(data: any, scope: string): Promise<any> {
    return data;
  }
}
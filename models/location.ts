import { DB } from "../db";
import { Model } from "./model";
import { IncomingMessage } from "http";
import https from 'https';
import { Request, Response } from "express";
import { Config } from "../config";
import { resolve } from "url";

// export interface GeoPoint  {
//   lat?: number;
//   lng?: number;
//   type?: string;
//   coordinates?: number[];
// }

// export interface IAddress {
//   formattedAddress?: string;
//   unit?: number;
//   streetName?: string;
//   streetNumber?: string;
//   location?: GeoPoint;
//   sublocality?: string;
//   city?: string;
//   province?: string;
//   country?: string;
//   postalCode?: string;
//   created?: Date;
//   modified?: Date;
//   id?: number;
// }


export interface IGooglePlace {
  id?: string;
  description?: string;
  place_id: string;
  reference: string;
  type?: string;
  structured_formatting: IStructuredAddress;
  terms?: IPlaceTerm[];
  types?: string[];
}

// use for front-end address list
export interface IAddress {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export interface ILocation {
  _id?: string;
  placeId: string;
  lat: number;
  lng: number;
  unit?: string;
  streetName: string;
  streetNumber: string;
  subLocality: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
}

export interface IPlaceTerm {
  offset: number;
  value: string;
}

export interface IStructuredAddress {
  main_text: string;
  secondary_text: string;
}

export interface IPlace {
  _id?: string;
  type?: string;
  description?: string;
  placeId?: string;
  structured_formatting: IStructuredAddress;
  terms?: IPlaceTerm[];
  location?: ILocation;
}

export class Location extends Model {
  cfg: Config;
  constructor(dbo: DB) {
    super(dbo, 'locations');
    this.cfg = new Config();
  }

  async updateOne(query: any, doc: any, options?: any): Promise<any> {
    if (Object.keys(doc).length === 0 && doc.constructor === Object) {
      return;
    } else {
      query = this.convertIdFields(query);
      doc = this.convertIdFields(doc);
      const c = await this.getCollection();
      const r = await c.updateOne(query, { $set: doc }, options); // {n: 1, nModified: 0, ok: 1} UpdateWriteOpResult
      return r;
    }
  }

  getSuggestPlaces(keyword: string): Promise<IGooglePlace[]> {
    let key = this.cfg.GOOGLE_PLACE_KEY;
    let url = encodeURI('https://maps.googleapis.com/maps/api/place/autocomplete/json?input=' + keyword + '&key=' + key
      + '&location=43.761539,-79.411079&radius=100'); // only for GTA

    return new Promise((resolve, reject) => {
      https.get(url, (res: IncomingMessage) => {
        let data = '';
        res.on('data', (d) => {
          data += d;
        });

        res.on('end', (rr: any) => {
          if (data) {
            const s = JSON.parse(data);
            if (s.predictions && s.predictions.length > 0) {
              resolve(s.predictions)
            } else {
              resolve([]);
            }
          } else {
            resolve([]);
          }
        });
      });
    });
  }

  googlePlacesToAddressList(ps: IGooglePlace[]) {
    const options: IAddress[] = [];
    if (!ps || ps.length === 0) {
      return options;
    } else {
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        const addr: IAddress = {
          placeId: p.place_id,
          mainText: p.structured_formatting.main_text,
          secondaryText: p.structured_formatting.secondary_text
        };
        options.push(addr);
      }
      return options;
    }
  }


  locationsToAddressList(items: any[]) {
    const options: IAddress[] = [];
    if (!items || items.length === 0) {
      return options;
    } else {
      for (let i = items.length - 1; i >= 0; i--) {
        const loc = items[i].location;
        const addr: IAddress = {
          placeId: loc.placeId,
          mainText: loc.streetNumber + ' ' + loc.streetName,
          secondaryText: (loc.subLocality ? loc.subLocality : loc.city) + ',' + loc.province
        };
        options.push(addr);
      }
      return options;
    }
  }

  geocodeToLocation(geocodeResult: any) { // : ILocation
    const addr = geocodeResult && geocodeResult.address_components;
    const oLocation = geocodeResult.geometry.location;
    if (addr && addr.length) {
      const loc: any = { // ILocation = {
        placeId: geocodeResult.place_id,
        streetNumber: '',
        streetName: '',
        subLocality: '',
        city: '',
        province: '',
        postalCode: '',
        lat: typeof oLocation.lat === 'function' ? oLocation.lat() : oLocation.lat,
        lng: typeof oLocation.lng === 'function' ? oLocation.lng() : oLocation.lng
      };

      addr.forEach((compo: any) => {
        if (compo.types.indexOf('street_number') !== -1) {
          loc.streetNumber = compo.short_name;
        }
        if (compo.types.indexOf('route') !== -1) {
          loc.streetName = compo.short_name;
        }
        if (compo.types.indexOf('postal_code') !== -1) {
          loc.postalCode = compo.short_name;
        }
        if (compo.types.indexOf('sublocality_level_1') !== -1 && compo.types.indexOf('sublocality') !== -1) {
          loc.subLocality = compo.short_name;
        }
        if (compo.types.indexOf('locality') !== -1) {
          loc.city = compo.short_name;
        }
        if (compo.types.indexOf('administrative_area_level_1') !== -1) {
          loc.province = compo.short_name;
        }
      });
      return loc;
    } else {
      return null;
    }
  }

  async getLocationByAddress(address: string) {
    const r = await this.getGoogleGeocodeByAddress(address);
    return this.geocodeToLocation(r);
  }

  async getLocationByPlaceId(placeId: string) {
    const r = await this.getGoogleGeocodeByPlaceId(placeId);
    return this.geocodeToLocation(r);
  }

  // deprecated
  async getLocation(accountId: string, placeId: string, address: string) {
    if (placeId) {
      const ds = await this.find({ placeId });
      if (ds && ds.length > 0) {
        const history = ds.find((d: any) => d.accountId.toString() === accountId);
        if (history) {
          return history.location;
        } else {
          const h = ds[0];
          if (accountId) {
            const r = await this.insertOne({ accountId, placeId: h.placeId, location: h.location });
            return h.location;
          } else {
            return h.location;
          }
        }
      } else {
        const r = await this.getGoogleGeocodeByAddress(address);
        const loc = this.geocodeToLocation(r);
        if (accountId) {
          await this.insertOne({ accountId, placeId: loc.placeId, location: loc });
          return loc;
        } else {
          return loc;
        }
      }
    } else { // should never go here
      const r = await this.getGoogleGeocodeByAddress(address);
      const loc = this.geocodeToLocation(r);
      if (accountId) {
        const r = await this.insertOne({ accountId, placeId: loc.placeId, location: loc });
        return loc;
      } else {
        return loc;
      }
    }
  }

  // return --- Google Geocode object
  getGoogleGeocodeByPlaceId(placeId: string): Promise<object> {
    const key = this.cfg.GEOCODE_KEY;
    const url = 'https://maps.googleapis.com/maps/api/geocode/json?sensor=false&key=' + key + '&place_id=' + placeId;

    return new Promise((resolve, reject) => {
      https.get(encodeURI(url), (res: IncomingMessage) => {
        let data = '';
        res.on('data', (d) => {
          data += d;
        });

        res.on('end', () => {
          if (data) {
            const s = JSON.parse(data);
            if (s.results && s.results.length > 0) {
              resolve(s.results[0]);
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        });
      });
    });
  }

  getGoogleGeocodeByAddress(addr: string): Promise<object> {
    const key = this.cfg.GEOCODE_KEY;
    const url = 'https://maps.googleapis.com/maps/api/geocode/json?sensor=false&key=' + key + '&address=' + addr;

    return new Promise((resolve, reject) => {
      https.get(encodeURI(url), (res: IncomingMessage) => {
        let data = '';
        res.on('data', (d) => {
          data += d;
        });

        res.on('end', () => {
          if (data) {
            const s = JSON.parse(data);
            if (s.results && s.results.length > 0) {
              resolve(s.results[0]);
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        });
      });
    });
  }



  toProvinceAbbr(input: string, to = 'abbr') {
    if (!input) { return '' }
    const provinces = [
      ['Alberta', 'AB'],
      ['British Columbia', 'BC'],
      ['Manitoba', 'MB'],
      ['New Brunswick', 'NB'],
      ['Newfoundland', 'NF'],
      ['Northwest Territory', 'NT'],
      ['Nova Scotia', 'NS'],
      ['Nunavut', 'NU'],
      ['Ontario', 'ON'],
      ['Prince Edward Island', 'PE'],
      ['Quebec', 'QC'],
      ['Saskatchewan', 'SK'],
      ['Yukon', 'YT'],
    ];

    const states = [
      ['Alabama', 'AL'],
      ['Alaska', 'AK'],
      ['American Samoa', 'AS'],
      ['Arizona', 'AZ'],
      ['Arkansas', 'AR'],
      ['Armed Forces Americas', 'AA'],
      ['Armed Forces Europe', 'AE'],
      ['Armed Forces Pacific', 'AP'],
      ['California', 'CA'],
      ['Colorado', 'CO'],
      ['Connecticut', 'CT'],
      ['Delaware', 'DE'],
      ['District Of Columbia', 'DC'],
      ['Florida', 'FL'],
      ['Georgia', 'GA'],
      ['Guam', 'GU'],
      ['Hawaii', 'HI'],
      ['Idaho', 'ID'],
      ['Illinois', 'IL'],
      ['Indiana', 'IN'],
      ['Iowa', 'IA'],
      ['Kansas', 'KS'],
      ['Kentucky', 'KY'],
      ['Louisiana', 'LA'],
      ['Maine', 'ME'],
      ['Marshall Islands', 'MH'],
      ['Maryland', 'MD'],
      ['Massachusetts', 'MA'],
      ['Michigan', 'MI'],
      ['Minnesota', 'MN'],
      ['Mississippi', 'MS'],
      ['Missouri', 'MO'],
      ['Montana', 'MT'],
      ['Nebraska', 'NE'],
      ['Nevada', 'NV'],
      ['New Hampshire', 'NH'],
      ['New Jersey', 'NJ'],
      ['New Mexico', 'NM'],
      ['New York', 'NY'],
      ['North Carolina', 'NC'],
      ['North Dakota', 'ND'],
      ['Northern Mariana Islands', 'NP'],
      ['Ohio', 'OH'],
      ['Oklahoma', 'OK'],
      ['Oregon', 'OR'],
      ['Pennsylvania', 'PA'],
      ['Puerto Rico', 'PR'],
      ['Rhode Island', 'RI'],
      ['South Carolina', 'SC'],
      ['South Dakota', 'SD'],
      ['Tennessee', 'TN'],
      ['Texas', 'TX'],
      ['US Virgin Islands', 'VI'],
      ['Utah', 'UT'],
      ['Vermont', 'VT'],
      ['Virginia', 'VA'],
      ['Washington', 'WA'],
      ['West Virginia', 'WV'],
      ['Wisconsin', 'WI'],
      ['Wyoming', 'WY'],
    ];
    const regions = states.concat(provinces);
    const camelcase = input.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
    const uppercase = input.toUpperCase();
    if (to === 'abbr') {
      for (let i = 0; i < regions.length; i++) {
        if (regions[i][0] === camelcase) {
          return (regions[i][1]);
        } else if (regions[i][1] === uppercase) {
          return regions[i][1];
        }
      }
    } else if (to === 'name') {
      for (let i = 0; i < regions.length; i++) {
        if (regions[i][1] === uppercase) {
          return (regions[i][0]);
        } else if (regions[i][0] === camelcase) {
          return regions[i][0];
        }
      }
    }
  }

  getAddrString(location: ILocation) {
    if (location) {
      const city = location.subLocality ? location.subLocality : location.city;
      const province = this.toProvinceAbbr(location.province);
      const streetName = this.toStreetAbbr(location.streetName);
      return location.streetNumber + ' ' + streetName + ', ' + city + ', ' + province;
    } else {
      return '';
    }
  }

  toStreetAbbr(streetName: string) {
    if (!streetName) { return '' }
    return streetName.replace(' Street', ' St').replace(' Avenue', ' Ave');
  }

  // tools
  // updateLocations(req: Request, res: Response) {
  //   this.find({}).then(locations => {
  //     const datas: any[] = [];
  //     locations.map((loc: any) => {
  //       datas.push({
  //         query: { _id: loc._id },
  //         data: { accountId: loc.userId }
  //       });
  //     });

  //     this.bulkUpdate(datas).then(() => {
  //       res.setHeader('Content-Type', 'application/json');
  //       res.send(JSON.stringify('success', null, 3));
  //     });
  //   });
  // }
}
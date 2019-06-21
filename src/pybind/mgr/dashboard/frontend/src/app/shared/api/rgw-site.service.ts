import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { cdEncode } from '../decorators/cd-encode';
import { ApiModule } from './api.module';

@cdEncode
@Injectable({
  providedIn: ApiModule
})
export class RgwSiteService {
  private url = 'api/rgw/site';

  constructor(private http: HttpClient) {}

  getZonegroups() {
    let params = new HttpParams();
    params = params.append('query', 'zonegroups');

    return this.http.get(this.url, { params: params });
  }
}

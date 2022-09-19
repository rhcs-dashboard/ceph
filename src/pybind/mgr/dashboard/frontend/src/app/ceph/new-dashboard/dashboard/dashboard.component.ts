import { Component, OnDestroy, OnInit } from '@angular/core';

import _ from 'lodash';
import moment from 'moment';
import { Observable, Subscription, timer } from 'rxjs';

import { ClusterService } from '~/app/shared/api/cluster.service';
import { ConfigurationService } from '~/app/shared/api/configuration.service';
import { MgrModuleService } from '~/app/shared/api/mgr-module.service';
import { OsdService } from '~/app/shared/api/osd.service';
import { PrometheusService } from '~/app/shared/api/prometheus.service';
import { DashboardDetails } from '~/app/shared/models/cd-details';
import { Permissions } from '~/app/shared/models/permissions';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import {
  FeatureTogglesMap$,
  FeatureTogglesService
} from '~/app/shared/services/feature-toggles.service';
import { SummaryService } from '~/app/shared/services/summary.service';
import { Promqls } from '~/app/shared/enum/dashboard-promqls.enum';

@Component({
  selector: 'cd-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  detailsCardData: DashboardDetails = {};
  osdSettings$: Observable<any>;
  permissions: Permissions;
  enabledFeature$: FeatureTogglesMap$;
  color: string;
  capacity$: Observable<any>;
  usedCapacity$: Observable<any>;
  iops$: Observable<any>;
  latency$: Observable<any>;
  clientThroughput$: Observable<any>;
  recoveryThroughput$: Observable<any>;
  timerGetPrometheusDataSub: Subscription;
  timerTime: number = 10000;
  readonly last5Minutes = this.timeToDate(moment().unix() - 5 * 60);

  constructor(
    private summaryService: SummaryService,
    private configService: ConfigurationService,
    private mgrModuleService: MgrModuleService,
    private clusterService: ClusterService,
    private osdService: OsdService,
    private authStorageService: AuthStorageService,
    private featureToggles: FeatureTogglesService,
    private prometheusService: PrometheusService
  ) {
    this.permissions = this.authStorageService.getPermissions();
    this.enabledFeature$ = this.featureToggles.get();
  }

  ngOnInit() {
    this.getDetailsCardData();
    this.getPrometheusData(this.last5Minutes);
    this.osdSettings$ = this.osdService.getOsdSettings();
    this.capacity$ = this.clusterService.getCapacity();
  }

  ngOnDestroy() {
      this.timerGetPrometheusDataSub.unsubscribe();
  }

  getDetailsCardData() {
    this.configService.get('fsid').subscribe((data) => {
      this.detailsCardData.fsid = data['value'][0]['value'];
    });
    this.mgrModuleService.getConfig('orchestrator').subscribe((data) => {
      const orchStr = data['orchestrator'];
      this.detailsCardData.orchestrator = orchStr.charAt(0).toUpperCase() + orchStr.slice(1);
    });
    this.summaryService.subscribe((summary) => {
      const version = summary.version.replace('ceph version ', '').split(' ');
      this.detailsCardData.cephVersion =
        version[0] + ' ' + version.slice(2, version.length).join(' ');
    });
  }

  getPrometheusData(selectedTime: any) {
    if (this.timerGetPrometheusDataSub) {
      this.timerGetPrometheusDataSub.unsubscribe();
    }
    
    this.timerGetPrometheusDataSub = timer(0, this.timerTime).subscribe(() => {
      this.prometheusService
        .getPrometheusData({
          params: Promqls.USEDCAPACITY,
          start: selectedTime['start'],
          end: selectedTime['end'],
          step: selectedTime['step']
        })
        .subscribe((data: any) => {
          if (data.result.length) {
            this.usedCapacity$ = data.result[0].values;
          }
        });

        this.prometheusService
        .getPrometheusData({
          params: Promqls.IOPS,
          start: selectedTime['start'],
          end: selectedTime['end'],
          step: selectedTime['step']
        })
        .subscribe((data: any) => {
          if (data.result.length) {
            this.iops$ = data.result[0].values;
          }
        });

        this.prometheusService
        .getPrometheusData({
          params: Promqls.LATENCY,
          start: selectedTime['start'],
          end: selectedTime['end'],
          step: selectedTime['step']
        })
        .subscribe((data: any) => {
          if (data.result.length) {
            this.latency$ = data.result[0].values;
          }
        });

        this.prometheusService
        .getPrometheusData({
          params: Promqls.CLIENTTHROUGHPUT,
          start: selectedTime['start'],
          end: selectedTime['end'],
          step: selectedTime['step']
        })
        .subscribe((data: any) => {
          if (data.result.length) {
            this.clientThroughput$ = data.result[0].values;
          }
        });

        this.prometheusService
        .getPrometheusData({
          params: Promqls.RECOVERYTHOROUGHPUT,
          start: selectedTime['start'],
          end: selectedTime['end'],
          step: selectedTime['step']
        })
        .subscribe((data: any) => {
          if (data.result.length) {
            this.recoveryThroughput$ = data.result[0].values;
          }
        });
    });
  }

  private timeToDate(unixTimeStamp: number): any {
    const date: Date = new Date(unixTimeStamp * 1000);
    const dateNow: Date = new Date();
    const formattedDate: any = {
      start: date.toISOString(),
      end: dateNow.toISOString(),
      step: (moment().unix() - unixTimeStamp) / 250
    };
    return formattedDate;
  }
}
